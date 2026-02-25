"use strict";

const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        name: { type: String, required: true },
        image: { type: String, default: "" },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
    },
    { _id: false },
);

const addressSnapshotSchema = new mongoose.Schema(
    {
        fullName: String,
        phone: String,
        line1: String,
        line2: String,
        landmark: String,
        city: String,
        state: String,
        country: String,
        postalCode: String,
        addressRefId: { type: mongoose.Schema.Types.ObjectId, ref: "Address" },
    },
    { _id: false },
);

const paymentSchema = new mongoose.Schema(
    {
        method: { type: String, enum: ["card", "upi", "cod"], required: true },
        status: {
            type: String,
            enum: ["pending", "paid", "failed", "refunded"],
            default: "pending",
        },
        razorpayOrderId: { type: String },
        razorpayPaymentId: { type: String },
        razorpaySignature: { type: String },
        paidAt: { type: Date },

        // COD: 1/3 paid upfront, 2/3 on delivery
        isCodAdvance: { type: Boolean, default: false },
        codAdvanceAmount: { type: Number, default: 0 },
        codRemainingAmount: { type: Number, default: 0 },
        codAdvancePaid: { type: Boolean, default: false },
    },
    { _id: false },
);

const orderSchema = new mongoose.Schema(
    {
        orderId: {
            type: String,
            unique: true,
            default: () =>
                "ORD-" +
                Date.now() +
                "-" +
                Math.random().toString(36).substr(2, 5).toUpperCase(),
        },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        items: { type: [orderItemSchema], required: true },
        shippingAddress: { type: addressSnapshotSchema, required: true },
        billingAddress: { type: addressSnapshotSchema, required: true },
        payment: { type: paymentSchema, required: true },
        subtotal: { type: Number, required: true },
        shippingCharge: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
        orderNote: { type: String, default: "" },
        status: {
            type: String,
            enum: [
                "pending",
                "confirmed",
                "processing",
                "shipped",
                "delivered",
                "cancelled",
            ],
            default: "pending",
        },
        cartId: { type: mongoose.Schema.Types.ObjectId, ref: "Cart" },
    },
    { timestamps: true },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ "payment.razorpayOrderId": 1 });

module.exports = mongoose.model("Order", orderSchema);
