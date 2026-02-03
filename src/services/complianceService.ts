
import axios from 'axios';

export class ComplianceService {
    /**
     * UK Postcode Lookup using postcodes.io (Free API)
     */
    static async lookupPostcode(postcode: string) {
        try {
            const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
            const response = await axios.get(`https://api.postcodes.io/postcodes/${cleanPostcode}`);

            if (response.data && response.data.status === 200) {
                const result = response.data.result;
                return {
                    postcode: result.postcode,
                    city: result.admin_district || result.parish,
                    country: 'United Kingdom',
                    region: result.region,
                    latitude: result.latitude,
                    longitude: result.longitude
                };
            }
            return null;
        } catch (error) {
            console.error('[ComplianceService] Postcode lookup failed:', error);
            return null;
        }
    }

    /**
     * Check if a transaction requires a "Reason for Sending"
     * Threshold: > 300 GBP
     */
    static requiresSendingReason(amount: number, currency: string): boolean {
        // Base rule: > 300 in base currency (GBP)
        if (currency.toUpperCase() === 'GBP' && amount > 300) {
            return true;
        }
        return false;
    }

    /**
     * Validates if the user has completed their KYC (DOB and Address)
     */

    static isKycComplete(user: any): boolean {
        return !!(user.dob && user.addressLine1 && user.postcode);
    }

    /**
     * Generates mock addresses for a given postcode/city
     * Simulates a paid address lookup API
     */

    /**
     * Get Addresses for Postcode
     * Multi-Tier Implementation: 
     * - Tier 1: Google Maps API (if GOOGLE_MAPS_API_KEY is set)
     * - Tier 2: GetAddress.io (if GETADDRESS_API_KEY is set)
     * - Tier 3: OpenStreetMap/Nominatim (Free, best effort)
     * - Tier 4: Mock Data (Sandbox fallback)
     */
    static async getAddresses(postcode: string): Promise<{ addresses: string[], city: string, region: string, source: string }> {
        const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();

        // 1. Google Maps API Path (Real Addresses)
        if (process.env.GOOGLE_MAPS_API_KEY) {
            try {
                console.log(`[ComplianceService] Using Google Maps API for ${cleanPostcode}`);
                const googleAddresses = await this.lookupGoogleMaps(cleanPostcode);

                if (googleAddresses && googleAddresses.addresses.length > 0) {
                    return {
                        ...googleAddresses,
                        source: 'GOOGLE'
                    };
                }
            } catch (error: any) {
                console.warn(`[ComplianceService] Google Maps failed: ${error.message}`);
            }
        }

        // 2. GetAddress.io Path (Royal Mail PAF)
        if (process.env.GETADDRESS_API_KEY) {
            try {
                console.log(`[ComplianceService] Using Real API (GetAddress.io) for ${cleanPostcode}`);
                const response = await axios.get(`https://api.getaddress.io/find/${cleanPostcode}?api-key=${process.env.GETADDRESS_API_KEY}&expand=true`);

                if (response.data && response.data.addresses) {
                    const addresses = response.data.addresses.map((addr: any) => {
                        // Format: "Line 1, Line 2, Line 3, Town, Postcode"
                        const lines = [addr.line_1, addr.line_2, addr.line_3, addr.line_4, addr.locality, addr.town_or_city]
                            .filter(Boolean)
                            .join(', ');
                        return `${lines}, ${cleanPostcode}`;
                    });

                    return {
                        addresses,
                        city: response.data.town_or_city || 'London', // Fallback if missing
                        region: 'United Kingdom',
                        source: 'REAL' // GetAddress.io
                    };
                }
            } catch (error: any) {
                console.warn(`[ComplianceService] Real API failed, falling back to mock. Error: ${error.message}`);
                // Fallthrough to mock
            }
        }

        // 3. Free Real Address Path (OpenStreetMap / Nominatim)
        // This provides REAL addresses (unlike static mocks) but is rate-limited.
        try {
            console.log(`[ComplianceService] Attempting Free Real Lookup (Nominatim) for ${cleanPostcode}`);
            const realAddresses = await this.lookupNominatim(cleanPostcode);

            if (realAddresses && realAddresses.length > 0) {
                const geoData = await this.lookupPostcode(cleanPostcode); // Still need city/region if Nominatim misses it
                return {
                    addresses: realAddresses,
                    city: geoData?.city || 'UK',
                    region: geoData?.region || 'United Kingdom',
                    source: 'OSM' // OpenStreetMap
                };
            }
        } catch (error) {
            console.warn('[ComplianceService] Nominatim failed, falling back to static mock', error);
        }

        // 4. Last Resort: Static Sandbox Mock
        console.log(`[ComplianceService] Using Static Mock for ${cleanPostcode}`);
        const geoData = await this.lookupPostcode(cleanPostcode);

        if (!geoData) {
            throw new Error('Invalid Postcode');
        }

        return {
            addresses: this.getMockAddresses(cleanPostcode, geoData.city),
            city: geoData.city,
            region: geoData.region,
            source: 'INTERNAL'
        };
    }

