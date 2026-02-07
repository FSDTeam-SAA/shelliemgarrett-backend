import express from "express";
import { createDonationSessionController } from "./donation.controller.js";


const router = express.Router();


router.post("/create-donation-session", createDonationSessionController);


export default router;