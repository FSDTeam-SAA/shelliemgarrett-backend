import { generateResponse } from "../../lib/responseFormate.js";
import {
  getAllUsersWithCampaignsService,
  getUserByStudentIdService,
  getDashboardOverviewService,
  getAdminDashboardStatsService,
  updateUserCampaignInfoService,
  deleteUserService,
} from "./Admindashboard.service.js";

/**
 * GET /api/admin/users
 * Get all users with their campaign statistics
 */
export const getAllUsersWithCampaignsController = async (req, res, next) => {
  try {
    const { page, limit, search, role } = req.query;

    const data = await getAllUsersWithCampaignsService({
      page,
      limit,
      search,
      role,
    });

    return generateResponse(
      res,
      200,
      true,
      "Users fetched successfully",
      data
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/users/student/:studentId
 * Get user by student ID with campaign details
 */
export const getUserByStudentIdController = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const data = await getUserByStudentIdService(studentId);

    return generateResponse(
      res,
      200,
      true,
      "User details fetched successfully",
      data
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/dashboard/overview
 * Get dashboard overview statistics
 */
export const getDashboardOverviewController = async (req, res, next) => {
  try {
    const data = await getDashboardOverviewService();

    return generateResponse(
      res,
      200,
      true,
      "Dashboard overview fetched successfully",
      data
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/dashboard/stats
 * Get aggregated counts and top donors
 */
export const getAdminDashboardStatsController = async (req, res, next) => {
  try {
    const data = await getAdminDashboardStatsService();

    return generateResponse(
      res,
      200,
      true,
      "Admin dashboard stats fetched successfully",
      data
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/users/:id
 * Update user information
 */
export const updateUserController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const data = await updateUserCampaignInfoService(id, updateData);

    return generateResponse(
      res,
      200,
      true,
      "User updated successfully",
      data
    );
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/users/:id
 * Delete user (only if not in any campaigns)
 */
export const deleteUserController = async (req, res, next) => {
  try {
    const { id } = req.params;

    await deleteUserService(id);

    return generateResponse(
      res,
      200,
      true,
      "User deleted successfully",
      null
    );
  } catch (error) {
    next(error);
  }
};
