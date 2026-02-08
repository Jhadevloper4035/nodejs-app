const mongoose = require("mongoose");

const OtpSchema = new mongoose.Schema(
  {
    hash: { type: String },
    expiresAt: { type: Date },
    attempts: { type: Number, default: 0 },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, index: true, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },

    emailVerified: { type: Boolean, default: false },
    emailOtp: { type: OtpSchema, default: () => ({}) },

    resetOtp: { type: OtpSchema, default: () => ({}) },

    tokenVersion: { type: Number, default: 0 }, // used for "logout all devices"

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
