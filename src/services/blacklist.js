const { getRedis } = require("../config/redis");

/**
 * Blacklist a refresh token jti until it naturally expires.
 */
const blacklistJti = async (jti, ttlSeconds) => {
  if (!jti) return; // guard against malformed tokens
  const redis = getRedis();
  // set key with expiry
  await redis.set(`bl:jti:${jti}`, "1", { EX: ttlSeconds });
};

const isBlacklisted = async (jti) => {
  if (!jti) return false;
  const redis = getRedis();
  const v = await redis.get(`bl:jti:${jti}`);
  return v === "1";
};

module.exports = { blacklistJti, isBlacklisted };
