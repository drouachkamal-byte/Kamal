// src/index.js
// ============================================================
// BotFlow — نقطة الدخول الرئيسية للسيرفر
// ============================================================

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const webhookRouter   = require('./routes/webhook');
const partnersRouter  = require('./routes/partners');
const analyticsRouter = require('./routes/analytics');
const { pool } = require('./db/pool');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// Middleware الأمان والأساسي
// ============================================================
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// Rate limiting — حماية من الإغراق
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // دقيقة واحدة
  max: 200,
  message: { error: 'Too many requests. Please slow down.' }
});
app.use(limiter);

// Webhook واتساب يحتاج raw body للتحقق — يجب قبل express.json()
app.use('/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  if (req.body && Buffer.isBuffer(req.body)) {
    req.body = JSON.parse(req.body.toString());
  }
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// Routes
// ============================================================
app.use('/webhook',       webhookRouter);
app.use('/api/partners',  partnersRouter);
app.use('/api/analytics', analyticsRouter);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      platform: process.env.PLATFORM_NAME || 'BotFlow',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()) + 's'
    });
  } catch {
    res.status(500).json({ status: 'db_error' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================
// مهام دورية (Cron Jobs)
// ============================================================

// كل يوم الساعة 8 صباحاً: تقرير يومي للـ console
cron.schedule('0 8 * * *', async () => {
  console.log('📊 Daily report:');
  try {
    const res = await pool.query(`
      SELECT p.name, SUM(a.leads_generated) as leads
      FROM analytics_daily a
      JOIN partners p ON p.id = a.partner_id
      WHERE a.date = CURRENT_DATE - 1
      GROUP BY p.name ORDER BY leads DESC
    `);
    res.rows.forEach(r => console.log(`  ${r.name}: ${r.leads} leads yesterday`));
  } catch (err) {
    console.error('Cron error:', err.message);
  }
});

// كل ساعة: إغلاق الجلسات المتروكة (أكثر من 6 ساعات)
cron.schedule('0 * * * *', async () => {
  try {
    const result = await pool.query(`
      UPDATE sessions SET status = 'abandoned'
      WHERE status = 'active'
        AND updated_at < NOW() - INTERVAL '6 hours'
    `);
    if (result.rowCount > 0) {
      console.log(`🔄 Marked ${result.rowCount} sessions as abandoned`);
    }
  } catch (err) {
    console.error('Cleanup cron error:', err.message);
  }
});

// ============================================================
// تشغيل السيرفر
// ============================================================
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║          🤖  BotFlow Platform             ║
║                                           ║
║  Server:   http://localhost:${PORT}          ║
║  Webhook:  /webhook                       ║
║  API:      /api/partners                  ║
║  Health:   /health                        ║
╚═══════════════════════════════════════════╝

Environment: ${process.env.NODE_ENV || 'development'}
Started: ${new Date().toLocaleString('ar-SA')}
  `);
});

module.exports = app;
