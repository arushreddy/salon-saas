const mongoose = require('mongoose');
require('dotenv').config();

const services = [
  // Hair
  { name: 'Haircut & Styling', description: 'Professional cut with wash, blow-dry and styling', category: 'hair', price: 500, duration: 45, gender: 'unisex' },
  { name: 'Hair Spa Treatment', description: 'Deep conditioning treatment with head massage for silky smooth hair', category: 'hair', price: 1200, duration: 60, gender: 'unisex' },
  { name: 'Hair Color (Global)', description: 'Full head color with premium ammonia-free products', category: 'hair', price: 2500, discountPrice: 2200, duration: 120, gender: 'unisex' },
  { name: 'Hair Highlights', description: 'Partial or full highlights with foil technique', category: 'hair', price: 3000, duration: 150, gender: 'unisex' },
  { name: 'Keratin Treatment', description: 'Anti-frizz smoothing treatment lasting 3-4 months', category: 'hair', price: 5500, discountPrice: 4999, duration: 180, gender: 'unisex' },

  // Skin
  { name: 'Classic Facial', description: 'Deep cleansing facial with extraction and mask', category: 'skin', price: 800, duration: 45, gender: 'unisex' },
  { name: 'Gold Facial', description: 'Premium gold-infused facial for radiant glowing skin', category: 'skin', price: 1500, discountPrice: 1299, duration: 60, gender: 'unisex' },
  { name: 'De-Tan Treatment', description: 'Full face and neck de-tan with natural ingredients', category: 'skin', price: 600, duration: 30, gender: 'unisex' },
  { name: 'Anti-Aging Facial', description: 'Advanced anti-wrinkle treatment with collagen boost', category: 'skin', price: 2000, duration: 75, gender: 'female' },

  // Nails
  { name: 'Classic Manicure', description: 'Nail shaping, cuticle care, hand massage and polish', category: 'nails', price: 400, duration: 30, gender: 'unisex' },
  { name: 'Luxury Pedicure', description: 'Foot soak, scrub, massage and premium nail polish', category: 'nails', price: 700, discountPrice: 599, duration: 45, gender: 'unisex' },
  { name: 'Gel Nail Extensions', description: 'Full set of gel nail extensions with design', category: 'nails', price: 2000, duration: 90, gender: 'female' },
  { name: 'Nail Art', description: 'Custom nail art designs per nail', category: 'nails', price: 150, duration: 15, gender: 'female' },

  // Makeup
  { name: 'Party Makeup', description: 'Glamorous party look with premium products', category: 'makeup', price: 2500, duration: 60, gender: 'female' },
  { name: 'Engagement Makeup', description: 'Elegant engagement look with airbrush foundation', category: 'makeup', price: 5000, discountPrice: 4500, duration: 90, gender: 'female' },

  // Spa
  { name: 'Swedish Massage', description: 'Full body relaxation massage with aromatic oils', category: 'spa', price: 1800, duration: 60, gender: 'unisex' },
  { name: 'Aromatherapy Massage', description: 'Therapeutic massage with essential oils for stress relief', category: 'spa', price: 2200, duration: 75, gender: 'unisex' },
  { name: 'Body Polishing', description: 'Full body scrub and polish for smooth glowing skin', category: 'spa', price: 2500, duration: 90, gender: 'unisex' },

  // Bridal
  { name: 'Bridal Makeup Package', description: 'Complete bridal look including trial, makeup, draping and hairstyling', category: 'bridal', price: 15000, discountPrice: 12999, duration: 240, gender: 'female' },
  { name: 'Pre-Bridal Package', description: '5-session package: facials, body polish, hair spa, mani-pedi, waxing', category: 'bridal', price: 8000, discountPrice: 6999, duration: 300, gender: 'female' },

  // Grooming
  { name: 'Beard Trim & Shape', description: 'Professional beard trimming and shaping with hot towel', category: 'grooming', price: 300, duration: 20, gender: 'male' },
  { name: 'Royal Shave', description: 'Traditional straight razor shave with pre and post care', category: 'grooming', price: 500, duration: 30, gender: 'male' },
  { name: "Men's Facial", description: 'Deep cleansing facial designed for men\'s skin', category: 'grooming', price: 700, duration: 40, gender: 'male' },

  // Combo
  { name: 'Pamper Package', description: 'Facial + Manicure + Pedicure combo at special price', category: 'combo', price: 1800, discountPrice: 1499, duration: 120, gender: 'unisex' },
  { name: 'Glow Up Package', description: 'Hair Spa + Gold Facial + Body Polish', category: 'combo', price: 4500, discountPrice: 3799, duration: 180, gender: 'unisex' },
];

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Service = mongoose.model('Service', new mongoose.Schema({}, { strict: false }));

  // Clear existing services
  await mongoose.connection.db.collection('services').deleteMany({});

  // Insert new services
  await mongoose.connection.db.collection('services').insertMany(
    services.map((s) => ({
      ...s,
      discountPrice: s.discountPrice || null,
      image: '',
      isActive: true,
      popularity: Math.floor(Math.random() * 50),
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  );

  console.log(`✅ Seeded ${services.length} services successfully!`);
  process.exit();
}).catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});