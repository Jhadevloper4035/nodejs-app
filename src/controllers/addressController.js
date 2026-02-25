
const mongoose = require("mongoose");
const Address = require("../models/address.js");
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const pickAllowedFields = (body) => {
    const allowed = [
        "label",
        "fullName",
        "phone",
        "alternatePhone",
        "line1",
        "line2",
        "landmark",
        "city",
        "state",
        "country",
        "postalCode",
        "isDefault",
    ];

    const out = {};
    for (const k of allowed) if (body[k] !== undefined) out[k] = body[k];
    return out;
};


const getAllAddresses = async (req, res) => {
    try {
        const userId = req.user.id;

        const addresses = await Address.find({ user: userId, isActive: true })
            .sort({ isDefault: -1, createdAt: -1 })
            .lean();


        res.status(200).json({ success: true, data: addresses });

    } catch (err) {

        return res.status(500).json({ success: false, message: "Failed to fetch addresses." });

    }
};

const createMyAddress = async (req, res, next) => {
    try {
        const userId = req.user.id;



        // enforce max 5 active addresses
        const activeCount = await Address.countDocuments({ user: userId, isActive: true });
        if (activeCount >= 5) {
            return res.status(400).json({
                success: false,
                message: "You can only store up to 5 active addresses.",
            });
        }



        const payload = pickAllowedFields(req.body);
        payload.country = "India";

        // minimal required validation (use zod/joi in middleware if you want stricter)
        const required = ["fullName", "phone", "line1", "city", "state", "postalCode"];
        for (const r of required) {
            if (!payload[r] || String(payload[r]).trim().length === 0) {
                return res.status(400).json({ success: false, message: `${r} is required.` });
            }
        }

        // if it's the first address, make it default
        if (activeCount === 0) payload.isDefault = true;

        const address = await Address.create({ ...payload, user: userId, isActive: true });

        res.status(201).json({ success: true, data: address });
    } catch (err) {
        // handle unique default constraint nicely
        if (err?.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A default address already exists. Set another address as default instead.",
            });
        }
        next(err);
    }
};

const updateMyAddress = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { addressId } = req.params;

        if (!isValidObjectId(addressId)) {
            return res.status(400).json({ success: false, message: "Invalid addressId." });
        }

        const updates = pickAllowedFields(req.body);

        const address = await Address.findOne({ _id: addressId, user: userId, isActive: true });
        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found." });
        }

        // If client sets isDefault true, we rely on unique partial index + setDefault route also exists
        Object.assign(address, updates);
        await address.save();

        res.json({ success: true, data: address });
    } catch (err) {
        if (err?.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A default address already exists. Use the set default endpoint.",
            });
        }
        next(err);
    }
};

const deleteMyAddress = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { addressId } = req.params;

        if (!isValidObjectId(addressId)) {
            return res.status(400).json({ success: false, message: "Invalid addressId." });
        }

        const address = await Address.findOne({ _id: addressId, user: userId, isActive: true });
        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found." });
        }

        const wasDefault = address.isDefault;

        // soft delete
        address.isActive = false;
        address.isDefault = false;
        await address.save();

        // if default was deleted, promote newest active to default
        if (wasDefault) {
            const newest = await Address.findOne({ user: userId, isActive: true }).sort({ createdAt: -1 });
            if (newest) {
                newest.isDefault = true;
                await newest.save();
            }
        }

        res.json({ success: true, message: "Address deleted." });
    } catch (err) {
        next(err);
    }
};

const setDefaultAddress = async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
        const userId = req.user.id;
        const { addressId } = req.params;

        if (!isValidObjectId(addressId)) {
            return res.status(400).json({ success: false, message: "Invalid addressId." });
        }

        await session.withTransaction(async () => {
            const address = await Address.findOne({ _id: addressId, user: userId, isActive: true }).session(session);
            if (!address) {
                throw Object.assign(new Error("Address not found."), { statusCode: 404 });
            }

            // unset previous default
            await Address.updateMany(
                { user: userId, isActive: true, isDefault: true },
                { $set: { isDefault: false } },
                { session }
            );

            // set new default
            address.isDefault = true;
            await address.save({ session });
        });

        res.json({ success: true, message: "Default address updated." });
    } catch (err) {
        if (err?.statusCode) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        next(err);
    } finally {
        session.endSession();
    }
};


module.exports = {
    getAllAddresses,
    createMyAddress,
    updateMyAddress,
    deleteMyAddress,
    setDefaultAddress,
};