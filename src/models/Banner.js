import mongoose from "mongoose";

const { Schema } = mongoose;

export const ResponsiveImageSchema = new Schema(
  {
    desktop: {
      url: { type: String, trim: true },
      alt: { type: String, trim: true, default: "" },
      width: { type: Number },
      height: { type: Number },
    },
    tablet: {
      url: { type: String, trim: true },
      alt: { type: String, trim: true, default: "" },
      width: { type: Number },
      height: { type: Number },
    },
    mobile: {
      url: { type: String, trim: true },
      alt: { type: String, trim: true, default: "" },
      width: { type: Number },
      height: { type: Number },
    },
  },
  { _id: false }
);
