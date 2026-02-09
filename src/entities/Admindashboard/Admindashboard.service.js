import mongoose from "mongoose";
import User from "../auth/auth.model.js";
import Campaign from "../campaign/campaign.model.js";
import Donation from "../donation/donation.model.js";

/**
 * Get all users with their campaign statistics
 * @param {Object} params - Query parameters
 * @param {Number} params.page - Page number
 * @param {Number} params.limit - Items per page
 * @param {String} params.search - Search by name or email
 * @param {String} params.role - Filter by role (USER/ADMIN)
 * @returns {Object} - Users with pagination and campaign stats
 */
export const getAllUsersWithCampaignsService = async ({
  page = 1,
  limit = 10,
  search = "",
  role = "",
}) => {
  page = Number(page) || 1;
  limit = Number(limit) || 10;
  const skip = (page - 1) * limit;

  // Build query filter
  const query = {};
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { studentId: { $regex: search, $options: "i" } },
    ];
  }
  
  if (role) {
    query.role = role;
  }

  // Get users with pagination
  const [users, total] = await Promise.all([
    User.find(query)
      .select("_id name email studentId role profileImage isVerified createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  // For each user, get campaign statistics
  const usersWithStats = await Promise.all(
    users.map(async (user) => {
      // Find all campaigns where this user is a student
      const campaigns = await Campaign.find({
        "students.studentId": user.studentId,
      })
        .select("_id name description raiseGoal totalRaised createdAt students")
        .lean();

      // Calculate total raised by this user across all campaigns
      let totalRaisedByUser = 0;
      const campaignDetails = campaigns.map((campaign) => {
        // Find this user's data in the campaign
        const studentData = campaign.students.find(
          (s) => s.studentId === user.studentId
        );

        totalRaisedByUser += studentData?.raisedAmount || 0;

        return {
          campaignId: campaign._id,
          campaignName: campaign.name,
          campaignDescription: campaign.description,
          campaignGoal: campaign.raiseGoal,
          campaignTotalRaised: campaign.totalRaised,
          userRaisedAmount: studentData?.raisedAmount || 0,
          userStudentId: studentData?.studentId || user.studentId,
          joinedAt: campaign.createdAt,
        };
      });

      return {
        ...user,
        campaignCount: campaigns.length,
        totalRaisedByUser,
        campaigns: campaignDetails,
      };
    })
  );

  return {
    users: usersWithStats,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get single user with detailed campaign information
 * @param {String} userId - User ID
 * @returns {Object} - User with detailed campaign stats
 */
export const getUserWithCampaignsService = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const user = await User.findById(userId)
    .select("-password -refreshToken -otp -otpExpires")
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  // Find all campaigns where this user is a student
  const campaigns = await Campaign.find({
    "students.studentId": user.studentId,
  })
    .populate("createdBy", "name email")
    .lean();

  // Get detailed campaign information
  let totalRaisedByUser = 0;
  const campaignDetails = await Promise.all(
    campaigns.map(async (campaign) => {
      // Find this user's data in the campaign
      const studentData = campaign.students.find(
        (s) => s.studentId === user.studentId
      );

      const userRaisedAmount = studentData?.raisedAmount || 0;
      totalRaisedByUser += userRaisedAmount;

      // Get donations made for this user in this campaign
      const donations = await Donation.find({
        campaignId: campaign._id,
        studentId: user.studentId,
        paymentStatus: "paid",
      })
        .select("donor amount createdAt paymentMethod")
        .sort({ createdAt: -1 })
        .lean();

      return {
        campaignId: campaign._id,
        campaignName: campaign.name,
        campaignDescription: campaign.description,
        campaignGoal: campaign.raiseGoal,
        campaignTotalRaised: campaign.totalRaised,
        campaignMedia: campaign.media,
        campaignCreatedBy: campaign.createdBy,
        userRaisedAmount,
        userStudentId: studentData?.studentId || user.studentId,
        userOtherInfo: studentData?.others || {},
        donationCount: donations.length,
        donations,
        donationLink: `${process.env.FRONTEND_URL}/donate/${campaign._id}/${user.studentId}`,
        joinedAt: campaign.createdAt,
      };
    })
  );

  return {
    user,
    statistics: {
      totalCampaigns: campaigns.length,
      totalRaisedByUser,
      averagePerCampaign:
        campaigns.length > 0 ? totalRaisedByUser / campaigns.length : 0,
    },
    campaigns: campaignDetails,
  };
};

/**
 * Get user statistics by studentId
 * @param {String} studentId - Student ID
 * @returns {Object} - User with campaign stats
 */
export const getUserByStudentIdService = async (studentId) => {
  if (!studentId) {
    throw new Error("Student ID is required");
  }

  const user = await User.findOne({ studentId })
    .select("-password -refreshToken -otp -otpExpires")
    .lean();

  if (!user) {
    throw new Error("User not found with this student ID");
  }

  // Use the existing service to get detailed info
  return getUserWithCampaignsService(user._id.toString());
};

/**
 * Get overall dashboard statistics
 * @returns {Object} - Dashboard overview stats
 */
export const getDashboardOverviewService = async () => {
  const [
    totalUsers,
    totalCampaigns,
    totalDonations,
    recentUsers,
    topFundraisers,
  ] = await Promise.all([
    // Total users count
    User.countDocuments({ role: "USER" }),

    // Total campaigns count
    Campaign.countDocuments(),

    // Total donations
    Donation.aggregate([
      { $match: { paymentStatus: "paid" } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),

    // Recent 5 users
    User.find({ role: "USER" })
      .select("name email studentId createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

    // Top 5 fundraisers
    Campaign.aggregate([
      { $unwind: "$students" },
      { $sort: { "students.raisedAmount": -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "students.studentId",
          foreignField: "studentId",
          as: "userInfo",
        },
      },
      {
        $project: {
          studentId: "$students.studentId",
          name: "$students.name",
          email: "$students.email",
          raisedAmount: "$students.raisedAmount",
          campaignName: "$name",
          userInfo: { $arrayElemAt: ["$userInfo", 0] },
        },
      },
    ]),
  ]);

  return {
    overview: {
      totalUsers,
      totalCampaigns,
      totalDonations: totalDonations[0]?.count || 0,
      totalDonationAmount: totalDonations[0]?.totalAmount || 0,
    },
    recentUsers,
    topFundraisers,
  };
};

/**
 * Update user campaign status or information
 * @param {String} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Object} - Updated user
 */
export const updateUserCampaignInfoService = async (userId, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const allowedUpdates = ["name", "email", "bio", "profileImage"];
  const updates = {};

  Object.keys(updateData).forEach((key) => {
    if (allowedUpdates.includes(key) && updateData[key]) {
      updates[key] = updateData[key];
    }
  });

  if (Object.keys(updates).length === 0) {
    throw new Error("No valid fields to update");
  }

  const user = await User.findByIdAndUpdate(userId, updates, { new: true })
    .select("-password -refreshToken -otp -otpExpires")
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

/**
 * Delete user (Admin only - use with caution)
 * @param {String} userId - User ID
 * @returns {Boolean} - Success status
 */
export const deleteUserService = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // Check if user is in any campaigns
  const campaignsCount = await Campaign.countDocuments({
    "students.studentId": user.studentId,
  });

  if (campaignsCount > 0) {
    throw new Error(
      `Cannot delete user. User is part of ${campaignsCount} campaign(s). Remove from campaigns first.`
    );
  }

  await User.findByIdAndDelete(userId);

  return true;
};