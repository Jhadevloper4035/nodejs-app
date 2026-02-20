const mongoose = require("mongoose");
const { MONGO_URI } = require("./env");


const connectMongo = async () => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(MONGO_URI, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
  });
  
  const connection = mongoose.connection;
  console.log(`✅ Database is connected successfully`);
  connection.on('error', (err) => console.error("❌ MongoDB error:", err.message));
  connection.on('disconnected', () => console.log("⚠️  MongoDB disconnected"));
  
  return connection;
};

module.exports = { connectMongo };
