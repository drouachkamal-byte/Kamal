// src/routes/partners.js
// ============================================================
// API لإدارة الشركاء — CRUD كامل
// ============================================================

const express = require('express');
const router = express.Router();
const { query } = require('../db/pool');
const { v4: uuid } = require('uuid');
const QRCode = require('qrcode');

// Middleware: التحقق من API Key
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (key !== process.env.PLATFORM_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(requireApiKey);

// ============================================================
// GET /api/partners — جلب كل الشركاء
// ============================================================
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*,
        (SELECT COUNT(*) FROM users u WHERE u.partner_id = p.id) as total_users,
        (SELECT COUNT(*) FROM leads l WHERE l.partner_id = p.id) as total_leads
       FROM partners p
       ORDER BY p.created_at DESC`
    );
    res.json({ partners: result.rows, count: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/partners/:id — جلب شريك واحد
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM partners WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Partner not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/partners — إنشاء شريك جديد
// ============================================================
router.post('/', async (req, res) => {
  const { name, slug, flow_type, plan = 'starter', config = {} } = req.body;

  if (!name || !slug || !flow_type) {
    return res.status(400).json({ error: 'name, slug, and flow_type are required' });
  }

  // التحقق من أن الـ slug فريد
  const existing = await query('SELECT id FROM partners WHERE slug = $1', [slug]);
  if (existing.rows.length) {
    return res.status(409).json({ error: `Slug "${slug}" already exists` });
  }

  try {
    const result = await query(
      `INSERT INTO partners (name, slug, flow_type, plan, config)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, slug, flow_type, plan, JSON.stringify(config)]
    );

    const partner = result.rows[0];
    const waPhone = process.env.WA_PHONE_NUMBER_ID;
    const link = `https://wa.me/${waPhone}?start=${slug}`;

    // توليد QR code
    let qrBase64 = null;
    try {
      qrBase64 = await QRCode.toDataURL(link, { width: 300, margin: 2 });
    } catch {}

    res.status(201).json({
      partner,
      whatsapp_link: link,
      qr_code: qrBase64,
      message: `Partner "${name}" created successfully!`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUT /api/partners/:id — تعديل شريك
// ============================================================
router.put('/:id', async (req, res) => {
  const { name, flow_type, plan, config, active } = req.body;

  try {
    const result = await query(
      `UPDATE partners
       SET name = COALESCE($1, name),
           flow_type = COALESCE($2, flow_type),
           plan = COALESCE($3, plan),
           config = COALESCE($4, config),
           active = COALESCE($5, active),
           updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [name, flow_type, plan, config ? JSON.stringify(config) : null, active, req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Partner not found' });
    res.json({ partner: result.rows[0], message: 'Updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE /api/partners/:id — حذف شريك (تعطيل)
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    await query('UPDATE partners SET active = FALSE, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ message: 'Partner deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/partners/:id/stats — إحصائيات الشريك
// ============================================================
router.get('/:id/stats', async (req, res) => {
  const { days = 30 } = req.query;

  try {
    const daily = await query(
      `SELECT * FROM analytics_daily
       WHERE partner_id = $1 AND date >= NOW() - INTERVAL '${parseInt(days)} days'
       ORDER BY date ASC`,
      [req.params.id]
    );

    const totals = await query(
      `SELECT
        COALESCE(SUM(total_messages), 0) as total_messages,
        COALESCE(SUM(new_users), 0) as new_users,
        COALESCE(SUM(sessions_started), 0) as sessions_started,
        COALESCE(SUM(leads_generated), 0) as leads_generated
       FROM analytics_daily WHERE partner_id = $1`,
      [req.params.id]
    );

    res.json({ daily: daily.rows, totals: totals.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/partners/:id/qr — إعادة توليد QR Code
// ============================================================
router.post('/:id/qr', async (req, res) => {
  try {
    const result = await query('SELECT slug FROM partners WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Partner not found' });

    const { slug } = result.rows[0];
    const link = `https://wa.me/${process.env.WA_PHONE_NUMBER_ID}?start=${slug}`;
    const qr = await QRCode.toDataURL(link, { width: 400, margin: 2 });

    res.json({ qr_code: qr, link });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
