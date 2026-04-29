// server/src/utils/otpService.js
// OTP delivery:
//   phone  → WhatsApp via Twilio
//   email  → Gmail via Nodemailer
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const OTP = require('../models/OTP');

const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// ── Send OTP via WhatsApp ──────────────────────────────────────────────────
const sendOTPViaWhatsApp = async (phone, otp, salonName = 'Your Salon') => {
  const { sendOTPWhatsApp } = require('./whatsappService');
  return await sendOTPWhatsApp(phone, otp, 'login', salonName);
};

// ── Send Email via Nodemailer ──────────────────────────────────────────────
const sendEmail = async (email, otp, purpose, salonName = 'Your Salon') => {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  const subject = purpose === 'reset'
    ? `Password Reset OTP — ${salonName}`
    : `Login OTP — ${salonName}`;

  const html = `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #FDFAF5; border-radius: 16px; border: 1px solid #EDE3D0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 28px; font-weight: 400; font-style: italic; color: #1A1208; margin: 0;">
          ${salonName}<span style="color: #B8860B;">.</span>
        </h1>
      </div>
      <h2 style="font-size: 18px; font-weight: 600; color: #1A1208; margin: 0 0 8px;">
        ${purpose === 'reset' ? 'Reset Your Password' : 'Your Login OTP'}
      </h2>
      <p style="color: #5C4A2A; font-size: 14px; margin: 0 0 24px;">
        ${purpose === 'reset'
          ? 'Use this OTP to reset your password. It expires in 10 minutes.'
          : 'Use this OTP to log in to your account. It expires in 10 minutes.'}
      </p>
      <div style="background: #FFF8E7; border: 2px solid #B8860B; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <div style="font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #B8860B; font-family: monospace;">
          ${otp}
        </div>
      </div>
      <p style="color: #9C8660; font-size: 12px; margin: 0;">
        If you didn't request this, please ignore this email. Do not share this OTP with anyone.
      </p>
    </div>
  `;

  if (!user || !pass) {
    console.log('\n==============================');
    console.log(`[OTP DEV] Email → ${email} | OTP: ${otp}`);
    console.log('==============================\n');
    return { devMode: true, otp };
  }

  console.log(`[Nodemailer] Sending to: ${email}`);
  const nodemailer = require('nodemailer');

  // Force IPv4 — Render free tier does not support IPv6
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    family: 4,
    auth: { user, pass },
  });

  const info = await transporter.sendMail({ from: `"${salonName}" <${user}>`, to: email, subject, html });
  console.log('[Nodemailer] Sent. ID:', info.messageId);
  return { devMode: false };
};

// ── Main ───────────────────────────────────────────────────────────────────
const createAndSendOTP = async (identifier, channel, purpose, salonName = 'Your Salon') => {
  await OTP.deleteMany({ identifier: identifier.toLowerCase(), purpose, used: false });

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await OTP.create({ identifier: identifier.toLowerCase(), channel, purpose, otp, expiresAt });

  if (channel === 'phone') {
    return await sendOTPViaWhatsApp(identifier, otp, salonName);
  } else {
    return await sendEmail(identifier, otp, purpose, salonName);
  }
};

// ── Verify ─────────────────────────────────────────────────────────────────
const verifyOTP = async (identifier, otp, purpose) => {
  const record = await OTP.findOne({
    identifier: identifier.toLowerCase(),
    purpose, used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!record) return { valid: false, reason: 'OTP expired or not found' };

  record.attempts += 1;
  if (record.attempts > 5) {
    await record.save();
    return { valid: false, reason: 'Too many incorrect attempts. Request a new OTP.' };
  }

  if (record.otp !== otp) {
    await record.save();
    return { valid: false, reason: `Incorrect OTP. ${5 - record.attempts} attempts left.` };
  }

  record.used = true;
  await record.save();
  return { valid: true };
};

module.exports = { createAndSendOTP, verifyOTP };