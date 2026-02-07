import fs from "fs";
import xlsx from "xlsx";
import { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";
import Campaign from "./campaign.model.js";
import User from "../auth/auth.model.js";
import sendEmail from "../../lib/sendEmail.js";
import studentCampaignInviteTemplate from "../../lib/studentCampaignInviteTemplate.js";


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
  files,
}) => {
  if (!name?.trim() || !description?.trim()) {
    throw new Error("Name and description are required");
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
          // New student
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
    media: uploadedMedia,
    students,
  });

  for (const student of studentsForEmail) {
    const donationLink = `${process.env.FRONTEND_URL}/donate/${campaign._id}/${student.studentId}`;

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

  return campaign;
};




// const generatePassword = (length = 8) => {
//   const chars =
//     "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//   let password = "";
//   for (let i = 0; i < length; i++) {
//     password += chars.charAt(Math.floor(Math.random() * chars.length));
//   }
//   return password;
// };


// const generateStudentId = () => {
//   const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
//   let id = "";
//   for (let i = 0; i < 6; i++) {
//     id += chars.charAt(Math.floor(Math.random() * chars.length));
//   }
//   return id;
// };

// const generateUniqueStudentId = (existingIds) => {
//   let newId;
//   do {
//     newId = generateStudentId();
//   } while (existingIds.has(newId));
//   return newId;
// };


// export const createCampaignService = async ({ name, description, files }) => {
//   if (!name?.trim() || !description?.trim()) {
//     throw new Error("Name and description are required");
//   }

//   const uploadedMedia = [];
//   const students = [];
//   const studentIdSet = new Set();
//   const emailSet = new Set();

//   const studentsForEmail = [];

//   /* =============================
//      1️⃣ Upload Media
//   ============================== */
//   if (files?.media?.length) {
//     for (const file of files.media) {
//       const result = await cloudinaryUpload(
//         file.path,
//         `campaign_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
//         "campaigns"
//       );

//       if (result?.secure_url) {
//         uploadedMedia.push({
//           url: result.secure_url,
//           public_id: result.public_id
//         });
//       }
//     }
//   }

//   /* =============================
//      2️⃣ Process Student File
//   ============================== */
//   if (files?.studentFile?.length) {
//     const filePath = files.studentFile[0].path;

//     try {
//       const workbook = xlsx.readFile(filePath);
//       const sheetName = workbook.SheetNames[0];
//       const sheet = workbook.Sheets[sheetName];
//       const jsonData = xlsx.utils.sheet_to_json(sheet);

//       for (const row of jsonData) {
//         const email = row.email || row.Email || row.EMAIL;
//         const nameValue = row.name || row.Name || row.NAME;

//         if (!email || !nameValue) continue;

//         const normalizedEmail = String(email).toLowerCase().trim();

//         if (emailSet.has(normalizedEmail)) continue;
//         emailSet.add(normalizedEmail);

//         const others = { ...row };

//         delete others.email;
//         delete others.Email;
//         delete others.EMAIL;
//         delete others.name;
//         delete others.Name;
//         delete others.NAME;

//         /* =============================
//            🔥 Find or Create User
//         ============================== */
//         let user = await User.findOne({ email: normalizedEmail });
//         let plainPassword = null;
//         let studentId;

//         if (!user) {
//           plainPassword = generatePassword(8);
//           studentId = generateUniqueStudentId(studentIdSet);
//           studentIdSet.add(studentId);

//           user = await User.create({
//             name: String(nameValue).trim(),
//             email: normalizedEmail,
//             password: plainPassword,
//             role: "USER",
//             isVerified: true,
//             studentId // save permanently
//           });
//         } else {
//           // reuse existing studentId
//           studentId = user.studentId;

//           // old accounts might not have one yet (rare migration case)
//           if (!studentId) {
//             studentId = generateUniqueStudentId(studentIdSet);
//             studentIdSet.add(studentId);

//             user.studentId = studentId;
//             await user.save();
//           }
//         }

//         students.push({
//           studentId,
//           name: String(nameValue).trim(),
//           email: normalizedEmail,
//           others
//         });

//         studentsForEmail.push({
//           name: String(nameValue).trim(),
//           email: normalizedEmail,
//           password: plainPassword,
//           studentId
//         });
//       }
//     } finally {
//       if (fs.existsSync(filePath)) {
//         fs.unlinkSync(filePath);
//       }
//     }
//   }

//   /* =============================
//      3️⃣ Create Campaign
//   ============================== */
//   const campaign = await Campaign.create({
//     name: name.trim(),
//     description: description.trim(),
//     media: uploadedMedia,
//     students
//   });


//   for (const student of studentsForEmail) {
//     const donationLink = `${process.env.FRONTEND_URL}/donate/${campaign._id}/${student.studentId}`;

//     const htmlTemplate = studentCampaignInviteTemplate({
//       name: student.name,
//       email: student.email,
//       password: student.password,
//       studentId: student.studentId,
//       campaignName: campaign.name,
//       donationLink
//     });

//     await sendEmail({
//       to: student.email,
//       subject: `Your Fundraising Link for ${campaign.name}`,
//       html: htmlTemplate
//     });
//   }

//   return campaign;
// };




