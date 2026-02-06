import mongoose from "mongoose";

const donationSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true
    },

    studentId: {
      type: String,
      required: true
    },

    donor: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      mobile: { type: String },
      country: { type: String },
      city: { type: String }
    },

    amount: {
      type: Number,
      required: true
    },

    stripeSessionId: {
      type: String
    },

    stripePaymentIntentId: {
      type: String
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending"
    }
  },
  { timestamps: true }
);

const Donation = mongoose.model("Donation", donationSchema);

export default Donation;
