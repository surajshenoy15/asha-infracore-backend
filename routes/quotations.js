const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient'); // Adjust path if needed

router.post('/', async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    company,
    street,
    city,
    zip,
    country,
    state,
    comments,
    productInterest
  } = req.body;

  const client_name = `${firstName} ${lastName}`;

  const { data, error } = await supabase.from('quotations').insert([
    {
      first_name: firstName,
      last_name: lastName,
      client_name,
      email,
      phone,
      company,
      street_address: street,
      street, // Optional: if you also want to fill `street` column
      city,
      zip_code: zip,
      zip, // Optional: if you also want to fill `zip` column
      country,
      state,
      comments,
      product_interest: productInterest, // ✅ required
      status: 'pending',
      total_amount: 0
    }
  ]);

  if (error) {
    console.error('Error inserting quotation:', error.message);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, data });
});

module.exports = router;
