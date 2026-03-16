// reset-all-data.js
// Clears ALL data from every collection.
// Run: node reset-all-data.js
// DELETE THIS FILE after running.

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const collections = [
    'users', 'bookings', 'services', 'staffs', 'payments',
    'attendances', 'inventories', 'inventorylogs', 'notifications',
    'cashtransactions', 'coupons', 'salarypaymants', 'saloonsettings',
    'shiftreports', 'salons', 'franchises',
  ];

  const db = mongoose.connection.db;
  const existing = (await db.listCollections().toArray()).map(c => c.name);

  for (const col of existing) {
    await db.collection(col).deleteMany({});
    console.log(`🗑️  Cleared: ${col}`);
  }

  console.log('\n✅ All data wiped. Database is clean and ready.');
  console.log('👉 Now run: node create-superadmin.js  (to create your super admin)');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
