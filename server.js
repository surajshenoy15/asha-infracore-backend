const express = require('express');
const cors = require('cors');
require('dotenv').config();

const productRoutes = require('./routes/products');
const attachmentRoutes = require('./routes/attachments'); // ✅ ADD THIS

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/products', productRoutes);
app.use('/api/attachments', attachmentRoutes); // ✅ ADD THIS

app.get('/', (req, res) => {
  res.send('Asha Infracore API Running');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
