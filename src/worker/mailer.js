const nodemailer = require("nodemailer");
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = require("../config/env");

const hasSmtp = () => Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASSWORD);

const getTransporter = () => {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    requireTLS: true,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });
};

const escape = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[c]));

const renderTemplate = (template, data = {}) => {
  const name = escape(data.name || "there");
  const otp = escape(data.otp || "");
  const ttl = escape(data.ttlMinutes || "");

  if (template === "verify-email") {
    return {
      text: `Hello ${name},\n\nYour verification code is: ${otp}\nIt expires in ${ttl} minutes.\n\nIf you didn't request this, you can ignore this email.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Verify your email</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your verification code is:</p>
          <p style="font-size:28px;letter-spacing:4px"><strong>${otp}</strong></p>
          <p>This code expires in <strong>${ttl} minutes</strong>.</p>
          <p style="color:#666">If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    };
  }

  if (template === "password-reset") {
    return {
      text: `Hello ${name},\n\nYour password reset code is: ${otp}\nIt expires in ${ttl} minutes.\n\nIf you didn't request this, you can ignore this email.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Password reset</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your password reset code is:</p>
          <p style="font-size:28px;letter-spacing:4px"><strong>${otp}</strong></p>
          <p>This code expires in <strong>${ttl} minutes</strong>.</p>
          <p style="color:#666">If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    };
  }

  // fallback
  return {
    text: JSON.stringify({ template, data }, null, 2),
    html: `<pre>${escape(JSON.stringify({ template, data }, null, 2))}</pre>`,
  };
};

const sendMail = async ({ to, subject, template, data }) => {
  if (!hasSmtp()) {
 
    return { ok: true, skipped: true };
  }

  const transporter = getTransporter();
  const content = renderTemplate(template, data);

  const info = await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject: subject || "Notification",
    text: content.text,
    html: content.html,
  });

  return { ok: true, messageId: info.messageId };
};

module.exports = { sendMail };
