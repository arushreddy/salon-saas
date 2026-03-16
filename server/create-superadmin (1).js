// create-superadmin.js
// Run: node create-superadmin.js
// Delete after running.

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const User = require('./src/models/User');

  const email    = 'arushreddy@gmail.com';
  const password = 'Russel@12';  // plain text — model will hash it

  // Delete any existing entry with this email so we start clean
  await User.deleteOne({ email });

  // Let the pre-save hook hash the password automatically
  await User.create({
    name:     'Super Admin',
    email,
    password, // plain — NOT pre-hashed
    role:     'super_admin',
    isActive: true,
  });

  console.log('✅ Super Admin created!');
  console.log('   Email   :', email);
  console.log('   Password:', password);
  console.log('\n⚠️  Delete this file now!');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
