const express = require('express');
const router = express.Router();
const { registerCustomer, loginCustomer, getDashboard, reserveRoom, logout, cancelReservation } = require('../controllers/customerController');

router.post('/register', registerCustomer);
router.post('/login', loginCustomer);
router.post('/logout', logout);
router.post('/reserve', reserveRoom);
router.post('/cancel', cancelReservation);

// 👇 New route for dashboard
router.get('/dashboard', getDashboard);

module.exports = router;
