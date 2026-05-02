// src/routes/webhook.js
// ============================================================
// Webhook واتساب — استقبال الرسائل الواردة
// ============================================================

const express = require('express');
const router = express.Router();
const { handleMessage } = require('../services/router');

// ============================================================
// GET /webhook — التحقق من الـ Webhook (Meta يطلبها مرة واحدة)
// ============================================================
router.get('/', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
    console.log('✅ Webhook verified by Meta!');
    return res.status(200).send(challenge);
  }

  console.warn('⚠️ Webhook verification failed');
  res.status(403).send('Forbidden');
});

// ============================================================
// POST /webhook — استقبال الرسائل الجديدة
// ============================================================
router.post('/', async (req, res) => {
  // أجب فوراً بـ 200 (Meta تنتظر ردك خلال 5 ثواني)
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;

    // تأكد أن الرسالة من واتساب
    if (body.object !== 'whatsapp_business_account') return;

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;

        // معالجة الرسائل الواردة
        if (value.messages) {
          for (const msg of value.messages) {
            await processIncomingMessage(msg, value);
          }
        }

        // معالجة تحديثات الحالة (delivered, read, failed)
        if (value.statuses) {
          for (const status of value.statuses) {
            handleStatusUpdate(status);
          }
        }
      }
    }
  } catch (err) {
    console.error('❌ Webhook processing error:', err);
  }
});

// ============================================================
// معالجة رسالة واردة
// ============================================================
async function processIncomingMessage(msg, value) {
  const phone = msg.from;
  const messageId = msg.id;

  // استخرج النص بحسب نوع الرسالة
  let text = '';

  if (msg.type === 'text') {
    text = msg.text?.body?.trim() || '';
  } else if (msg.type === 'interactive') {
    // رد على زر أو قائمة
    if (msg.interactive.type === 'button_reply') {
      text = msg.interactive.button_reply.id; // استخدم الـ ID
    } else if (msg.interactive.type === 'list_reply') {
      text = msg.interactive.list_reply.id;
    }
  } else if (msg.type === 'location') {
    text = `${msg.location.latitude},${msg.location.longitude}`;
  } else {
    // أنواع غير مدعومة (صورة، صوت، ملف...)
    console.log(`📎 Unsupported message type: ${msg.type} from ${phone}`);
    return;
  }

  if (!text) return;

  // استخرج بيانات الـ referral (إذا جاء عبر رابط)
  const referral = msg.referral || value.referral || null;

  console.log(`📩 Message from ${phone}: "${text.substring(0, 50)}" | step: referral=${referral?.source_url}`);

  // أرسل للمعالج الرئيسي
  await handleMessage({ phone, text, messageId, referral });
}

// ============================================================
// معالجة تحديثات حالة الرسائل
// ============================================================
function handleStatusUpdate(status) {
  // يمكنك تسجيل هذه في DB لاحقاً
  if (status.status === 'failed') {
    console.error(`❌ Message delivery failed: ${status.id} | Error: ${JSON.stringify(status.errors)}`);
  }
}

module.exports = router;
