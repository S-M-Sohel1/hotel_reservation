// routes/bookings.js
const express = require('express');
const db = require('../db');
const router = express.Router();

// Book a room
router.post('/', (req, res) => {
  const { customer_id, room_id, check_in, check_out } = req.body;

  const bookingSql = 'INSERT INTO Booking (customer_id, room_id, check_in, check_out) VALUES (?, ?, ?, ?)';
  const updateRoomSql = 'UPDATE Room SET status = "Booked" WHERE room_id = ?';

  db.query(bookingSql, [customer_id, room_id, check_in, check_out], (err, result) => {
    if (err) return res.status(500).send(err);

    db.query(updateRoomSql, [room_id], (err2) => {
      if (err2) return res.status(500).send(err2);
      res.send({ message: 'Room booked successfully', booking_id: result.insertId });
    });
  });
});

module.exports = router;
