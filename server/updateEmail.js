require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  await mongoose.connection.collection('users').updateOne(
    { email: 'arushreddytummala@gmail.com' },
    { $set: { email: 'arushreddytummala2006@gmail.com' } }
  );
  console.log('Done');
  process.exit();
});
