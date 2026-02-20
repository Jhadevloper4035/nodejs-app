const { connectRabbit } = require("../config/rabbit");
const { MAIL_QUEUE } = require("../config/env");
const { sendMail } = require("./mailer");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const startWorker = async () => {
  const { channel } = await connectRabbit();


  channel.consume(
    MAIL_QUEUE,
    async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString("utf-8"));
        await sendMail(payload);
        channel.ack(msg);
      } catch (e) {
        console.error("Worker error:", e);
        channel.nack(msg, false, false); // dead-letter by dropping for demo
      }
    },
    { noAck: false }
  );

  const shutdown = async () => {
    console.log("\nWorker shutdown...");
    try {
      const { getRabbit } = require("../config/rabbit");
      await getRabbit().conn.close();
    } catch {}
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

startWorker().catch((e) => {
  console.error("Worker failed:", e);
  process.exit(1);
});
