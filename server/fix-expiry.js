require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Salon = require('./src/models/Salon');

  const salons = await Salon.find().select('name slug subscriptionExpiry isActive');
  console.log('\n=== ALL SALONS ===');
  salons.forEach(s => {
    const expired = s.subscriptionExpiry ? new Date(s.subscriptionExpiry) < new Date() : false;
    console.log(`${s.name} (${s.slug}) | expiry: ${s.subscriptionExpiry ?? 'NULL'} | expired: ${expired}`);
  });

  const slug = process.argv[2];
  if (slug) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const salon = await Salon.findOneAndUpdate({ slug }, { subscriptionExpiry: yesterday }, { new: true });
    console.log(`\nFixed! "${salon.name}" expiry set to ${yesterday}`);
  }

  process.exit(0);
});