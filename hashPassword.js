require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

// ✅ Use correct env variable names (as per your .env file)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // ⬅ Matches your .env exactly
);

const admins = [
  {
    email: 'surajshenoyp@gmail.com',
    password: 'suraj@123'
  },
  {
    email: 'sushmithakshetty2005@gmail.com',
    password: 'sushmitha@123'
  }
];

async function hashAndInsertAdmins() {
  for (const admin of admins) {
    try {
      const hashedPassword = await bcrypt.hash(admin.password, 10);

      const { data, error } = await supabase.from('admins').insert([
        {
          email: admin.email,
          password: admin.password,
          hashed_password: hashedPassword
        }
      ]);

      if (error) {
        console.error(`❌ Error adding ${admin.email}:`, error.message);
      } else {
        console.log(`✅ Added admin: ${admin.email}`);
      }
    } catch (err) {
      console.error(`❌ Error hashing/inserting ${admin.email}:`, err.message);
    }
  }
}

hashAndInsertAdmins();
