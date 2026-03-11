import express from "express";
import { verifyToken, adminMiddleware } from "../../core/middlewares/authMiddleware.js";
import { createDonationSessionController, getAllDonationsController } from "./donation.controller.js";


const router = express.Router();


router.post("/create-donation-session", createDonationSessionController);

router.get(
  "/",
  verifyToken,
  adminMiddleware,
  getAllDonationsController
);


export default router;
