import express from 'express';
import authRoutes from '../../entities/auth/auth.routes.js';
import userRoutes from '../../entities/user/user.routes.js';
import campaignRoutes from '../../entities/campaign/campaign.routes.js';
import donationRoutes from '../../entities/donation/donation.routes.js';


const router = express.Router();


router.use('/v1/auth', authRoutes);
router.use('/v1/user', userRoutes);
router.use('/v1/campaign', campaignRoutes);
router.use('/v1/donation', donationRoutes);


export default router;
