import mongoose from "mongoose";

const { Schema } = mongoose;

const studentSchema = new Schema(
  {
    studentId: {
      type: String,
      unique: true,
      sparse: true,
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
    },
    raisedAmount: {
      type: Number,
      default: 0
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
    students: [studentSchema],

    totalRaised: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

campaignSchema.index({ "students.studentId": 1 });

const Campaign = mongoose.model("Campaign", campaignSchema);

export default Campaign;
