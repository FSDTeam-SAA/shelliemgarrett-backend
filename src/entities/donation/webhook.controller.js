import Stripe from "stripe";
import Donation from "./donation.model.js";
import Campaign from "../campaign/campaign.model.js";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed.");
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const donationId = session.metadata.donationId;

      const donation = await Donation.findById(donationId);
      if (!donation) {
        console.error("Donation not found");
        return res.status(404).send("Donation not found");
      }

      // idempotency safety
      if (donation.paymentStatus === "paid") {
        return res.status(200).json({ received: true });
      }

      donation.paymentStatus = "paid";
      donation.stripePaymentIntentId = session.payment_intent;
      await donation.save();

      // Update campaign total 
      await Campaign.findByIdAndUpdate(
        donation.campaignId,
        { $inc: { totalRaised: donation.amount } }
      );

      // Update student ONLY if referral donation
      if (donation.studentId) {
        await Campaign.updateOne(
          {
            _id: donation.campaignId,
            "students.studentId": donation.studentId
          },
          {
            $inc: { "students.$.raisedAmount": donation.amount }
          }
        );
      }

      console.log("Donation processed successfully");
    }

    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object;
      const donationId = session.metadata.donationId;

      await Donation.findByIdAndUpdate(donationId, {
        paymentStatus: "failed"
      });

      console.log("❌ Donation marked as failed");
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};