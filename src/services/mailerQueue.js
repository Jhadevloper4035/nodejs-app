const { getRabbit } = require("../config/rabbit");
const { MAIL_QUEUE } = require("../config/env");

const enqueueMail = async (payload) => {
  const { channel } = getRabbit();
  channel.sendToQueue(MAIL_QUEUE, Buffer.from(JSON.stringify(payload)), { persistent: true });
};

module.exports = { enqueueMail };
