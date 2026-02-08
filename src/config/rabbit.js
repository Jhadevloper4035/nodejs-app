const amqplib = require("amqplib");
const { RABBITMQ_URL, MAIL_QUEUE, NODE_ENV } = require("./env");

let conn;
let channel;

const createMemoryRabbit = () => {
  const handlers = new Map();
  return {
    async assertQueue() { console.log("✅ In-memory RabbitMQ ready"); },
    sendToQueue(queue, buf) {
      const h = handlers.get(queue);
      if (h) setImmediate(() => h({ content: buf }));
    },
    consume(queue, fn) {
      handlers.set(queue, (msg) => fn(msg));
    },
    ack() {},
    nack() {},
  };
};

const connectRabbit = async () => {
  if (channel) return { conn, channel };
  
  if (NODE_ENV === "test") {
    conn = { close: async () => {} };
    channel = createMemoryRabbit();
    await channel.assertQueue(MAIL_QUEUE, { durable: false });
    return { conn, channel };
  }
  
  conn = await amqplib.connect(RABBITMQ_URL);
  channel = await conn.createChannel();
  await channel.assertQueue(MAIL_QUEUE, { durable: true });
  
  console.log(`✅ RabbitMQ connected: ${MAIL_QUEUE}`);
  
  conn.on('error', (err) => console.error("❌ RabbitMQ error:", err.message));
  conn.on('close', () => { console.log("⚠️  RabbitMQ closed"); conn = null; channel = null; });
  
  return { conn, channel };
};

const getRabbit = () => {
  if (!channel) throw new Error("RabbitMQ not connected");
  return { conn, channel };
};

module.exports = { connectRabbit, getRabbit };
