'use strict';

const express = require('express');
const router = express.Router();
const orderCtrl = require('../controllers/orderController');

// ← Update this path to your existing auth middleware
const { requireAuth, requireVerified } = require('../middlewares/auth');



// ──────────────────────────────────────────────────────────────────────────────

/**
 * POST /checkout/place-order
 * Validates cart + address, creates Razorpay order, saves to session.
 * Returns Razorpay options to the frontend.
 */
router.post('/place-order', requireAuth, requireVerified, orderCtrl.initiateCheckout);

/**
 * POST /checkout/verify-payment
 * Verifies Razorpay HMAC signature → creates Order in DB.
 * Returns { success: false, redirect: '/checkout' } on any failure.
 */
router.post('/verify-payment', requireAuth, requireVerified, orderCtrl.verifyPayment);

/**
 * POST /checkout/payment-failed
 * Clears session when user dismisses modal or payment is declined.
 * Frontend stays on /checkout so user can try again.
 */
router.post('/payment-failed', requireAuth, requireVerified, orderCtrl.paymentFailed);

/**
 * GET /orders/:orderId
 * Order confirmation page. Scoped to the logged-in user.
 */
router.get('/:orderId', requireAuth, requireVerified, orderCtrl.orderDetail);

module.exports = router;
