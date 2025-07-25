const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.adminLogin = (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM Admin WHERE username = ?';
  db.query(query, [username], async (err, results) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    if (results.length === 0) return res.status(401).json({ error: 'Invalid username' });

    const admin = results[0];
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: admin.id, role: admin.role }, process.env.JWT_SECRET, {
      expiresIn: '2h',
    });

    res.json({ message: 'Login successful', token });
  });
};
