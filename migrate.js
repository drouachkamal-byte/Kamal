// src/db/migrate.js
// Run: node src/db/migrate.js
// Creates all tables in PostgreSQL (Supabase)

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const schema = `

-- ============================================================
-- PARTNERS: كل شريك تجاري (تأمين / مختبر / سيارات / ...)
-- ============================================================
CREATE TABLE IF NOT EXISTS partners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(150) NOT NULL,
  slug          VARCHAR(80)  UNIQUE NOT NULL,   -- "insurance_alhaya"
  flow_type     VARCHAR(50)  NOT NULL,           -- "insurance" | "lab" | "rental" | "custom"
  plan          VARCHAR(30)  DEFAULT 'starter',  -- "starter" | "growth" | "enterprise"
  config        JSONB        DEFAULT '{}',       -- branding, services, webhook_url, etc.
  active        BOOLEAN      DEFAULT TRUE,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- USERS: كل مستخدم واتساب (رقم هاتف)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         VARCHAR(20)  UNIQUE NOT NULL,   -- "+966501234567"
  partner_id    UUID         REFERENCES partners(id),
  source_tag    VARCHAR(80),                     -- الـ slug الذي جاء منه
  name          VARCHAR(100),                    -- اسمه لو عرّف نفسه
  metadata      JSONB        DEFAULT '{}',
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- SESSIONS: حالة المحادثة الحالية لكل مستخدم
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         REFERENCES users(id) ON DELETE CASCADE,
  partner_id    UUID         REFERENCES partners(id),
  current_step  VARCHAR(100) DEFAULT 'welcome',  -- اسم الخطوة الحالية
  context       JSONB        DEFAULT '{}',        -- البيانات المجمعة حتى الآن
  status        VARCHAR(30)  DEFAULT 'active',    -- "active" | "completed" | "abandoned"
  started_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

-- ============================================================
-- MESSAGES: سجل كل رسالة دخلت أو خرجت
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID         REFERENCES sessions(id),
  user_id       UUID         REFERENCES users(id),
  direction     VARCHAR(10)  NOT NULL,   -- "inbound" | "outbound"
  content       TEXT,
  wa_message_id VARCHAR(100),            -- ID الرسالة من واتساب
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- LEADS: كل طلب مكتمل (النتيجة النهائية)
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID         REFERENCES sessions(id),
  user_id       UUID         REFERENCES users(id),
  partner_id    UUID         REFERENCES partners(id),
  data          JSONB        NOT NULL,   -- كل بيانات الطلب
  status        VARCHAR(30)  DEFAULT 'new',  -- "new" | "sent" | "processed"
  sent_to_partner BOOLEAN    DEFAULT FALSE,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- ANALYTICS: إحصائيات يومية مجمعة لكل شريك
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_daily (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id       UUID REFERENCES partners(id),
  date             DATE NOT NULL,
  total_messages   INT DEFAULT 0,
  new_users        INT DEFAULT 0,
  sessions_started INT DEFAULT 0,
  sessions_done    INT DEFAULT 0,
  leads_generated  INT DEFAULT 0,
  UNIQUE(partner_id, date)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_phone      ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_partner    ON users(partner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status  ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_leads_partner    ON leads(partner_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date   ON analytics_daily(partner_id, date);

`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running migrations...');
    await client.query(schema);
    console.log('✅ All tables created successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
