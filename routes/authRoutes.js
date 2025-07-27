// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router();
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = process.env.JWT_SECRET;

const allowedAdmins = ['surajshenoyp@gmail.com', 'sushmithakshetty2005@gmail.com'];

// ✅ LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required.' });

  if (!allowedAdmins.includes(email))
    return res.status(403).json({ message: 'Not authorized as admin' });

  const { data: admin, error } = await supabase
    .from('admins')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !admin)
    return res.status(404).json({ message: 'Admin not found' });

  const isMatch = await bcrypt.compare(password, admin.hashed_password);
  if (!isMatch)
    return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ email: admin.email, id: admin.id }, JWT_SECRET, { expiresIn: '1d' });

  res.cookie('adminToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.status(200).json({ message: 'Login successful', user: { id: admin.id, email: admin.email } });
});

// ✅ VERIFY ADMIN SESSION
router.get('/verify', (req, res) => {
  const token = req.cookies.adminToken;
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.status(200).json({ valid: true, admin: decoded });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// ✅ LOGOUT
router.post('/logout', (req, res) => {
  res.clearCookie('adminToken');
  res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = router;
