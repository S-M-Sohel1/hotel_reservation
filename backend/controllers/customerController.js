const db = require('../db');
const bcrypt = require('bcrypt');

exports.registerCustomer = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Check if user already exists
    const checkQuery = 'SELECT * FROM Customer WHERE email = ?';
    db.query(checkQuery, [email], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.length > 0) return res.status(400).json({ error: 'Email already registered' });

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new customer
      const insertQuery = 'INSERT INTO Customer (name, email, phone, password) VALUES (?, ?, ?, ?)';
      db.query(insertQuery, [name, email, phone, hashedPassword], (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to register' });
        res.json({ message: 'Registration successful' });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
exports.loginCustomer = (req, res) => {
  const { email, password } = req.body;

  const query = 'SELECT * FROM Customer WHERE email = ?';
  db.query(query, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(400).json({ error: 'Email not registered' });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Incorrect password' });

    // ✅ Create session for the user
    req.session.customerId = user.customer_id;
    req.session.customerEmail = user.email;

    // Return user info (avoid password)
    res.json({
      message: 'Login successful',
      customer: {
        id: user.customer_id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  });
};
exports.getDashboard = (req, res) => {
  // ✅ Get customer ID from session instead of query params
  const customerId = req.session?.customerId;

  if (!customerId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const profileQuery = 'SELECT name, email, phone FROM Customer WHERE customer_id = ?';
  
  // Query for upcoming reservations with room details
  const reservationsQuery = `
    SELECT 
      res.reservation_id, 
      res.room_id, 
      res.check_in, 
      res.check_out, 
      res.status,
      r.room_number,
      rt.type_name,
      rt.price
    FROM reservation res
    JOIN room r ON res.room_id = r.room_id
    JOIN roomtype rt ON r.type_id = rt.type_id
    WHERE res.customer_id = ? 
      AND res.check_in >= CURDATE() 
      AND res.status = 'Confirmed'
    ORDER BY res.check_in ASC
  `;
  
  db.query(profileQuery, [customerId], (err, profileResults) => {
    if (err) {
      return res.status(500).json({ error: 'Database error (profile)' });
    }
    
    // Query reservations
    db.query(reservationsQuery, [customerId], (err, reservationResults) => {
      if (err) {
        console.log('Reservations query error:', err);
        return res.status(500).json({ error: 'Database error (reservations)' });
      }

      res.json({
        profile: profileResults[0] || {},
        upcomingReservations: reservationResults || []
      });
    });
  });
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
};

exports.cancelReservation = (req, res) => {
  const { reservation_id } = req.body;
  const customer_id = req.session?.customerId;
  
  if (!customer_id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // First, get the reservation details to check ownership and dates
  const getReservationQuery = `
    SELECT * FROM reservation 
    WHERE reservation_id = ? AND customer_id = ? AND status = 'Confirmed'
  `;

  db.query(getReservationQuery, [reservation_id, customer_id], (err, results) => {
    if (err) {
      console.log('Get reservation error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Reservation not found or already cancelled' });
    }

    const reservation = results[0];
    const checkInDate = new Date(reservation.check_in);
    const currentDate = new Date();
    
    // Calculate hours until check-in
    const hoursUntilCheckIn = (checkInDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60);
    
    let cancellationStatus;
    let cancellationFee = 0;
    let message;

    if (hoursUntilCheckIn >= 48) {
      // Free cancellation
      cancellationStatus = 'Cancelled';
      message = 'Reservation cancelled successfully. No charges applied (free cancellation).';
    } else if (hoursUntilCheckIn >= 0) {
      // Less than 48 hours but before check-in - one night fee
      cancellationStatus = 'Cancelled';
      cancellationFee = 1; // Represents one night fee
      message = 'Reservation cancelled. One-night cancellation fee will be charged due to late cancellation (less than 48 hours).';
    } else {
      // No-show (past check-in date)
      cancellationStatus = 'Cancelled';
      cancellationFee = 100; // Full reservation charge
      message = 'Reservation cancelled as no-show. Full reservation amount will be charged.';
    }

    // Update the reservation status
    const updateQuery = `
      UPDATE reservation 
      SET status = ?, cancellation_fee = ? 
      WHERE reservation_id = ?
    `;

    db.query(updateQuery, [cancellationStatus, cancellationFee, reservation_id], (err, result) => {
      if (err) {
        console.log('Cancel reservation error:', err);
        return res.status(500).json({ error: 'Failed to cancel reservation' });
      }

      // Update room status back to Available
      const updateRoomStatusQuery = 'UPDATE room SET status = "Available" WHERE room_id = ?';
      
      db.query(updateRoomStatusQuery, [reservation.room_id], (err2) => {
        if (err2) {
          console.log('Error updating room status after cancellation:', err2);
          // Still return success since cancellation was processed
        }

        res.json({ 
          message: message,
          cancellation_fee: cancellationFee,
          hours_until_checkin: Math.round(hoursUntilCheckIn)
        });
      });
    });
  });
};

exports.reserveRoom = (req, res) => {
  const { room_id, check_in, check_out } = req.body;
  
  // Get customer_id from session
  const customer_id = req.session?.customerId;
  
  if (!customer_id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // First check if room is available
  const checkRoomSql = 'SELECT status FROM room WHERE room_id = ?';
  
  db.query(checkRoomSql, [room_id], (err, roomResult) => {
    if (err) {
      console.log('Error checking room:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (roomResult.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomResult[0].status !== 'Available') {
      return res.status(400).json({ error: 'Room is not available' });
    }

    // Insert reservation
    const insertReservation = `
      INSERT INTO reservation (customer_id, room_id, check_in, check_out, status)
      VALUES (?, ?, ?, ?, 'Confirmed')
    `;

    db.query(insertReservation, [customer_id, room_id, check_in, check_out], (err, result) => {
      if (err) {
        console.log('Reservation error:', err);
        return res.status(500).json({ error: 'Failed to create reservation' });
      }

      // Update room status to Booked
      const updateRoomStatus = 'UPDATE room SET status = "Booked" WHERE room_id = ?';
      
      db.query(updateRoomStatus, [room_id], (err2) => {
        if (err2) {
          console.log('Error updating room status:', err2);
          // Still return success since reservation was created
        }

        res.json({ 
          message: 'Reservation confirmed successfully', 
          reservation_id: result.insertId 
        });
      });
    });
  });
};