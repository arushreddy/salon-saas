// server/seed-plans.js
// Run this ONCE to populate default plans in MongoDB:
//   node seed-plans.js
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();
const mongoose = require('mongoose');
const Plan = require('./src/models/Plan');

const DEFAULT_PLANS = [
  {
    key: 'plan1',
    name: 'Basic',
    description: 'Perfect for single salons just getting started. Walk-ins, staff management, invoices and WhatsApp tools included.',
    sortOrder: 1,
    isActive: true,
    isPopular: false,
    price: { monthly: 999, yearly: 9990 },
    limits: { staffCount: 5, branchCount: 1, bookingsPerMonth: 500 },
    features: {
      onlineBooking:   false,
      customWebsite:   false,
      whatsappModule:  true,
      invoices:        true,
      inventory:       true,
      analytics:       false,
      apiAccess:       false,
      franchiseAccess: false,
      customDomain:    false,
      prioritySupport: false,
    },
  },
  {
    key: 'plan2',
    name: 'Online Booking',
    description: 'Grow your business with online bookings, a branded customer website, advanced analytics and custom domain.',
    sortOrder: 2,
    isActive: true,
    isPopular: true,
    price: { monthly: 1999, yearly: 19990 },
    limits: { staffCount: 15, branchCount: 1, bookingsPerMonth: 2000 },
    features: {
      onlineBooking:   true,
      customWebsite:   true,
      whatsappModule:  true,
      invoices:        true,
      inventory:       true,
      analytics:       true,
      apiAccess:       false,
      franchiseAccess: false,
      customDomain:    true,
      prioritySupport: false,
    },
  },
  {
    key: 'plan3',
    name: 'Franchise',
    description: 'Enterprise-grade for multi-location franchises. Unlimited branches, API access and priority support.',
    sortOrder: 3,
    isActive: true,
    isPopular: false,
    price: { monthly: 4999, yearly: 49990 },
    limits: { staffCount: 100, branchCount: 20, bookingsPerMonth: 10000 },
    features: {
      onlineBooking:   true,
      customWebsite:   true,
      whatsappModule:  true,
      invoices:        true,
      inventory:       true,
      analytics:       true,
      apiAccess:       true,
      franchiseAccess: true,
      customDomain:    true,
      prioritySupport: true,
    },
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  for (const planData of DEFAULT_PLANS) {
    const existing = await Plan.findOne({ key: planData.key });
    if (existing) {
      console.log(`⚠️  Plan "${planData.key}" already exists — skipping`);
    } else {
      await Plan.create(planData);
      console.log(`✅ Created plan: ${planData.name} (${planData.key})`);
    }
  }

  console.log('\nDone! Plans seeded.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});