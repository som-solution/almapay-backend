
import axios from 'axios';

export class RateService {
    private static cache: { [key: string]: { rate: number; expiry: number } } = {};
    private static CACHE_DURATION = 3600000; // 1 hour

    static async getRate(base: string, target: string): Promise<number> {
        const pair = `${base}_${target}`.toUpperCase();
        const now = Date.now();

        if (this.cache[pair] && this.cache[pair].expiry > now) {
            console.log(`[RateService] Using cached rate for ${pair}: ${this.cache[pair].rate}`);
            return this.cache[pair].rate;
        }

        try {
            console.log(`[RateService] Fetching live rate for ${pair}...`);
            const response = await axios.get(`https://api.budjet.org/fiat/${base.toLowerCase()}/${target.toLowerCase()}`);

            if (response.data && response.data.conversion_rate) {
                const rate = Number(response.data.conversion_rate);
                this.cache[pair] = {
                    rate,
                    expiry: now + this.CACHE_DURATION
                };
                return rate;
            }

            throw new Error('Invalid API response');
        } catch (error: any) {
            console.error(`[RateService] Error fetching rate for ${pair}:`, error.message);
            console.warn(`[RateService] Using fallback rate for ${pair} (API unavailable)`);

            // Robust fallback rates (updated as of Feb 2026)
            // These are approximate rates - in production, you should update these periodically
            const fallbackRates: { [key: string]: number } = {
                'GBP_KES': 176.29,  // GBP to Kenyan Shilling
                'GBP_UGX': 4867.80, // GBP to Ugandan Shilling  
                'GBP_TZS': 3486.14, // GBP to Tanzanian Shilling
            };

            const fallbackRate = fallbackRates[pair];

            if (fallbackRate) {
                // Cache the fallback rate too (but with shorter expiry)
                this.cache[pair] = {
                    rate: fallbackRate,
                    expiry: now + (this.CACHE_DURATION / 6) // 10 minutes for fallback
                };
                return fallbackRate;
            }

            // Last resort: return 1.0 (should rarely happen)
            console.error(`[RateService] No fallback rate available for ${pair}`);
            return 1.0;
        }

    }
}
