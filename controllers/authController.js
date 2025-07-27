const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Initialize Supabase with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Utility to create JWT token
const createToken = (adminId, email) => {
  return jwt.sign({ id: adminId, email }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Fetch admin from Supabase
  const { data: admin, error } = await supabase
    .from("admins")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !admin) {
    return res.status(401).json({ message: "Invalid email" });
  }

  // Validate password
  const validPassword = await bcrypt.compare(password, admin.password);
  if (!validPassword) {
    return res.status(401).json({ message: "Invalid password" });
  }

  // Create JWT token
  const token = createToken(admin.id, admin.email);

  // Set JWT as HTTP-only cookie
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Use true in production (HTTPS)
    sameSite: "Strict",
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  });

  // ✅ Return token + user info in JSON as well
  res.status(200).json({
    message: "Login successful",
    token,
    user: {
      id: admin.id,
      email: admin.email
    }
  });
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  res.clearCookie("jwt");
  res.status(200).json({ message: "Logout successful" });
};
