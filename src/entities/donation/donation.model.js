import mongoose from "mongoose";

const { Schema } = mongoose;

const donationSchema = new Schema(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true
    },

    studentId: {
      type: String,
      required: true,
      index: true
    },

    donor: {
      name: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true,
        lowercase: true
      },
      mobile: String,
      country: String,
      city: String
    },

    amount: {
      type: Number,
      required: true,
      min: 1
    },

    stripeSessionId: {
      type: String,
      index: true
    },

    stripePaymentIntentId: String,

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true
    }
  },
  { timestamps: true }
);

donationSchema.index({ campaignId: 1, studentId: 1 });

const Donation = mongoose.model("Donation", donationSchema);

export default Donation;
