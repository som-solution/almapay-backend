
import { Router } from 'express';
import { ComplianceService } from '../services/complianceService';
import { authenticate } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/compliance/postcode-lookup?postcode=X
 */
router.get('/postcode-lookup', authenticate, async (req, res) => {
    const { postcode } = req.query;
    if (!postcode) {
        return res.status(400).json({ status: 'error', message: 'Postcode is required' });
    }

    try {
        const data = await ComplianceService.getAddresses(postcode as string);
        res.json({ status: 'success', data });
    } catch (error: any) {
        if (error.message === 'Invalid Postcode') {
            return res.status(404).json({ status: 'error', message: 'Invalid or unknown UK postcode' });
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * PATCH /api/v1/compliance/profile
 * Update KYC info (DOB, Address)
 */
router.patch('/profile', authenticate, async (req, res) => {
    const userId = req.user!.userId;
    const { dob, addressLine1, addressLine2, city, postcode } = req.body;

    try {
        const updateData: any = {};
        if (dob) updateData.dateOfBirth = new Date(dob);

        // Flatten address to single string for simple schema
        if (addressLine1 || postcode) {
            const parts = [addressLine1, addressLine2, city, postcode].filter(Boolean);
            updateData.address = parts.join(', ');
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        res.json({
            status: 'success', data: {
                id: user.id,
                dob: user.dateOfBirth, // Map back
                address: user.address, // simple string
                isKycComplete: !!(user.dateOfBirth && user.address) // Simple check
            }
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ status: 'error', message: 'User not found in database (Stale Token)' });
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
});

export default router;
