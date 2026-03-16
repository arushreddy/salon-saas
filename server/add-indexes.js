// server/add-indexes.js
// Run ONCE after deployment to add compound salonId indexes for performance
// node add-indexes.js

require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected. Adding indexes...\n');

  const db = mongoose.connection.db;

  const indexOps = [
    // Bookings — most queried collection
    { collection: 'bookings', index: { salonId: 1, date: -1 },    name: 'salonId_date' },
    { collection: 'bookings', index: { salonId: 1, status: 1 },   name: 'salonId_status' },
    { collection: 'bookings', index: { salonId: 1, customer: 1 }, name: 'salonId_customer' },

    // Payments
    { collection: 'payments', index: { salonId: 1, createdAt: -1 }, name: 'salonId_createdAt' },
    { collection: 'payments', index: { salonId: 1, status: 1 },     name: 'salonId_status' },

    // Staff
    { collection: 'staffs', index: { salonId: 1, isActive: 1 }, name: 'salonId_isActive' },

    // Services
    { collection: 'services', index: { salonId: 1, isActive: 1 }, name: 'salonId_isActive' },
    { collection: 'services', index: { salonId: 1, category: 1 }, name: 'salonId_category' },

    // Inventory
    { collection: 'inventories', index: { salonId: 1, category: 1 }, name: 'salonId_category' },
    { collection: 'inventories', index: { salonId: 1, lowStock: 1 }, name: 'salonId_lowStock' },

    // Attendance
    { collection: 'attendances', index: { salonId: 1, date: 1 }, name: 'salonId_date' },

    // Users
    { collection: 'users', index: { salonId: 1, role: 1 }, name: 'salonId_role' },

    // Subscription payments
    { collection: 'subscriptionpayments', index: { salonId: 1, createdAt: -1 }, name: 'salonId_createdAt' },
  ];

  for (const op of indexOps) {
    try {
      await db.collection(op.collection).createIndex(op.index, { name: op.name, background: true });
      console.log(`✅ ${op.collection} → ${op.name}`);
    } catch (e) {
      if (e.code === 85 || e.code === 86) {
        console.log(`⚠️  ${op.collection} → ${op.name} (already exists)`);
      } else {
        console.error(`❌ ${op.collection} → ${op.name}: ${e.message}`);
      }
    }
  }

  console.log('\nDone!');
  await mongoose.disconnect();
  process.exit(0);
});