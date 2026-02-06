import fs from "fs";
import xlsx from "xlsx";
import { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";
import Campaign from "./campaign.model.js";
import User from "../auth/auth.model.js";
import sendEmail from "../../lib/sendEmail.js";


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

const generateUniqueStudentId = (existingIds) => {
  let newId;
  do {
    newId = generateStudentId();
  } while (existingIds.has(newId));
  return newId;
};


export const createCampaignService = async ({
  name,
  description,
  files
}) => {
  if (!name?.trim() || !description?.trim()) {
    throw new Error("Name and description are required");
  }

  const uploadedMedia = [];
  const students = [];
  const studentIdSet = new Set();
  const emailSet = new Set();

  /* =============================
     1️⃣ Upload Media
  ============================== */
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
          public_id: result.public_id
        });
      }
    }
  }

  /* =============================
     2️⃣ Process Student File
  ============================== */
  if (files?.studentFile?.length) {
    const filePath = files.studentFile[0].path;

    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const jsonData = xlsx.utils.sheet_to_json(sheet);

      for (const row of jsonData) {
        const email =
          row.email || row.Email || row.EMAIL;

        const nameValue =
          row.name || row.Name || row.NAME;

        if (!email || !nameValue) continue;

        const normalizedEmail = String(email).toLowerCase().trim();

        if (emailSet.has(normalizedEmail)) continue;
        emailSet.add(normalizedEmail);

        const others = { ...row };

        delete others.email;
        delete others.Email;
        delete others.EMAIL;
        delete others.name;
        delete others.Name;
        delete others.NAME;

        const studentId = generateUniqueStudentId(studentIdSet);
        studentIdSet.add(studentId);

        /* =============================
           🔥 Create User If Not Exists
        ============================== */
        let user = await User.findOne({ email: normalizedEmail });

        let plainPassword = null;

        if (!user) {
          plainPassword = generatePassword(8);

          user = await User.create({
            name: String(nameValue).trim(),
            email: normalizedEmail,
            password: plainPassword,
            role: "USER",
            isVerified: true
          });
        }

        students.push({
          studentId,
          name: String(nameValue).trim(),
          email: normalizedEmail,
          others
        });

        /* =============================
           📧 Send Email (Only if new user)
        ============================== */
        if (plainPassword) {
          const htmlTemplate = `
            <div style="font-family: Arial; padding:20px;">
              <h2>Welcome to the Fundraising Campaign 🎉</h2>
              <p>Hello <strong>${nameValue}</strong>,</p>
              <p>You have been added to a fundraising campaign.</p>

              <p><strong>Your Login Credentials:</strong></p>
              <ul>
                <li>Email: ${normalizedEmail}</li>
                <li>Password: ${plainPassword}</li>
                <li>Student ID: ${studentId}</li>
              </ul>

              <p>Please login and start sharing your fundraising link.</p>

              <p>Best Regards,<br/>Fundraising Team</p>
            </div>
          `;

          await sendEmail({
            to: normalizedEmail,
            subject: "Your Fundraising Account Details",
            html: htmlTemplate
          });
        }
      }
    } finally {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  /* =============================
     3️⃣ Create Campaign
  ============================== */
  const campaign = await Campaign.create({
    name: name.trim(),
    description: description.trim(),
    media: uploadedMedia,
    students
  });

  return campaign;
};

