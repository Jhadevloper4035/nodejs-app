const { createClient } = require("redis");
const { REDIS_URL, NODE_ENV } = require("./env");

let client;

const createMemoryRedis = () => {
  const store = new Map();
  return {
    async connect() { console.log("✅ In-memory Redis ready"); },
    async quit() { store.clear(); },
    on() {},
    async set(key, val, opts = {}) {
      store.set(key, { val, exp: opts.EX ? Date.now() + opts.EX * 1000 : null });
    },
    async get(key) {
      const e = store.get(key);
      if (!e) return null;
      if (e.exp && Date.now() > e.exp) {
        store.delete(key);
        return null;
      }
      return e.val;
    },
  };
};

const connectRedis = async () => {
  if (client) return client;
  
  if (NODE_ENV === "test") {
    client = createMemoryRedis();
    await client.connect();
    return client;
  }
  
  client = createClient({ url: REDIS_URL });
  client.on("error", (err) => console.error("❌ Redis error:", err.message));
  client.on("ready", () => console.log("✅ Redis is connected successfully"));
  
  await client.connect();
  return client;
};

const getRedis = () => {
  if (!client) throw new Error("Redis not connected");
  return client;
};

module.exports = { connectRedis, getRedis };
