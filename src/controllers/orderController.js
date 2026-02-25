'use strict';

/**
 * orderController.js — Simplified (no webhook, no PendingOrder model)
 *
 * Flow:
 *  1. POST /checkout/place-order   → validate → create Razorpay order → save to session
 *  2. Razorpay modal opens in browser
 *  3a. Payment succeeds → POST /checkout/verify-payment → create Order → redirect to /orders/:id
 *  3b. Payment fails / dismissed  → POST /checkout/payment-failed → clear session → stay on /checkout
 *
 * On ANY error in verify-payment the response includes { success: false, redirect: '/checkout' }
 * so the frontend always knows to keep the user on the checkout page.
 *
 * ⚠️  Trade-off vs the full version:
 *     If a user pays and closes the browser BEFORE /verify-payment fires,
 *     the payment is captured by Razorpay but no Order is created in your DB.
 *     You would need to reconcile this manually via the Razorpay Dashboard.
 *     Add the webhook + PendingOrder model later to handle this automatically.
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');

const Order = require('../models/order');
const Cart = require('../models/cart');
const Address = require('../models/address');

const config = require("../config/env")


const RAZORPAY_KEY_ID = "rzp_test_SIifDNrVq68IbY"
const RAZORPAY_KEY_SECRET = "eawm1ZcomKoNc49QrUYN0rmb"

const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});

// ─── Constants ────────────────────────────────────────────────────────────────
const COD_ADVANCE_FRACTION = 1 / 3;
const ALLOWED_METHODS = new Set(['card', 'upi', 'cod']);
const MAX_ORDER_NOTE_LEN = 500;
const MAX_CART_ITEMS = 50;
const MIN_ORDER_AMOUNT = 1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id) &&
        String(new mongoose.Types.ObjectId(id)) === String(id);
}

function r2(n) { return Math.round(n * 100) / 100; }

function safeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) {
        crypto.timingSafeEqual(Buffer.alloc(32), Buffer.alloc(32));
        return false;
    }
    try { return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); }
    catch { return false; }
}

function sanitiseText(str, maxLen = 500) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>"'`]/g, '').replace(/[\x00-\x1F\x7F]/g, '').trim().substring(0, maxLen);
}

function buildAddressSnapshot(addr) {
    return {
        fullName: sanitiseText(addr.fullName, 100),
        phone: sanitiseText(addr.phone, 20),
        line1: sanitiseText(addr.line1, 200),
        line2: sanitiseText(addr.line2 || '', 200),
        landmark: sanitiseText(addr.landmark || '', 100),
        city: sanitiseText(addr.city, 100),
        state: sanitiseText(addr.state, 100),
        country: sanitiseText(addr.country, 100),
        postalCode: sanitiseText(addr.postalCode, 20),
        addressRefId: addr._id,
    };
}

function getUserId(req) {
    const id = req.user?.id || req.user?._id;
    if (!id) return null;
    const str = id.toString();
    return isValidObjectId(str) ? str : null;
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /checkout/place-order
// Validates cart + address, creates Razorpay order, saves everything to session.
// On any error → JSON error (frontend stays on /checkout, shows the message).
// ══════════════════════════════════════════════════════════════════════════════
exports.initiateCheckout = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Please login to continue.' });

        const { shippingAddressId, billingAddressId, sameBilling, paymentMethod, orderNote, cartId } = req.body;

        // ── Validate inputs ────────────────────────────────────────────────────
        if (!cartId || !isValidObjectId(cartId))
            return res.status(400).json({ error: 'Invalid cart reference.' });
        if (!shippingAddressId || !isValidObjectId(shippingAddressId))
            return res.status(400).json({ error: 'Please select a shipping address.' });
        if (!ALLOWED_METHODS.has(paymentMethod))
            return res.status(400).json({ error: 'Please select a valid payment method.' });

        const isSameBilling = sameBilling === 'true' || sameBilling === true;
        const effectiveBillingId = isSameBilling ? shippingAddressId : billingAddressId;
        if (!effectiveBillingId || !isValidObjectId(effectiveBillingId))
            return res.status(400).json({ error: 'Please select a billing address.' });

        const cleanNote = sanitiseText(orderNote || '', MAX_ORDER_NOTE_LEN);

        // ── Fetch addresses (must belong to this user) ─────────────────────────
        const [shippingAddr, billingAddr] = await Promise.all([
            Address.findOne({ _id: shippingAddressId, user: userId, isActive: true }).lean(),
            Address.findOne({ _id: effectiveBillingId, user: userId, isActive: true }).lean(),
        ]);
        if (!shippingAddr) return res.status(400).json({ error: 'Shipping address not found.' });
        if (!billingAddr) return res.status(400).json({ error: 'Billing address not found.' });

        // ── Fetch cart + products (prices always from DB, never from client) ───
        const cart = await Cart.findOne({ _id: cartId, userId })
            .populate({ path: 'items.productId', select: 'price stock inStock isActive isDeleted title images' })
            .lean();

        if (!cart) return res.status(400).json({ error: 'Cart not found.' });
        if (!cart.items.length) return res.status(400).json({ error: 'Your cart is empty.' });
        if (cart.items.length > MAX_CART_ITEMS)
            return res.status(400).json({ error: 'Cart exceeds maximum item limit.' });

        // ── Build order items, validate stock ──────────────────────────────────
        let subtotal = 0;
        const orderItems = [];
        const stockErrors = [];

        for (const item of cart.items) {
            const product = item.productId;

            if (!product || product.isDeleted || !product.isActive) {
                stockErrors.push('A product in your cart is no longer available.'); continue;
            }
            if (!product.inStock || product.stock < 1) {
                stockErrors.push(`"${product.title}" is out of stock.`); continue;
            }

            const qty = Math.floor(Number(item.quantity));
            const price = r2(Number(product.price));

            if (qty < 1 || qty > 100) { stockErrors.push(`Invalid quantity for "${product.title}".`); continue; }
            if (product.stock < qty) { stockErrors.push(`Only ${product.stock} unit(s) of "${product.title}" available.`); continue; }
            if (price <= 0) { stockErrors.push(`Invalid price for "${product.title}".`); continue; }

            subtotal += price * qty;
            orderItems.push({
                productId: product._id,
                name: sanitiseText(item.name || product.title, 200),
                image: item.image || product.images?.[0] || '',
                price,
                quantity: qty,
            });
        }

        if (stockErrors.length) return res.status(400).json({ error: stockErrors[0], errors: stockErrors });
        if (!orderItems.length) return res.status(400).json({ error: 'No valid items in cart.' });

        subtotal = r2(subtotal);
        const shippingCharge = 0;  // add your shipping logic here
        const discount = 0;  // add your coupon/discount logic here
        const totalAmount = r2(subtotal + shippingCharge - discount);

        if (totalAmount < MIN_ORDER_AMOUNT)
            return res.status(400).json({ error: 'Order amount too low.' });

        // ── COD advance (1/3 now, 2/3 on delivery) ─────────────────────────────
        const isCod = paymentMethod === 'cod';
        const codAdvanceAmount = isCod ? r2(totalAmount * COD_ADVANCE_FRACTION) : 0;
        const codRemaining = isCod ? r2(totalAmount - codAdvanceAmount) : 0;
        const chargeAmount = isCod ? codAdvanceAmount : totalAmount;

        // ── Create Razorpay order ──────────────────────────────────────────────
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(chargeAmount * 100), // in paise
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`.substring(0, 40),
        });

        // ── Save everything to session ─────────────────────────────────────────
        // This is the only place we store order state.
        // No PendingOrder model — simpler, but if the user pays and closes the tab
        // before /verify-payment fires, the order won't be saved automatically.
        req.session.pendingOrder = {
            razorpayOrderId: razorpayOrder.id,
            chargeAmount,
            userId,
            orderPayload: {
                user: userId,
                items: orderItems,
                shippingAddress: buildAddressSnapshot(shippingAddr),
                billingAddress: buildAddressSnapshot(billingAddr),
                subtotal,
                shippingCharge,
                discount,
                totalAmount,
                orderNote: cleanNote,
                cartId: cart._id.toString(),
                payment: {
                    method: paymentMethod,
                    status: 'pending',
                    isCodAdvance: isCod,
                    codAdvanceAmount,
                    codRemainingAmount: codRemaining,
                    codAdvancePaid: false,
                },
            },
            expiresAt: Date.now() + 30 * 60 * 1000, // 30 min session TTL
        };

        await new Promise((resolve, reject) =>
            req.session.save(err => err ? reject(err) : resolve())
        );

        return res.json({
            success: true,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            keyId: RAZORPAY_KEY_ID,
            paymentMethod,
            isCodAdvance: isCod,
            codAdvanceAmount,
            codRemainingAmount: codRemaining,
            totalAmount,
            prefill: {
                name: shippingAddr.fullName,
                contact: shippingAddr.phone,
                email: req.user?.email || '',
            },
        });

    } catch (err) {
        console.error('[initiateCheckout]', err);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /checkout/verify-payment
// Verifies HMAC signature → creates Order in DB.
// On ANY failure → { success: false, error, redirect: '/checkout' }
// Frontend must keep user on /checkout and show the error message.
// ══════════════════════════════════════════════════════════════════════════════
exports.verifyPayment = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ success: false, error: 'Please login to continue.', redirect: '/checkout' });

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
            return res.status(400).json({ success: false, error: 'Missing payment details.', redirect: '/checkout' });

        // ── HMAC-SHA256 signature verification (timing-safe) ──────────────────
        const expectedSig = crypto
            .createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (!safeEqual(expectedSig, razorpay_signature)) {
            console.warn('[verifyPayment] Signature mismatch — userId:', userId);
            return res.status(400).json({ success: false, error: 'Payment verification failed. Please try again.', redirect: '/checkout' });
        }

        // ── Load pending order from session ───────────────────────────────────
        const pending = req.session.pendingOrder;

        if (!pending) {
            // Session gone — check if order was already created (e.g. double submit)
            const existing = await Order.findOne({ 'payment.razorpayOrderId': razorpay_order_id }).lean();
            if (existing) return res.json({ success: true, orderId: existing.orderId });
            return res.status(400).json({ success: false, error: 'Your session expired. Please start checkout again.', redirect: '/checkout' });
        }

        // ── Validate session belongs to this user and this Razorpay order ─────
        if (!safeEqual(pending.userId, userId))
            return res.status(403).json({ success: false, error: 'Unauthorised.', redirect: '/checkout' });

        if (!safeEqual(pending.razorpayOrderId, razorpay_order_id))
            return res.status(400).json({ success: false, error: 'Order reference mismatch.', redirect: '/checkout' });

        if (Date.now() > pending.expiresAt)
            return res.status(400).json({ success: false, error: 'Checkout session expired. Please start again.', redirect: '/checkout' });

        // ── Idempotency: don't double-create ──────────────────────────────────
        const existing = await Order.findOne({ 'payment.razorpayOrderId': razorpay_order_id }).lean();
        if (existing) {
            delete req.session.pendingOrder;
            req.session.save(() => { });
            return res.json({ success: true, orderId: existing.orderId });
        }

        // ── Create Order in DB ────────────────────────────────────────────────
        const payload = pending.orderPayload;
        const isCod = payload.payment.method === 'cod';

        const order = await Order.create({
            ...payload,
            status: 'confirmed',
            payment: {
                method: payload.payment.method,
                status: 'paid',
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                paidAt: new Date(),
                isCodAdvance: isCod,
                codAdvanceAmount: payload.payment.codAdvanceAmount,
                codRemainingAmount: payload.payment.codRemainingAmount,
                codAdvancePaid: isCod,
            },
        });

        // ── Clear cart (best-effort — order is already saved even if this fails) ─
        try {
            await Cart.findOneAndUpdate(
                { _id: payload.cartId, userId },
                { $set: { items: [] } }
            );
        } catch (e) {
            console.error('[verifyPayment] Cart clear failed (non-fatal):', e.message);
        }

        // ── Clear session ─────────────────────────────────────────────────────
        delete req.session.pendingOrder;
        await new Promise(resolve => req.session.save(() => resolve()));

        return res.json({ success: true, orderId: order.orderId });

    } catch (err) {
        console.error('[verifyPayment]', err);
        return res.status(500).json({ success: false, error: 'Verification failed. Please contact support.', redirect: '/checkout' });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /checkout/payment-failed
// Called when user closes Razorpay modal OR payment is declined.
// Clears session. Frontend stays on /checkout — user can try again.
// ══════════════════════════════════════════════════════════════════════════════
exports.paymentFailed = async (req, res) => {
    try {
        delete req.session.pendingOrder;
        await new Promise(resolve => req.session.save(() => resolve()));
        return res.json({ success: true });
    } catch (err) {
        console.error('[paymentFailed]', err);
        return res.status(500).json({ error: 'Error handling payment failure.' });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /orders/:orderId
// Order confirmation / detail page.
// ══════════════════════════════════════════════════════════════════════════════
exports.orderDetail = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.redirect('/login');

        const { orderId } = req.params;
        if (!orderId || typeof orderId !== 'string' || orderId.length > 60)
            return res.status(400).render('404', { title: 'Invalid order reference' });

        const order = await Order.findOne({ orderId, user: userId }).lean();
        if (!order) return res.status(404).render('404', { title: 'Order not found' });

        return res.render('orderDetail', { title: `Order ${order.orderId}`, order });

    } catch (err) {
        console.error('[orderDetail]', err);
        return res.status(500).render('error', { title: 'Error', message: 'Could not load order.' });
    }
};
