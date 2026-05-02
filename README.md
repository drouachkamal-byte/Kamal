# 🤖 BotFlow — منصة بوتات واتساب متعددة الشركاء

> SaaS Platform لإدارة بوتات واتساب مخصصة لكل شريك تجاري

---

## 🗂️ هيكل المشروع

```
botflow/
├── src/
│   ├── index.js              ← نقطة الدخول الرئيسية
│   ├── db/
│   │   ├── pool.js           ← اتصال قاعدة البيانات
│   │   ├── migrate.js        ← إنشاء الجداول
│   │   └── seed.js           ← بيانات تجريبية
│   ├── routes/
│   │   ├── webhook.js        ← استقبال رسائل واتساب
│   │   ├── partners.js       ← API إدارة الشركاء
│   │   └── analytics.js      ← API التقارير
│   ├── services/
│   │   ├── router.js         ← محرك التوجيه الرئيسي
│   │   └── whatsapp.js       ← إرسال رسائل واتساب
│   └── flows/
│       ├── insurance.js      ← flow التأمين
│       ├── lab.js            ← flow المختبرات
│       └── rental.js         ← flow تأجير السيارات
├── .env.example
└── package.json
```

---

## 🚀 خطوات الإعداد

### 1. تثبيت المتطلبات
```bash
git clone <your-repo>
cd botflow
npm install
```

### 2. إعداد المتغيرات البيئية
```bash
cp .env.example .env
# افتح .env وعدّل القيم:
```

```env
DATABASE_URL=postgresql://user:pass@host:5432/botflow
WA_PHONE_NUMBER_ID=123456789          # من Meta Developer Console
WA_ACCESS_TOKEN=EAAxxxxx              # Permanent Access Token
WA_VERIFY_TOKEN=my_secret_token_123   # أي نص تختاره
PLATFORM_API_KEY=your_platform_key    # مفتاح API للوحة التحكم
```

### 3. إعداد قاعدة البيانات
```bash
# أنشئ DB في Supabase ثم:
npm run db:migrate    # إنشاء الجداول
npm run db:seed       # إضافة شركاء تجريبيين
```

### 4. تشغيل السيرفر
```bash
npm run dev           # وضع التطوير
npm start             # الإنتاج
```

### 5. إعداد Webhook في Meta
1. اذهب لـ [Meta Developer Console](https://developers.facebook.com)
2. افتح تطبيقك ← WhatsApp ← Configuration
3. في Webhook:
   - **URL**: `https://your-domain.com/webhook`
   - **Verify Token**: نفس `WA_VERIFY_TOKEN` في ملف .env
4. اشترك في: `messages`, `messaging_postbacks`

---

## 📡 API Reference

### إضافة شريك جديد
```bash
POST /api/partners
x-api-key: your_platform_key
Content-Type: application/json

{
  "name": "شركة الأمان للتأمين",
  "slug": "insurance_amman",
  "flow_type": "insurance",
  "plan": "growth",
  "config": {
    "branding": {
      "welcome_message": "أهلاً بك في الأمان!",
      "support_phone": "+966501234567"
    },
    "services": ["car", "health"],
    "handoff": {
      "type": "webhook",
      "url": "https://partner.com/api/leads"
    }
  }
}
```

**الرد:**
```json
{
  "partner": { "id": "...", "slug": "insurance_amman", ... },
  "whatsapp_link": "https://wa.me/966501234567?start=insurance_amman",
  "qr_code": "data:image/png;base64,..."
}
```

### جلب إحصائيات الشريك
```bash
GET /api/partners/:id/stats?days=30
x-api-key: your_platform_key
```

### نظرة عامة على المنصة
```bash
GET /api/analytics/overview
x-api-key: your_platform_key
```

---

## 🔄 إضافة Flow جديد (خطوة بخطوة)

1. أنشئ ملف `src/flows/your_flow.js`
2. اعمل `export` للدالة `process({ session, user, partner, input })`
3. أضفه في `src/services/router.js`:
```js
const YourFlow = require('../flows/your_flow');
const FLOW_HANDLERS = {
  insurance: InsuranceFlow,
  lab: LabFlow,
  rental: RentalFlow,
  your_type: YourFlow,   // ← أضف هنا
};
```
4. أنشئ شريك بـ `flow_type: "your_type"` عبر API

---

## 🏗️ النشر على Railway

```bash
# ثبّت Railway CLI
npm i -g @railway/cli

# سجل الدخول وانشر
railway login
railway init
railway up

# أضف متغيرات البيئة
railway variables set DATABASE_URL=...
railway variables set WA_ACCESS_TOKEN=...
```

---

## 📊 قاعدة البيانات (Supabase)

| الجدول | الوصف |
|--------|-------|
| `partners` | الشركاء مع إعداداتهم |
| `users` | مستخدمو واتساب |
| `sessions` | حالة المحادثات |
| `messages` | سجل كل الرسائل |
| `leads` | الطلبات المكتملة |
| `analytics_daily` | إحصائيات يومية |

---

## ⚠️ نصائح مهمة

- لا تشارك `WA_ACCESS_TOKEN` أبداً
- استخدم Permanent Token بدل Temporary
- الـ webhook يجب أن يكون HTTPS
- Meta تنتظر 200 خلال 5 ثواني — لا تعالج الرسالة قبل الرد
- 24 ساعة window — بعدها استخدم Message Templates فقط

---

## 💰 إضافة شريك جديد في الإنتاج

```bash
curl -X POST https://your-domain.com/api/partners \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"شريك جديد","slug":"new_partner","flow_type":"insurance","plan":"starter"}'
```

ثم أعطِ الشريك الرابط: `https://wa.me/YOURPHONE?start=new_partner`

**لا يوجد أي كود تغييره — النظام يعمل تلقائياً.**
