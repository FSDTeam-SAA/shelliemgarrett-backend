import express from "express";
import {
  adminMiddleware,
  verifyToken,
} from "../../core/middlewares/authMiddleware.js";
import {
  getAllUsersWithCampaignsController,
  getUserByStudentIdController,
  getDashboardOverviewController,
  getAdminDashboardStatsController,
  updateUserController,
  deleteUserController,
} from "./Admindashboard.controller.js";

const router = express.Router();


router.get(
  "/overview",
  verifyToken,
  adminMiddleware,
  getDashboardOverviewController
);

router.get(
  "/stats",
  verifyToken,
  adminMiddleware,
  getAdminDashboardStatsController
);


router.get(
  "/studentlist",
  verifyToken,
  adminMiddleware,
  getAllUsersWithCampaignsController
);


router.get(
  "/studentlist/:studentId",
  verifyToken,
  adminMiddleware,
  getUserByStudentIdController
);


router.put(
  "/studentlist/:id",
  verifyToken,
  adminMiddleware,
  updateUserController
);


router.delete(
  "/student/:id",
  verifyToken,
  adminMiddleware,
  deleteUserController
);

export default router;
