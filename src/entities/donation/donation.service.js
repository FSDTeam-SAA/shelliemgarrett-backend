import Stripe from "stripe";
import Campaign from "../campaign/campaign.model.js";
import Donation from "./donation.model.js";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createDonationSessionService = async ({
  campaignId,
  studentId,
  donor,
  amount
}) => {
  if (!campaignId || !studentId || !donor || !amount) {
    throw new Error("Missing required fields");
  }

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new Error("Campaign not found");

  const studentExists = campaign.students.find(
    (s) => s.studentId === studentId
  );

  if (!studentExists) throw new Error("Student not found");

  if (!amount || amount <= 0)
    throw new Error("Invalid donation amount");

  // Create donation record (pending)
  const donation = await Donation.create({
    campaignId,
    studentId,
    donor,
    amount
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Donation for ${campaign.name}`,
            description: `Supporting student ${studentId}`
          },
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1
      }
    ],
    success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    metadata: {
      donationId: donation._id.toString()
    }
  });

  donation.stripeSessionId = session.id;
  await donation.save();

  return { url: session.url };
};

export const getAllDonationsService = async ({ page = 1, limit = 10 }) => {
  page = Number(page) || 1;
  limit = Number(limit) || 10;
  const skip = (page - 1) * limit;

  const [donations, total] = await Promise.all([
    Donation.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "campaignId",
        select: "name description totalRaised raiseGoal createdBy",
        populate: { path: "createdBy", select: "name email role" },
      })
      .lean(),
    Donation.countDocuments(),
  ]);

  return {
    donations,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