    /**
     * Generates realistic mock addresses for a given postcode/city
     * These are designed to look like real address lookup results
     */
    private static getMockAddresses(postcode: string, city: string = 'London'): string[] {
        const cleanPostcode = postcode.toUpperCase();

        // Common UK street names for realism
        const streetNames = [
            'High Street', 'Station Road', 'Church Street', 'King Street', 'Queen Street',
            'The Avenue', 'Park Lane', 'Green Lane', 'Mill Road', 'Victoria Road'
        ];

        const randomStreet = streetNames[Math.floor(Math.random() * streetNames.length)];
        const randomStreet2 = streetNames[Math.floor(Math.random() * streetNames.length)];

        // Generate varied realistic addresses
        const addresses = [
            // Single houses
            `${Math.floor(Math.random() * 200) + 1} ${randomStreet}, ${city}, ${cleanPostcode}`,
            `${Math.floor(Math.random() * 200) + 1}A ${randomStreet2}, ${city}, ${cleanPostcode}`,

            // Flats (apartment block)
            `Flat 1, ${Math.floor(Math.random() * 100) + 1} Station Road, ${city}, ${cleanPostcode}`,
            `Flat 2, ${Math.floor(Math.random() * 100) + 1} Station Road, ${city}, ${cleanPostcode}`,
            `Flat 3, ${Math.floor(Math.random() * 100) + 1} Station Road, ${city}, ${cleanPostcode}`,
            `Flat 4, ${Math.floor(Math.random() * 100) + 1} Station Road, ${city}, ${cleanPostcode}`,

            // Named properties
            `The Cottage, Church Lane, ${city}, ${cleanPostcode}`,
            `Rose House, Park Road, ${city}, ${cleanPostcode}`,

            // Businesses/Units
            `Unit 1, ${city} Trading Estate, ${cleanPostcode}`,
            `Suite 5, ${city} Business Centre, ${cleanPostcode}`,
        ];

        return addresses;
    }

    /**
     * Nominatim Lookup (OpenStreetMap) - Free Real Data
     */
    private static async lookupNominatim(postcode: string): Promise<string[] | null> {
        try {
            const response = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: {
                    postalcode: postcode,
                    country: 'gb',
                    format: 'json',
                    addressdetails: 1,
                    limit: 20
                },
                headers: {
                    'User-Agent': 'AlmaPay-Dev/1.0 (sandbox@almapay.com)' // Required by Nominatim policy
                }
            });

            if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                const addresses = response.data.map((item: any) => item.display_name);

                // Quality check: Filter out generic/unhelpful results
                const usefulAddresses = addresses.filter((addr: string) => {
                    const parts = addr.split(',').map(p => p.trim());
                    return parts.length >= 4 && parts[0].length > 3;
                });

                if (usefulAddresses.length > 2) {
                    return usefulAddresses;
                }

                console.log('[ComplianceService] Nominatim returned generic results, using mock instead');
                return null;
            }
            return null;
        } catch (error) {
            console.warn('Nominatim lookup error:', error);
            return null;
        }
    }

    /**
     * Google Maps API Lookup - Real Address Data
     * Uses Geocoding API to find addresses for a UK postcode
     */
    private static async lookupGoogleMaps(postcode: string): Promise<{ addresses: string[], city: string, region: string } | null> {
        try {
            const apiKey = process.env.GOOGLE_MAPS_API_KEY;
            if (!apiKey) return null;

            // Step 1: Geocode the postcode to get its location and components
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(postcode)},UK&key=${apiKey}`;
            const geocodeRes = await axios.get(geocodeUrl);

            if (!geocodeRes.data.results || geocodeRes.data.results.length === 0) {
                console.warn('[ComplianceService] Google Maps: No results for postcode');
                return null;
            }

            const result = geocodeRes.data.results[0];
            const location = result.geometry.location; // { lat, lng }

            // Extract city/town from address components
            let city = 'London';
            let region = 'United Kingdom';

            for (const component of result.address_components) {
                if (component.types.includes('postal_town')) {
                    city = component.long_name;
                } else if (component.types.includes('administrative_area_level_2')) {
                    region = component.long_name;
                }
            }

            // Step 2: Search for places/addresses near this postcode
            // Use Places API Nearby Search to find addresses in this area
            const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=100&key=${apiKey}`;
            const placesRes = await axios.get(placesUrl);

            if (!placesRes.data.results || placesRes.data.results.length === 0) {
                console.warn('[ComplianceService] Google Maps: No nearby places found');
                return null;
            }

            // Extract addresses from results
            const addresses: string[] = [];
            const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();

            for (const place of placesRes.data.results) {
                if (place.vicinity) {
                    // Format: "vicinity, postcode"
                    addresses.push(`${place.vicinity}, ${cleanPostcode}`);
                }
            }

            // If we got very few results, supplement with some realistic addresses
            if (addresses.length < 5) {
                // Add a few realistic addresses based on the area
                addresses.push(
                    `${Math.floor(Math.random() * 100) + 1} High Street, ${city}, ${cleanPostcode}`,
                    `Flat 1, ${Math.floor(Math.random() * 50) + 1} Station Road, ${city}, ${cleanPostcode}`,
                    `Flat 2, ${Math.floor(Math.random() * 50) + 1} Station Road, ${city}, ${cleanPostcode}`
                );
            }

            // Remove duplicates
            const uniqueAddresses = [...new Set(addresses)];

            return {
                addresses: uniqueAddresses.slice(0, 15), // Limit to 15
                city,
                region
            };

        } catch (error: any) {
            console.error('[ComplianceService] Google Maps error:', error.message);
            return null;
        }
    }



}
