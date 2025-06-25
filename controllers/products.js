const { supabase } = require('../supabaseClient');

const uploadProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      horsepower,
      rated_operating_capacity,
      operating_weight,
      category
    } = req.body;

    const file = req.file;

    if (!name || !category || !file) {
      return res.status(400).json({ error: 'Name, category, and image are required' });
    }

    const uploadPath = `images/${Date.now()}_${file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('products')
      .upload(uploadPath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (uploadError) {
      console.error('Upload Error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    const imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/products/${uploadData.path}`;

    const { data: insertedProduct, error: insertError } = await supabase
      .from('products')
      .insert([{
        name,
        description,
        horsepower: horsepower ? parseFloat(horsepower) : null,
        rated_operating_capacity: rated_operating_capacity ? parseFloat(rated_operating_capacity) : null,
        operating_weight: operating_weight ? parseFloat(operating_weight) : null,
        category,
        image: imageUrl,
      }]);

    if (insertError) {
      console.error('Insert Error:', insertError);
      return res.status(500).json({ error: 'Failed to insert product' });
    }

    res.status(200).json(insertedProduct);
  } catch (err) {
    console.error('Unexpected Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error('Fetch Error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

module.exports = {
  uploadProduct,
  getAllProducts
};
