// Basic healthcheck: exits 0 if it can connect to RabbitMQ
const { connectRabbit } = require("../config/rabbit");

connectRabbit()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
