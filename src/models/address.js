const mongoose = require("mongoose");

const { Schema } = mongoose;

const addressSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        label: {
            type: String,
            trim: true,
            maxlength: 30,
            default: "Home", // Home / Work / Other
        },

        fullName: {
            type: String,
            trim: true,
            required: true,
            maxlength: 80,
        },

        phone: {
            type: String,
            trim: true,
            required: true,
            // keep as string for leading zeros/country codes
            minlength: 7,
            maxlength: 20,
        },

        alternatePhone: {
            type: String,
            trim: true,
            minlength: 7,
            maxlength: 20,
            default: null,
        },

        line1: { type: String, trim: true, required: true, maxlength: 120 },
        line2: { type: String, trim: true, maxlength: 120, default: "" },
        landmark: { type: String, trim: true, maxlength: 120, default: "" },

        city: { type: String, trim: true, required: true, maxlength: 60 },
        state: { type: String, trim: true, required: true, maxlength: 60 },
        country: { type: String, trim: true, required: true, maxlength: 60, default: "India" },
        postalCode: { type: String, trim: true, required: true, maxlength: 12 },

        // useful for checkout
        isDefault: { type: Boolean, default: false },

        // soft delete for production
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

/**
 * Indexing strategy
 */

// common query: list addresses by user
addressSchema.index({ user: 1, createdAt: -1 });

// ensure only ONE default per user (partial index)
addressSchema.index(
    { user: 1, isDefault: 1 },
    { unique: true, partialFilterExpression: { isDefault: true, isActive: true } }
);

// optionally help search by pincode/city for admin filters
addressSchema.index({ postalCode: 1, city: 1 });

const Address = mongoose.model("Address", addressSchema);

module.exports = Address;
