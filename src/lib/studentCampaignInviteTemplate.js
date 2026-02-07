const studentCampaignInviteTemplate = ({
  name,
  email,
  password,
  studentId,
  campaignName,
  donationLink,
}) => {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#f9fafb; padding:20px;">
    <div style="max-width:600px; margin:auto; background:white; padding:20px; border-radius:8px;">
      
      <h2 style="color:#111827; margin-bottom:10px;">
        Welcome to ${campaignName} 🎉
      </h2>

      <p>Hello <strong>${name}</strong>,</p>

      <p>
        You have been added to a fundraising campaign.
        Below is your personal fundraising link.
      </p>

      ${
        password
          ? `
      <hr style="margin:20px 0;" />
      <h3 style="margin-bottom:10px;">🔐 Your Login Credentials</h3>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Password:</strong> ${password}</p>
      `
          : `
      <hr style="margin:20px 0;" />
      <p style="color:#16a34a;">
        You can use your existing account credentials to log in.
      </p>
      `
      }

      <p><strong>Student ID:</strong> ${studentId}</p>

      <hr style="margin:20px 0;" />

      <h3 style="margin-bottom:10px;">💖 Your Fundraising Link</h3>

      <p>
        <a 
          href="${donationLink}" 
          style="
            display:inline-block;
            padding:10px 15px;
            background:#2563eb;
            color:white;
            text-decoration:none;
            border-radius:6px;
            font-weight:bold;
          "
        >
          Open Donation Page
        </a>
      </p>

      <p style="word-break:break-all; font-size:12px; color:gray;">
        ${donationLink}
      </p>

      <hr style="margin:20px 0;" />

      <p>Start sharing and make an impact 🚀</p>

      <p>
        Best Regards,<br/>
        Fundraising Team
      </p>
    </div>
  </div>
  `;
};

export default studentCampaignInviteTemplate;
