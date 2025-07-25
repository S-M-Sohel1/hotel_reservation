// routes/rooms.js
const express = require('express');
const db = require('../db');
const router = express.Router();

// Get all available rooms with room type details
router.get('/', (req, res) => {
  const sql = `
    SELECT 
      r.room_id, 
      r.room_number, 
      r.status,
      rt.type_name,
      rt.price
    FROM room r
    JOIN roomtype rt ON r.type_id = rt.type_id
    WHERE r.status = "Available"
    ORDER BY r.room_id
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.log('Error fetching rooms:', err);
      return res.status(500).json({ error: 'Failed to fetch rooms' });
    }
    res.json(results);
  });
});

module.exports = router;
