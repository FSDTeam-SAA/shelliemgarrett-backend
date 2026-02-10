import express from "express";
import { adminMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";
import { multerUpload } from "../../core/middlewares/multer.js";
import {
  createCampaignController,
  getAllCampaignsController,
  getCampaignByIdController,
  updateCampaignController,
  deleteCampaignController,
} from "./campaign.controller.js";


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

router.get("/", getAllCampaignsController);
router.get("/:id", getCampaignByIdController);
router.put(
  "/:id",
  verifyToken,
  adminMiddleware,
  multerUpload([
    { name: "media", maxCount: 10 },
    { name: "studentFile", maxCount: 1 }
  ]),
  updateCampaignController
);
router.delete(
  "/:id",
  verifyToken,
  adminMiddleware,
  deleteCampaignController
);



export default router;
