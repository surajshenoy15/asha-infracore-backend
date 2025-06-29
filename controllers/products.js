const { supabase } = require('../supabaseClient');

const uploadProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      horsepower,
      rated_operating_capacity,
      rated_operating_capacity_unit,
      operating_weight,
      dig_depth,
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
      return res.status(500).json({ error: 'Image upload failed' });
    }

    const imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/products/${uploadData.path}`;

    const insertData = {
      name,
      description,
      horsepower: horsepower ? parseFloat(horsepower) : null,
      rated_operating_capacity: rated_operating_capacity ? parseFloat(rated_operating_capacity) : null,
      rated_operating_capacity_unit: rated_operating_capacity_unit || 'kg',
      operating_weight: operating_weight ? parseFloat(operating_weight) : null,
      dig_depth: dig_depth ? parseFloat(dig_depth) : null,
      category: category.toLowerCase().replace(/\s+/g, '-'),
      image: imageUrl,
    };

    const { data: inserted, error: insertError } = await supabase.from('products').insert([insertData]);
    if (insertError) {
      return res.status(500).json({ error: 'Failed to insert product' });
    }

    res.status(200).json(inserted);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const {
      name,
      description,
      horsepower,
      rated_operating_capacity,
      rated_operating_capacity_unit,
      operating_weight,
      dig_depth,
      category
    } = req.body;

    let image = null;
    if (req.file) {
      const uploadPath = `images/${Date.now()}_${req.file.originalname}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('products')
        .upload(uploadPath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        return res.status(500).json({ error: 'Image upload failed' });
      }

      image = `${process.env.SUPABASE_URL}/storage/v1/object/public/products/${uploadData.path}`;
    }

    const updateData = {
      ...(name && { name }),
      ...(description && { description }),
      ...(horsepower && { horsepower: parseFloat(horsepower) }),
      ...(rated_operating_capacity && { rated_operating_capacity: parseFloat(rated_operating_capacity) }),
      ...(rated_operating_capacity_unit && { rated_operating_capacity_unit }),
      ...(operating_weight && { operating_weight: parseFloat(operating_weight) }),
      ...(dig_depth && { dig_depth: parseFloat(dig_depth) }),
      ...(category && { category: category.toLowerCase().replace(/\s+/g, '-') }),
      ...(image && { image }),
    };

    const { data, error } = await supabase.from('products').update(updateData).eq('id', id).select();
    if (error) return res.status(500).json({ error: 'Failed to update product' });

    res.status(200).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return res.status(500).json({ error: 'Failed to delete product' });

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  uploadProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
};
