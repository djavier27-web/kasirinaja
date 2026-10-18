const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { nama_toko, email, role } = req.body;
    const result = await pool.query(
      'INSERT INTO users (nama_toko, email, role) VALUES ($1, $2, $3) RETURNING *',
      [nama_toko, email, role || 'user']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { user_id } = req.query;
    const result = await pool.query('SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC', [user_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { user_id, nama_produk, harga, foto_url } = req.body;
    const result = await pool.query(
      'INSERT INTO products (user_id, nama_produk, harga, foto_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, nama_produk, harga, foto_url]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const { user_id } = req.query;
    const result = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC', [user_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const { user_id, tipe, jumlah, keterangan } = req.body;
    const result = await pool.query(
      'INSERT INTO transactions (user_id, tipe, jumlah, keterangan) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, tipe, jumlah, keterangan]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    const { warna_ui, logo_url, header_struk } = req.body;
    const result = await pool.query(
      'UPDATE users SET warna_ui = $1, logo_url = $2, header_struk = $3 WHERE id = $4 RETURNING *',
      [warna_ui, logo_url, header_struk, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
