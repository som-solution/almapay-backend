import { Request, Response, NextFunction } from 'express';

export const contactSupport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { subject, message, transactionId } = req.body;
        const userId = req.user!.userId;

        if (!message) {
            res.status(400).json({ status: 'error', message: 'Message is required' });
            return;
        }

        // In a real app, this would send an email to support@almapay.com
        // or create a ticket in Zendesk/Jira.
        console.log(`\n🆘 [SUPPORT TICKET] From User: ${userId}`);
        console.log(`   Subject: ${subject || 'Help Request'}`);
        if (transactionId) console.log(`   Ref Transaction: ${transactionId}`);
        console.log(`   Message: ${message}\n`);

        res.json({
            status: 'success',
            message: 'Support request received. We will contact you shortly.'
        });
    } catch (error) {
        next(error);
    }
};
