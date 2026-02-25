'use strict';

/**
 * checkoutSecurity.js
 * Additional security middleware for the checkout flow.
 */

const crypto = require('crypto');

// ─── CSRF double-submit token (use if NOT using csurf) ────────────────────────
exports.generateCheckoutToken = (req, res, next) => {
    if (!req.session.checkoutToken) {
        req.session.checkoutToken = crypto.randomBytes(32).toString('hex');
    }
    res.locals.checkoutToken = req.session.checkoutToken;
    next();
};

exports.verifyCheckoutToken = (req, res, next) => {
    const headerToken = req.headers['x-checkout-token'];
    const sessionToken = req.session?.checkoutToken;
    if (!headerToken || !sessionToken) {
        return res.status(403).json({ error: 'Invalid request token' });
    }
    try {
        const a = Buffer.from(headerToken);
        const b = Buffer.from(sessionToken);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            return res.status(403).json({ error: 'Invalid request token' });
        }
    } catch {
        return res.status(403).json({ error: 'Invalid request token' });
    }
    next();
};

// ─── Block overly deep/large payloads (prototype pollution guard) ─────────────
exports.payloadSanityCheck = (req, res, next) => {
    const body = req.body;
    if (!body || typeof body !== 'object') return next();
    if (Object.keys(body).length > 20) {
        return res.status(400).json({ error: 'Malformed request' });
    }
    const hasDeepNesting = (obj, depth = 0) => {
        if (depth > 4) return true;
        if (typeof obj !== 'object' || obj === null) return false;
        return Object.values(obj).some(v => hasDeepNesting(v, depth + 1));
    };
    if (hasDeepNesting(body)) {
        return res.status(400).json({ error: 'Malformed request structure' });
    }
    next();
};
