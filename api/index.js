const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit besar untuk foto Base64

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 1. Auth Login (User & Admin)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, expected_role } = req.body;
    const result = await pool.query(
      'SELECT id, nama_toko, email, role, alamat_toko, nama_kasir, warna_ui, logo_data, header_struk FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const user = result.rows[0];
    if (expected_role && user.role !== expected_role) {
      return res.status(403).json({ error: 'Akses ditolak untuk role ini' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Admin Stats & List Toko (Developer Only)
app.get('/api/admin/stats', async (req, res) => {
  try {
    const usersRes = await pool.query(
      `SELECT u.id, u.nama_toko, u.email, u.created_at, 
              COALESCE(SUM(t.jumlah), 0) as total_omset
       FROM users u 
       LEFT JOIN transactions t ON u.id = t.user_id AND t.tipe = 'pemasukan'
       WHERE u.role = 'user'
       GROUP BY u.id ORDER BY u.created_at DESC`
    );

    const totalRevenueRes = await pool.query(
      "SELECT COALESCE(SUM(jumlah), 0) as total FROM transactions WHERE tipe = 'pemasukan'"
    );

    res.json({
      total_merchants: usersRes.rows.length,
      total_platform_revenue: totalRevenueRes.rows[0].total,
      merchants: usersRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Admin: Buat Akun Merchant Baru
app.post('/api/admin/users', async (req, res) => {
  try {
    const { nama_toko, email, password } = req.body;
    const result = await pool.query(
      'INSERT INTO users (nama_toko, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, nama_toko, email',
      [nama_toko, email, password || '123456', 'user']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Admin: Hapus Toko
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. User: Produk CRUD
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
    const { user_id, nama_produk, harga, foto_data } = req.body;
    const result = await pool.query(
      'INSERT INTO products (user_id, nama_produk, harga, foto_data) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, nama_produk, harga, foto_data]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. User: Transaksi CRUD
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

// 7. User: Pengaturan Struk & UI
app.put('/api/users/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_toko, alamat_toko, nama_kasir, warna_ui, logo_data, header_struk } = req.body;
    const result = await pool.query(
      'UPDATE users SET nama_toko = $1, alamat_toko = $2, nama_kasir = $3, warna_ui = $4, logo_data = $5, header_struk = $6 WHERE id = $7 RETURNING *',
      [nama_toko, alamat_toko, nama_kasir, warna_ui, logo_data, header_struk, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
