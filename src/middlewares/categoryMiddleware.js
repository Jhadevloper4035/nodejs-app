// middleware/categoryMiddleware.js

const { getCategories } = require("../utils/categoryCache");

const categoryMiddleware = async (req, res, next) => {
    if (req.path.startsWith('/public') || req.path === '/favicon.ico') {
        return next();
    }

    try {
        res.locals.categories = await getCategories();
        next();
    } catch (error) {
        console.error('❌ Error loading categories:', error);
        res.locals.categories = [];
        next();
    }
};

module.exports = {categoryMiddleware};