import express from "express";
import { adminMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";
import { multerUpload } from "../../core/middlewares/multer.js";
import { createCampaignController } from "./campaign.controller.js";


const router = express.Router();


router.post(
  "/create",
  verifyToken,
  adminMiddleware,
  multerUpload([
    { name: "media", maxCount: 10 },
    { name: "studentFile", maxCount: 1 }
  ]),
  createCampaignController
);

export default router;
