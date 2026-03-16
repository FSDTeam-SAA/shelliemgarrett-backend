import fs from "fs";
import xlsx from "xlsx";
import { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";
import Campaign from "./campaign.model.js";
import User from "../auth/auth.model.js";
import Donation from "../donation/donation.model.js";
import sendEmail from "../../lib/sendEmail.js";
import studentCampaignInviteTemplate from "../../lib/studentCampaignInviteTemplate.js";
import mongoose from "mongoose";
import { createPaginationInfo } from "../../lib/pagination.js";


const generatePassword = (length = 8) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};


const generateStudentId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};


const generateUniqueStudentIdFromDB = async () => {
  let newId;
  let exists = true;

  while (exists) {
    newId = generateStudentId();
    const existingUser = await User.findOne({ studentId: newId }).select("_id");
    if (!existingUser) {
      exists = false;
    }
  }

  return newId;
};


export const createCampaignService = async ({
  name,
  description,
  raiseGoal,
  createdBy,
  files,
}) => {
  if (!name?.trim() || !description?.trim() || !createdBy) {
    throw new Error("Name, description, and creator are required");
  }

  const uploadedMedia = [];
  const students = [];
  const studentsForEmail = [];
  const emailSet = new Set();

  if (files?.media?.length) {
    for (const file of files.media) {
      const result = await cloudinaryUpload(
        file.path,
        `campaign_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 8)}`,
        "campaigns"
      );

      if (result?.secure_url) {
        uploadedMedia.push({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    }
  }

  if (files?.studentFile?.length) {
    const filePath = files.studentFile[0].path;

    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(sheet);

      for (const row of jsonData) {
        const email = row.email || row.Email || row.EMAIL;
        const nameValue = row.name || row.Name || row.NAME;

        if (!email || !nameValue) continue;

        const normalizedEmail = String(email).toLowerCase().trim();

        // Prevent duplicate emails inside same Excel
        if (emailSet.has(normalizedEmail)) continue;
        emailSet.add(normalizedEmail);

        const others = { ...row };

        delete others.email;
        delete others.Email;
        delete others.EMAIL;
        delete others.name;
        delete others.Name;
        delete others.NAME;

        let user = await User.findOne({ email: normalizedEmail });
        let plainPassword = null;
        let studentId;

      if (!user) {
  // New student - create with studentId
  plainPassword = generatePassword(8);
  studentId = await generateUniqueStudentIdFromDB();

  user = await User.create({
    name: String(nameValue).trim(),
    email: normalizedEmail,
    password: plainPassword,
    role: "USER",
    isVerified: true,
    studentId,
  });
} else {
  // ✅ FIX: Get studentId from existing user first
  studentId = user.studentId;
  
  // Rare case: old account without studentId
  if (!studentId) {
    studentId = await generateUniqueStudentIdFromDB();
    user.studentId = studentId;
    await user.save();
  }
}

        students.push({
          studentId,
          name: String(nameValue).trim(),
          email: normalizedEmail,
          others,
        });

        studentsForEmail.push({
          name: String(nameValue).trim(),
          email: normalizedEmail,
          password: plainPassword,
          studentId,
        });
      }
    } finally {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  const campaign = await Campaign.create({
    name: name.trim(),
    description: description.trim(),
    raiseGoal,
    media: uploadedMedia,
    students,
    createdBy,
  });

  for (const student of studentsForEmail) {
    const donationLink = `${process.env.FRONTEND_URL}/donor-information?campaignId=${campaign._id}&studentId=${student.studentId}`;

    const htmlTemplate = studentCampaignInviteTemplate({
      name: student.name,
      email: student.email,
      password: student.password,
      studentId: student.studentId,
      campaignName: campaign.name,
      donationLink,
    });

    await sendEmail({
      to: student.email,
      subject: `Your Fundraising Link for ${campaign.name}`,
      html: htmlTemplate,
    });
  }

  // Return campaign with creator details populated for immediate client use
  const populatedCampaign = await Campaign.findById(campaign._id)
    .populate("createdBy", "name email role studentId")
    .lean();

  return populatedCampaign;
};


export const getAllCampaignsService = async ({
  page = 1,
  limit = 10,
}) => {
  page = Number(page) || 1;
  limit = Number(limit) || 10;

  const skip = (page - 1) * limit;

  const [campaigns, total] = await Promise.all([
    Campaign.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email role studentId")
      .lean(),
    Campaign.countDocuments(),
  ]);

  return {
    campaigns,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};


export const getCampaignByIdService = async (campaignId) => {
  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    throw new Error("Invalid campaign ID");
  }

  const campaign = await Campaign.findById(campaignId)
    .populate("createdBy", "name email role studentId")
    .lean();

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const objectId = new mongoose.Types.ObjectId(campaignId);

  const [donations, donorAggregates] = await Promise.all([
    Donation.find({
      campaignId,
      paymentStatus: "paid",
    })
      .select("donor amount studentId createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    Donation.aggregate([
      {
        $match: {
          campaignId: objectId,
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: "$donor.email",
          name: { $first: "$donor.name" },
          email: { $first: "$donor.email" },
          mobile: { $first: "$donor.mobile" },
          city: { $first: "$donor.city" },
          country: { $first: "$donor.country" },
          totalAmount: { $sum: "$amount" },
          donationsCount: { $sum: 1 },
          lastDonatedAt: { $max: "$createdAt" },
        },
      },
      {
        $sort: {
          totalAmount: -1,
          lastDonatedAt: -1,
        },
      },
    ]),
  ]);

  const topDonors = donorAggregates.slice(0, 3);
  const studentDonations = donations.filter((d) => d.studentId !== null);
  const guestDonations = donations.filter((d) => d.studentId === null);

  return {
    ...campaign,
    studentDonations,
    guestDonations,
    donorStats: {
      totalDonors: donorAggregates.length,
      topDonors,
    },
  };
};


export const updateCampaignService = async ({
  campaignId,
  name,
  description,
  raiseGoal,
  files,
}) => {
  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    throw new Error("Invalid campaign ID");
  }

  // Fetch existing campaign first to check existing students
  const existingCampaign = await Campaign.findById(campaignId).lean();
  if (!existingCampaign) {
    throw new Error("Campaign not found");
  }

  const updatePayload = {};

  if (name?.trim()) updatePayload.name = name.trim();
  if (description?.trim()) updatePayload.description = description.trim();
  if (raiseGoal !== undefined) {
    const parsedGoal = raiseGoal?.toString?.().trim?.();
    updatePayload.raiseGoal = parsedGoal ?? "";
  }

  const uploadedMedia = [];
  const newStudents = [];        
  const studentsForEmail = [];   
  const emailSet = new Set();

  // Build a set of emails already in this campaign
  const existingCampaignEmailSet = new Set(
    existingCampaign.students.map((s) => s.email.toLowerCase().trim())
  );

  if (files?.media?.length) {
    for (const file of files.media) {
      const result = await cloudinaryUpload(
        file.path,
        `campaign_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        "campaigns"
      );

      if (result?.secure_url) {
        uploadedMedia.push({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    }
  }

  if (files?.studentFile?.length) {
    const filePath = files.studentFile[0].path;

    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(sheet);

      for (const row of jsonData) {
        const email = row.email || row.Email || row.EMAIL;
        const nameValue = row.name || row.Name || row.NAME;
        if (!email || !nameValue) continue;

        const normalizedEmail = String(email).toLowerCase().trim();

        // Skip duplicates within the uploaded Excel file itself
        if (emailSet.has(normalizedEmail)) continue;
        emailSet.add(normalizedEmail);

        // Skip students already in this campaign — they stay untouched
        if (existingCampaignEmailSet.has(normalizedEmail)) continue;

        const others = { ...row };
        delete others.email;  delete others.Email;  delete others.EMAIL;
        delete others.name;   delete others.Name;   delete others.NAME;

        let user = await User.findOne({ email: normalizedEmail });
        let plainPassword = null;
        let studentId;

        if (!user) {
          // Brand new user — create account + send credentials + donation link
          plainPassword = generatePassword(8);
          studentId = await generateUniqueStudentIdFromDB();

          user = await User.create({
            name: String(nameValue).trim(),
            email: normalizedEmail,
            password: plainPassword,
            role: "USER",
            isVerified: true,
            studentId,
          });
        } else {
          // Existing user, new to THIS campaign — send donation link only (no password)
          studentId = user.studentId;

          if (!studentId) {
            studentId = await generateUniqueStudentIdFromDB();
            user.studentId = studentId;
            await user.save();
          }
        }

        newStudents.push({
          studentId,
          name: String(nameValue).trim(),
          email: normalizedEmail,
          others,
        });

        studentsForEmail.push({
          name: String(nameValue).trim(),
          email: normalizedEmail,
          password: plainPassword, 
          studentId,
        });
      }
    } finally {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  // Build update operations
  const updateOps = {};

  if (Object.keys(updatePayload).length) {
    updateOps.$set = updatePayload;
  }

  if (uploadedMedia.length) {
    updateOps.$push = updateOps.$push || {};
    updateOps.$push.media = { $each: uploadedMedia };
  }

  if (newStudents.length) {
    updateOps.$push = updateOps.$push || {};
    updateOps.$push.students = { $each: newStudents };
  }

  if (!Object.keys(updateOps).length) {
    throw new Error("No valid fields to update");
  }

  const campaign = await Campaign.findByIdAndUpdate(
    campaignId,
    updateOps,
    { new: true }
  )
    .populate("createdBy", "name email role studentId")
    .lean();

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  // Send emails only to newly added students
  if (studentsForEmail.length) {
    for (const student of studentsForEmail) {
      const donationLink = `${process.env.FRONTEND_URL}/donor-information?campaignId=${campaign._id}&studentId=${student.studentId}`;

      const htmlTemplate = studentCampaignInviteTemplate({
        name: student.name,
        email: student.email,
        password: student.password,   
        studentId: student.studentId,
        campaignName: campaign.name,
        donationLink,
      });

      await sendEmail({
        to: student.email,
        subject: `Your Fundraising Link for ${campaign.name}`,
        html: htmlTemplate,
      });
    }
  }

  return campaign;
};


export const deleteCampaignService = async (campaignId) => {
  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    throw new Error("Invalid campaign ID");
  }

  const deleted = await Campaign.findByIdAndDelete(campaignId);

  if (!deleted) {
    throw new Error("Campaign not found");
  }

  return true;
};


export const getMyDonationsService = async ({ email, page, limit }) => {

  const skip = (page - 1) * limit;

  // Find campaigns where user is a student
  const campaigns = await Campaign.find(
    { "students.email": email },
    { students: 1 }
  ).lean();

  if (!campaigns.length) {
    return {
      pagination: createPaginationInfo(page, limit, 0),
      campaigns: []
    };
  }

  const campaignIds = campaigns.map(c => c._id);

  // extract studentIds
  const studentIds = [];

  campaigns.forEach(campaign => {
    campaign.students.forEach(student => {
      if (student.email === email && student.studentId) {
        studentIds.push(student.studentId);
      }
    });
  });

  const stats = await Donation.aggregate([
    {
      $match: {
        campaignId: { $in: campaignIds },
        studentId: { $in: studentIds },
        paymentStatus: "paid"
      }
    },

    // group donations by campaign
    {
      $group: {
        _id: "$campaignId",
        totalRaised: { $sum: "$amount" },
        donors: { $addToSet: "$donor.email" }
      }
    },

    // join campaign collection
    {
      $lookup: {
        from: "campaigns",
        localField: "_id",
        foreignField: "_id",
        as: "campaign"
      }
    },

    { $unwind: "$campaign" },

    {
      $project: {
        campaignId: "$_id",
        campaignTitle: "$campaign.name",
        totalRaised: 1,
        totalDonors: { $size: "$donors" }
      }
    },

    { $skip: skip },
    { $limit: limit }
  ]);

  const pagination = createPaginationInfo(page, limit, stats.length);

  return {
    pagination,
    campaigns: stats
  };
};


