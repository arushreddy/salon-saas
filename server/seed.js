require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: { type: String, select: false },
  role: String,
  salonId: { type: mongoose.Schema.Types.ObjectId, default: null },
  franchiseId: { type: mongoose.Schema.Types.ObjectId, default: null },
  isActive: { type: Boolean, default: true },
  refreshTokens: [String],
});

const User = mongoose.model('User', userSchema);

const seed = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    const existing = await User.findOne({ email: SUPERADMIN_EMAIL });
    if (existing) {
      console.log('⚠️  Superadmin already exists! Updating password...');
      const salt = await bcrypt.genSalt(12);
      const hashed = await bcrypt.hash(SUPERADMIN_PASSWORD, salt);
      await User.updateOne({ email: SUPERADMIN_EMAIL }, { password: hashed });
      console.log('✅ Password updated!');
    } else {
      const salt = await bcrypt.genSalt(12);
      const hashed = await bcrypt.hash(SUPERADMIN_PASSWORD, salt);
      await User.create({
        name: 'Super Admin',
        email: SUPERADMIN_EMAIL,
        password: hashed,
        role: 'super_admin',
        salonId: null,
        franchiseId: null,
        isActive: true,
      });
      console.log(`✅ Superadmin created: ${SUPERADMIN_EMAIL}`);
    }

    await mongoose.disconnect();
    console.log('✅ Done!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

seed();