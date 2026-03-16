// server/src/utils/whatsappService.js
// Sends WhatsApp messages via Twilio Sandbox
// Set in .env:
//   TWILIO_ACCOUNT_SID=ACxxxxxxxx
//   TWILIO_AUTH_TOKEN=xxxxxxxx
//   TWILIO_WA_FROM=whatsapp:+14155238886

const getTwilioClient = () => {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  const twilio = require('twilio');
  return twilio(sid, token);
};

const FROM = () => process.env.TWILIO_WA_FROM || 'whatsapp:+14155238886';

// ── Normalize phone to whatsapp:+91XXXXXXXXXX format ──────────────────────
const toWANumber = (phone) => {
  const digits = String(phone).replace(/\D/g, '');
  const ten = digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits.length === 11 && digits.startsWith('0')
    ? digits.slice(1)
    : digits;
  return `whatsapp:+91${ten}`;
};

// ── Core send function ─────────────────────────────────────────────────────
const sendWA = async (phone, message) => {
  const client = getTwilioClient();
  const to = toWANumber(phone);

  if (!client) {
    console.log(`\n[WA DEV] To: ${to}\n${message}\n`);
    return { devMode: true };
  }

  try {
    console.log(`[WhatsApp] Sending to ${to}`);
    const msg = await client.messages.create({ from: FROM(), to, body: message });
    console.log(`[WhatsApp] Sent ✅ SID: ${msg.sid}`);
    return { devMode: false, sid: msg.sid };
  } catch (err) {
    console.error(`[WhatsApp] ❌ Error:`, err.message);
    throw err;
  }
};

// ══════════════════════════════════════════════════════════════════════════
// 1. OTP
// ══════════════════════════════════════════════════════════════════════════
const sendOTPWhatsApp = async (phone, otp, purpose, salonName = 'Your Salon') => {
  const action = purpose === 'reset' ? 'reset your password' : 'log in';
  const message =
    `🔐 *${salonName}*\n\n` +
    `Your OTP to ${action} is:\n\n` +
    `*${otp}*\n\n` +
    `⏱ Valid for 10 minutes. Do not share this OTP with anyone.`;
  return await sendWA(phone, message);
};

// ══════════════════════════════════════════════════════════════════════════
// 2. Booking Confirmation
// ══════════════════════════════════════════════════════════════════════════
const sendBookingConfirmation = async ({ phone, customerName, salonName, serviceName, staffName, date, timeSlot, refNo, amount }) => {
  const dateStr = new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const message =
    `✅ *Booking Confirmed!*\n\n` +
    `Hi ${customerName}! Your appointment at *${salonName}* is confirmed.\n\n` +
    `📋 *Details:*\n` +
    `• Service: ${serviceName}\n` +
    `• Staff: ${staffName || 'Any available'}\n` +
    `• Date: ${dateStr}\n` +
    `• Time: ${timeSlot.start} – ${timeSlot.end}\n` +
    `• Ref No: ${refNo}\n` +
    (amount ? `• Amount: ₹${amount}\n` : '') +
    `\nSee you soon! 💇`;
  return await sendWA(phone, message);
};

// ══════════════════════════════════════════════════════════════════════════
// 3. Booking Reminder (send 1 day before)
// ══════════════════════════════════════════════════════════════════════════
const sendBookingReminder = async ({ phone, customerName, salonName, serviceName, date, timeSlot, refNo }) => {
  const dateStr = new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
  const message =
    `⏰ *Appointment Reminder*\n\n` +
    `Hi ${customerName}! Just a reminder that you have an appointment tomorrow.\n\n` +
    `📋 *Details:*\n` +
    `• Salon: ${salonName}\n` +
    `• Service: ${serviceName}\n` +
    `• Date: ${dateStr}\n` +
    `• Time: ${timeSlot.start}\n` +
    `• Ref No: ${refNo}\n\n` +
    `See you tomorrow! 😊`;
  return await sendWA(phone, message);
};

// ══════════════════════════════════════════════════════════════════════════
// 4. Payment Receipt
// ══════════════════════════════════════════════════════════════════════════
const sendPaymentReceipt = async ({ phone, customerName, salonName, serviceName, amount, method, refNo, date }) => {
  const dateStr = new Date(date || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const methodLabel = { cash: 'Cash', upi: 'UPI', card: 'Card', razorpay: 'Online', other: 'Other' }[method] || method;
  const message =
    `🧾 *Payment Receipt*\n\n` +
    `Hi ${customerName}! Your payment has been received.\n\n` +
    `📋 *Receipt Details:*\n` +
    `• Salon: ${salonName}\n` +
    `• Service: ${serviceName}\n` +
    `• Amount Paid: ₹${amount}\n` +
    `• Payment Method: ${methodLabel}\n` +
    `• Date: ${dateStr}\n` +
    `• Ref No: ${refNo}\n\n` +
    `Thank you for visiting *${salonName}*! 🙏\n` +
    `We hope to see you again soon.`;
  return await sendWA(phone, message);
};

// ══════════════════════════════════════════════════════════════════════════
// 5. Booking Cancellation
// ══════════════════════════════════════════════════════════════════════════
const sendBookingCancellation = async ({ phone, customerName, salonName, serviceName, date, timeSlot, refNo, reason }) => {
  const dateStr = new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const message =
    `❌ *Booking Cancelled*\n\n` +
    `Hi ${customerName}, your appointment has been cancelled.\n\n` +
    `📋 *Cancelled Booking:*\n` +
    `• Salon: ${salonName}\n` +
    `• Service: ${serviceName}\n` +
    `• Date: ${dateStr}\n` +
    `• Time: ${timeSlot?.start || 'N/A'}\n` +
    `• Ref No: ${refNo}\n` +
    (reason ? `• Reason: ${reason}\n` : '') +
    `\nTo rebook, please contact us or use the app.`;
  return await sendWA(phone, message);
};

// ══════════════════════════════════════════════════════════════════════════
// 6. Booking Completed
// ══════════════════════════════════════════════════════════════════════════
const sendBookingCompleted = async ({ phone, customerName, salonName, serviceName, amount, refNo }) => {
  const message =
    `💅 *Service Completed!*\n\n` +
    `Hi ${customerName}! Thank you for visiting *${salonName}*.\n\n` +
    `• Service: ${serviceName}\n` +
    `• Amount: ₹${amount}\n` +
    `• Ref No: ${refNo}\n\n` +
    `We'd love to see you again! Book your next appointment anytime. 😊`;
  return await sendWA(phone, message);
};

module.exports = {
  sendOTPWhatsApp,
  sendBookingConfirmation,
  sendBookingReminder,
  sendPaymentReceipt,
  sendBookingCancellation,
  sendBookingCompleted,
};