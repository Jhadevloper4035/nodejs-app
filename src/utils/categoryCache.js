// utils/categoryCache.js
const { getRedis } = require('../config/redis');
const categoryService = require('../services/category');

const CACHE_KEY = 'categories:all';
const CACHE_TTL = 3600; 

// Fetch categories from DB
const fetchCategories = async () => {
    try {
        const result = await categoryService.listCategories({
            limit: 1000,
            isActive: true,
            sortBy: 'displayOrder',
            sortOrder: 'asc'
        });

        return result.categories;
    } catch (error) {
        console.error('Error fetching categories:', error.message);
        throw error;
    }
};

// Store in Redis
const cacheCategories = async (categories) => {
    try {
        const redis = getRedis();
        await redis.set(CACHE_KEY, JSON.stringify(categories), { EX: CACHE_TTL });

        return categories;
    } catch (error) {
        console.error('Error caching categories:', error.message);
        return categories;
    }
};

// Get from Redis or DB
const getCategories = async () => {
    try {
        const redis = getRedis();

        // Try to get from Redis first
        const cached = await redis.get(CACHE_KEY);

        if (cached) {
            return JSON.parse(cached);
        }

        // If not cached, fetch from DB
        const categories = await fetchCategories();
        await cacheCategories(categories);

        return categories;
    } catch (error) {
        console.error('Error getting categories:', error.message);

        // Fallback to DB if Redis fails
        try {
            return await fetchCategories();
        } catch (dbError) {
            console.error('Error fetching from DB:', dbError.message);
            return [];
        }
    }
};

// Refresh cache
const refresh = async () => {
    try {
        const categories = await fetchCategories();
        await cacheCategories(categories);
        return categories;
    } catch (error) {
        console.error('Error refreshing cache:', error.message);
        throw error;
    }
};

// Clear cache
const clear = async () => {
    try {
        const redis = getRedis();
        await redis.del(CACHE_KEY);
    } catch (error) {
        console.error('Error clearing cache:', error.message);
    }
};

// Initialize cache on startup
const init = async () => {
    try {
        await getCategories(); // Load initial cache
        return true;
    } catch (error) {
        console.error('Error initializing cache:', error.message);
        return false;
    }
};

module.exports = {
    init,
    getCategories,
    refresh,
    clear,
};
