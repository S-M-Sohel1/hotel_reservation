const express = require('express');
const session = require('express-session');
const app = express();
const db = require('./db');
const path = require('path');
const adminRoutes = require('./routes/admin');
const customerRoutes = require('./routes/customers');
const roomRoutes = require('./routes/rooms');

// Session configuration
app.use(session({
  secret: 'hotel-reservation-secret-key-2025', // Change this to a random string in production
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve frontend files from /frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/rooms', roomRoutes);


app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
    