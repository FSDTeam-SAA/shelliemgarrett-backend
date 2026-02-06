import mongoose from "mongoose";

const { Schema } = mongoose;

const studentSchema = new Schema(
  {
    studentId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    others: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  { _id: false }
);

const campaignSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    media: [
      {
        url: String,
        public_id: String
      }
    ],
    students: [studentSchema]
  },
  {
    timestamps: true
  }
);

const Campaign = mongoose.model("Campaign", campaignSchema);

export default Campaign;
