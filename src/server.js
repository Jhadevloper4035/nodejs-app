const http = require("http");
const { createApp } = require("./app");
const { connectMongo } = require("./config/db");
const { connectRedis } = require("./config/redis");
const { connectRabbit } = require("./config/rabbit");
const { PORT } = require("./config/env");

const start = async () => {
  await connectMongo();
  await connectRedis();
  await connectRabbit();

  const app = createApp();
  const server = http.createServer(app);

  const shutdown = async () => {
    console.log("\nGraceful shutdown...");
    server.close(async () => {
      try {
        const mongoose = require("mongoose");
        await mongoose.connection.close();
      } catch {}
      try {
        const { getRedis } = require("./config/redis");
        await getRedis().quit();
      } catch {}
      try {
        const { getRabbit } = require("./config/rabbit");
        await getRabbit().conn.close();
      } catch {}
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  server.listen(PORT, () => console.log(`✅ Server is running http://localhost:${PORT}`));
};

start().catch((e) => {
  console.error("Failed to start:", e);
  process.exit(1);
});
