const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const result = await mongoose.connection.db
    .collection('users')
    .updateOne(
      { email: 'arushreddytummala2006@gmail.com' },
      { $set: { role: 'admin' } }
    );
  console.log('Updated:', result.modifiedCount, 'user to admin');
  process.exit();
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});