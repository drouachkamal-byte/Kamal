// src/services/router.js
// ============================================================
// محرك التوجيه — قلب النظام بالكامل
// يستقبل كل رسالة واردة ويوجهها للـ flow الصحيح
// ============================================================

const { query } = require('../db/pool');
const wa = require('./whatsapp');
const InsuranceFlow = require('../flows/insurance');
const LabFlow = require('../flows/lab');
const RentalFlow = require('../flows/rental');

// خريطة أنواع الـ flows
const FLOW_HANDLERS = {
  insurance: InsuranceFlow,
  lab: LabFlow,
  rental: RentalFlow,
};

// ============================================================
// نقطة الدخول الرئيسية لكل رسالة واردة
// ============================================================
async function handleMessage(messageData) {
  const { phone, text, messageId, referral } = messageData;

  try {
    // 1. وضع علامة "تمت القراءة"
    if (messageId) await wa.markRead(messageId);

    // 2. جلب أو إنشاء المستخدم
    let user = await getOrCreateUser(phone, referral);

    // 3. التحقق من أن المستخدم مرتبط بشريك
    if (!user.partner_id) {
      await wa.sendText(phone,
        '⚠️ لم نتمكن من التعرف على مصدرك.\n\n' +
        'يرجى استخدام الرابط الخاص بشريكنا للوصول إلى خدماتنا.'
      );
      return;
    }

    // 4. جلب بيانات الشريك
    const partner = await getPartner(user.partner_id);
    if (!partner || !partner.active) {
      await wa.sendText(phone, '⚠️ هذه الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً.');
      return;
    }

    // 5. جلب أو إنشاء الجلسة
    const session = await getOrCreateSession(user.id, partner.id);

    // 6. تسجيل الرسالة الواردة
    await logMessage(session.id, user.id, 'inbound', text);

    // 7. تحديث الإحصائيات
    await updateAnalytics(partner.id, 'message');

    // 8. توجيه للـ flow الصحيح
    const FlowHandler = FLOW_HANDLERS[partner.flow_type];
    if (!FlowHandler) {
      console.error(`❌ Unknown flow_type: ${partner.flow_type}`);
      await wa.sendText(phone, '⚠️ خطأ في الإعداد. يرجى التواصل مع الدعم.');
      return;
    }

    // 9. تنفيذ الخطوة الحالية
    const result = await FlowHandler.process({
      session,
      user,
      partner,
      input: text,
    });

    // 10. إرسال الرد
    if (result.reply) {
      let outboundText = null;

      if (result.type === 'text') {
        await wa.sendText(phone, result.reply);
        outboundText = result.reply;
      } else if (result.type === 'buttons') {
        await wa.sendButtons(phone, result.reply, result.buttons);
        outboundText = result.reply;
      } else if (result.type === 'list') {
        await wa.sendList(phone, result.header, result.reply, result.buttonLabel, result.sections);
        outboundText = result.reply;
      }

      // تسجيل الرد الصادر
      if (outboundText) {
        await logMessage(session.id, user.id, 'outbound', outboundText);
      }
    }

    // 11. تحديث حالة الجلسة
    await updateSession(session.id, result.nextStep, result.context);

    // 12. إذا اكتملت المحادثة
    if (result.completed) {
      await completeSession(session.id, user.id, partner.id, result.leadData);
    }

  } catch (err) {
    console.error('❌ Router error:', err);
    await wa.sendText(phone, '⚠️ حدث خطأ مؤقت. يرجى المحاولة مرة أخرى.');
  }
}

// ============================================================
// الدوال المساعدة
// ============================================================

async function getOrCreateUser(phone, referral) {
  // محاولة جلب المستخدم الموجود
  let res = await query('SELECT * FROM users WHERE phone = $1', [phone]);

  if (res.rows.length > 0) {
    return res.rows[0];
  }

  // مستخدم جديد — حاول استخراج الـ tag من الـ referral
  let partnerId = null;
  let sourceTag = null;

  if (referral?.source_url) {
    sourceTag = extractTagFromUrl(referral.source_url);
  } else if (referral?.headline) {
    sourceTag = referral.headline; // بعض الحالات يأتي هكذا
  }

  if (sourceTag) {
    const partnerRes = await query(
      'SELECT id FROM partners WHERE slug = $1 AND active = TRUE',
      [sourceTag]
    );
    if (partnerRes.rows.length > 0) {
      partnerId = partnerRes.rows[0].id;
    }
  }

  // إنشاء المستخدم
  const insertRes = await query(
    `INSERT INTO users (phone, partner_id, source_tag)
     VALUES ($1, $2, $3) RETURNING *`,
    [phone, partnerId, sourceTag]
  );

  // تحديث إحصائيات المستخدمين الجدد
  if (partnerId) {
    await updateAnalytics(partnerId, 'new_user');
  }

  return insertRes.rows[0];
}

