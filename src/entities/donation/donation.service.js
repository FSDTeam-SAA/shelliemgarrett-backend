import Stripe from "stripe";
import Campaign from "../campaign/campaign.model";
import Donation from "./donation.model";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createDonationSessionService = async ({
  campaignId,
  studentId,
  donor,
  amount
}) => {
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
            name: `Donation for ${campaign.name}`
          },
          unit_amount: amount * 100
        },
        quantity: 1
      }
    ],
    success_url: `${process.env.FRONTEND_URL}/success`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    metadata: {
      donationId: donation._id.toString(),
      campaignId,
      studentId
    }
  });

  donation.stripeSessionId = session.id;
  await donation.save();

  return { url: session.url };
};
