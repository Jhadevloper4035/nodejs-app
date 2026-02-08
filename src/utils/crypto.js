const bcrypt = require("bcryptjs");
const { nanoid } = require("nanoid");

const BCRYPT_ROUNDS = 10;

const hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

const randomOtp = () => String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
const hashOtp = (otp) => bcrypt.hash(otp, 8);
const compareOtp = (otp, hash) => bcrypt.compare(otp, hash);

const newJti = () => nanoid(24);

module.exports = {
  hashPassword,
  comparePassword,
  randomOtp,
  hashOtp,
  compareOtp,
  newJti,
  BCRYPT_ROUNDS,
};