async function getPartner(partnerId) {
  const res = await query('SELECT * FROM partners WHERE id = $1', [partnerId]);
  return res.rows[0] || null;
}

async function getOrCreateSession(userId, partnerId) {
  // ابحث عن جلسة نشطة
  let res = await query(
    `SELECT * FROM sessions
     WHERE user_id = $1 AND status = 'active'
     ORDER BY started_at DESC LIMIT 1`,
    [userId]
  );

  if (res.rows.length > 0) return res.rows[0];

  // إنشاء جلسة جديدة
  const insertRes = await query(
    `INSERT INTO sessions (user_id, partner_id, current_step, context)
     VALUES ($1, $2, 'welcome', '{}') RETURNING *`,
    [userId, partnerId]
  );

  await updateAnalytics(partnerId, 'session_start');
  return insertRes.rows[0];
}

async function updateSession(sessionId, nextStep, context) {
  await query(
    `UPDATE sessions SET current_step = $1, context = $2, updated_at = NOW()
     WHERE id = $3`,
    [nextStep, JSON.stringify(context || {}), sessionId]
  );
}

async function completeSession(sessionId, userId, partnerId, leadData) {
  // أغلق الجلسة
  await query(
    `UPDATE sessions SET status = 'completed', completed_at = NOW()
     WHERE id = $1`,
    [sessionId]
  );

  // احفظ الطلب كـ lead
  if (leadData) {
    const leadRes = await query(
      `INSERT INTO leads (session_id, user_id, partner_id, data)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [sessionId, userId, partnerId, JSON.stringify(leadData)]
    );

    await updateAnalytics(partnerId, 'lead');

    // أرسل الـ lead للشريك
    await sendLeadToPartner(partnerId, leadData, leadRes.rows[0].id);
  }
}

async function logMessage(sessionId, userId, direction, content) {
  await query(
    `INSERT INTO messages (session_id, user_id, direction, content)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, userId, direction, content]
  );
}

async function updateAnalytics(partnerId, type) {
  const today = new Date().toISOString().split('T')[0];

  const col = {
    message: 'total_messages',
    new_user: 'new_users',
    session_start: 'sessions_started',
    session_done: 'sessions_done',
    lead: 'leads_generated',
  }[type];

  if (!col) return;

  await query(
    `INSERT INTO analytics_daily (partner_id, date, ${col})
     VALUES ($1, $2, 1)
     ON CONFLICT (partner_id, date) DO UPDATE
     SET ${col} = analytics_daily.${col} + 1`,
    [partnerId, today]
  );
}

async function sendLeadToPartner(partnerId, leadData, leadId) {
  const res = await query('SELECT config FROM partners WHERE id = $1', [partnerId]);
  const config = res.rows[0]?.config;
  if (!config?.handoff) return;

  const { type, url, api_key, email } = config.handoff;

  if (type === 'webhook' && url) {
    try {
      const axios = require('axios');
      await axios.post(url, {
        lead_id: leadId,
        timestamp: new Date().toISOString(),
        data: leadData
      }, {
        headers: {
          'Content-Type': 'application/json',
          ...(api_key && { 'Authorization': `Bearer ${api_key}` })
        },
        timeout: 5000
      });

      await query(
        'UPDATE leads SET status = $1, sent_to_partner = TRUE WHERE id = $2',
        ['sent', leadId]
      );
    } catch (err) {
      console.error('❌ Lead webhook failed:', err.message);
    }
  }

  if (type === 'email' && email) {
    // هنا تضيف nodemailer أو أي خدمة إيميل
    console.log(`📧 Lead to email: ${email}`, leadData);
  }
}

function extractTagFromUrl(url) {
  try {
    const u = new URL(url);
    return u.searchParams.get('start') || u.searchParams.get('ref') || null;
  } catch {
    // حاول مطابقة نصية
    const match = url.match(/[?&]start=([^&]+)/);
    return match ? match[1] : null;
  }
}

module.exports = { handleMessage };
