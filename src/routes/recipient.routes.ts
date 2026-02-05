import { Router } from 'express';
import { createRecipient, getRecipients, deleteRecipient } from '../controllers/recipient.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createRecipient);
router.get('/', getRecipients);
router.delete('/:id', deleteRecipient);

export default router;
