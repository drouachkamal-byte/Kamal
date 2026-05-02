# 🚀 دليل النشر الكامل — BotFlow Platform
# Railway + Supabase + Meta WhatsApp API
# من الصفر للإنتاج في 3 ساعات

---

## 📋 المتطلبات المسبقة

- حساب GitHub (مجاني)
- حساب Supabase (مجاني) — supabase.com
- حساب Railway (مجاني بداية) — railway.app
- حساب Meta Developer — developers.facebook.com
- حساب Stripe — stripe.com
- رقم هاتف جديد لواتساب (لا يُستخدم مسبقاً في واتساب)

---

## الخطوة 1 — إعداد Supabase (قاعدة البيانات)

### 1.1 إنشاء المشروع
```
1. اذهب إلى supabase.com → New Project
2. اختر اسم المشروع: botflow-prod
3. اختر كلمة مرور قوية (احفظها!)
4. اختر المنطقة الأقرب لك (مثلاً: Frankfurt لمنطقة الخليج)
5. انتظر 2 دقيقة حتى يكتمل الإنشاء
```

### 1.2 جلب بيانات الاتصال
```
Project Settings → Database → Connection String → URI
انسخ الرابط ويكون مثل:
postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

### 1.3 تشغيل الـ Migration
```bash
# في مجلد المشروع المحلي:
DATABASE_URL="postgresql://..." node src/db/migrate.js
DATABASE_URL="postgresql://..." node src/db/seed.js

# يجب أن ترى:
# ✅ All tables created successfully!
# ✅ Partner: شركة الحياة للتأمين (insurance_alhaya)
```

### 1.4 التحقق في Supabase Dashboard
```
اذهب لـ Table Editor وتأكد من وجود الجداول:
✅ partners
✅ users
✅ sessions
✅ messages
✅ leads
✅ analytics_daily
```

---

## الخطوة 2 — إعداد Meta WhatsApp API

### 2.1 إنشاء التطبيق
```
1. اذهب developers.facebook.com → My Apps → Create App
2. اختر: Business → Continue
3. اسم التطبيق: BotFlow (أو أي اسم)
4. بريدك الإلكتروني → Create App
```

### 2.2 إضافة WhatsApp
```
1. في لوحة التطبيق → Add Products → WhatsApp → Set up
2. اختر Business Account (أنشئ واحداً إذا لم يكن لديك)
3. أضف رقم الهاتف الجديد للتحقق
```

### 2.3 جلب البيانات المطلوبة
```
WhatsApp → API Setup:

✅ Phone Number ID:  (انسخه — يبدأ بأرقام مثل 123456789)
✅ Access Token:     (انسخ Temporary Token الآن، سنحوله لـ Permanent)

لتحويله لـ Permanent Token:
1. اذهب Business Settings → System Users → Add
2. أنشئ System User باسم botflow-system
3. أعطه Full Control على التطبيق
4. Generate Token → اختر التطبيق → اختر whatsapp_business_messaging
5. انسخ الـ Token الجديد (لا ينتهي)
```

### 2.4 اختبار الإرسال
```bash
curl -X POST \
  "https://graph.facebook.com/v18.0/YOUR_PHONE_ID/messages" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "+966501234567",
    "type": "text",
    "text": { "body": "✅ BotFlow يعمل!" }
  }'

# إذا وصلت الرسالة = كل شيء تمام
```

---

## الخطوة 3 — رفع الكود على GitHub

```bash
# في مجلد المشروع:
git init
git add .
git commit -m "Initial BotFlow setup"

# أنشئ repo جديد في github.com ثم:
git remote add origin https://github.com/USERNAME/botflow.git
git branch -M main
git push -u origin main
```

---

## الخطوة 4 — النشر على Railway

### 4.1 ربط GitHub
```
1. اذهب railway.app → New Project
2. Deploy from GitHub repo → اختر botflow
3. انتظر الـ build الأول (2-3 دقائق)
```

### 4.2 إضافة متغيرات البيئة
```
في Railway → Variables → Add All:

DATABASE_URL        = postgresql://... (من Supabase)
WA_PHONE_NUMBER_ID  = 123456789 (من Meta)
WA_ACCESS_TOKEN     = EAAxxxxx (الـ Token الدائم)
WA_VERIFY_TOKEN     = botflow_webhook_2025 (أي نص سري)
WA_API_VERSION      = v18.0
PLATFORM_API_KEY    = bf_prod_your_secret_key_here
PLATFORM_NAME       = BotFlow
PORT                = 3000
NODE_ENV            = production
STRIPE_SECRET_KEY   = sk_live_xxxxx
STRIPE_WEBHOOK_SECRET = whsec_xxxxx
STRIPE_PRICE_STARTER    = price_xxxxx
STRIPE_PRICE_GROWTH     = price_xxxxx
STRIPE_PRICE_ENTERPRISE = price_xxxxx
APP_URL             = https://your-app.railway.app
```

### 4.3 الحصول على الـ URL
```
Railway → Settings → Domains → Generate Domain
ستحصل على: https://botflow-production-xxxx.up.railway.app

أو أضف domain خاص:
Settings → Custom Domain → botflow.yourdomain.com
```

### 4.4 التحقق من النشر
```bash
curl https://your-app.railway.app/health

# المتوقع:
{
  "status": "ok",
  "platform": "BotFlow",
  "timestamp": "2025-05-02T...",
  "uptime": "43s"
}
```

---

## الخطوة 5 — ربط Webhook مع Meta

### 5.1 إعداد الـ Webhook
```
1. Meta Developer Console → WhatsApp → Configuration
2. Webhook → Edit:
   Callback URL: https://your-app.railway.app/webhook
   Verify Token: botflow_webhook_2025 (نفس WA_VERIFY_TOKEN)
3. اضغط Verify and Save
4. إذا نجح = يظهر ✅ Verified
```

### 5.2 الاشتراك في الأحداث
```
Webhook Fields → اشترك في:
✅ messages
✅ messaging_postbacks
✅ message_deliveries
✅ message_reads
```

### 5.3 اختبار الـ Webhook
```
1. أرسل رسالة "مرحباً" للرقم المسجل
2. راجع Railway Logs
3. يجب أن ترى:
   📩 Message from +966XXXXXXXXX: "مرحباً"
```

---

## الخطوة 6 — إعداد Stripe

### 6.1 إنشاء الباقات
```
1. اذهب dashboard.stripe.com → Products → Add Product
2. أنشئ 3 باقات:

BotFlow Starter:
  - Price: $99/month recurring
  - Copy the Price ID: price_xxxxx → ضع في STRIPE_PRICE_STARTER

BotFlow Growth:
  - Price: $299/month recurring
  - Copy the Price ID → ضع في STRIPE_PRICE_GROWTH

BotFlow Enterprise:
  - Price: $799/month recurring
  - Copy the Price ID → ضع في STRIPE_PRICE_ENTERPRISE
```

### 6.2 إعداد Stripe Webhook
```
Stripe Dashboard → Developers → Webhooks → Add Endpoint:
  URL: https://your-app.railway.app/api/billing/webhook
  Events:
    ✅ checkout.session.completed
    ✅ invoice.payment_succeeded
    ✅ invoice.payment_failed
    ✅ customer.subscription.deleted
    ✅ customer.subscription.updated

انسخ Webhook Secret → ضع في STRIPE_WEBHOOK_SECRET
```

### 6.3 إعداد Stripe Customer Portal
```
Stripe → Settings → Billing → Customer Portal → Activate
```

---

## الخطوة 7 — اختبار نهائي شامل

### 7.1 إضافة أول شريك
```bash
curl -X POST https://your-app.railway.app/api/partners \
  -H "x-api-key: YOUR_PLATFORM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "شركة الحياة للتأمين",
    "slug": "insurance_test",
    "flow_type": "insurance",
    "plan": "growth",
    "config": {
      "branding": {
        "welcome_message": "👋 أهلاً بك في شركة الحياة!"
      },
      "services": ["car", "health"]
    }
  }'

# ستحصل على:
# { "whatsapp_link": "https://wa.me/...?start=insurance_test", "qr_code": "..." }
```

### 7.2 اختبار المحادثة
```
1. افتح الرابط على هاتفك
2. أرسل أي رسالة
3. يجب أن يرد البوت بقائمة الخدمات
4. اكمل المحادثة كاملاً
5. تحقق في Supabase → Table Editor → leads (يجب أن يظهر طلبك)
```

### 7.3 اختبار الدفع
```
1. افتح: https://your-app.railway.app/api/billing/checkout
2. أرسل POST مع partner_id و plan="growth"
3. ستحصل على checkout_url
4. افتح الرابط واستخدم بطاقة Stripe التجريبية: 4242 4242 4242 4242
```

---

## 📊 مراقبة المنصة

### Railway Logs
```
railway logs --tail   # مباشر
railway logs          # كل اللوغز
```

### Supabase Monitoring
```
Supabase → Database → Performance
```

### إضافة Uptime Monitor (مجاني)
```
uptimerobot.com → Add New Monitor:
  Type: HTTP(s)
  URL: https://your-app.railway.app/health
  Interval: 5 minutes
```

---

## 💰 تكاليف التشغيل الشهرية

| الخدمة       | الخطة     | التكلفة      |
|-------------|-----------|-------------|
| Railway     | Starter   | $5/شهر      |
| Supabase    | Free      | $0          |
| Meta WA API | Free tier | $0 (أول 1000 محادثة) |
| Stripe      | Per txn   | 2.9% + $0.30|
| Domain      | أي مزود    | $10/سنة      |
| **المجموع** |           | **~$15/شهر** |

**الإيرادات عند 10 شركاء × $299 = $2,990/شهر**
**صافي الربح: $2,975 (99.5% هامش ربح)**

---

## 🆘 أكثر المشاكل شيوعاً وحلولها

### ❌ Webhook لا يتحقق
```
تأكد أن:
1. URL صحيح: https://... (ليس http)
2. WA_VERIFY_TOKEN نفسه في Meta وفي Railway
3. السيرفر يعمل (تحقق من /health)
```

### ❌ البوت لا يرد
```
1. تحقق من Railway Logs للأخطاء
2. تأكد أن WA_ACCESS_TOKEN صحيح وغير منتهي
3. تأكد من الاشتراك في Webhook Fields → messages
```

### ❌ قاعدة البيانات لا تتصل
```
1. تأكد من DATABASE_URL صحيح في Railway
2. في Supabase → Settings → Database → تأكد من Allow connections from Railway IPs
   أو أضف 0.0.0.0/0 في trusted IPs مؤقتاً للاختبار
```

### ❌ مستخدم جديد لا يُعرف مصدره
```
المستخدم لم يأتِ عبر رابط الشريك.
الحل: أرسله للرابط الصحيح أو استخدم Keyword fallback
```

---

## ✅ Checklist قبل الإطلاق

- [ ] Supabase: الجداول منشأة وتعمل
- [ ] Meta: رقم موثق + Token دائم
- [ ] Webhook: محقق في Meta
- [ ] Railway: السيرفر يعمل `/health`
- [ ] اختبار محادثة كاملة من البداية للنهاية
- [ ] Stripe: الباقات منشأة + Webhook يعمل
- [ ] أول شريك مضاف + رابطه يعمل
- [ ] Uptime Monitor مفعّل
- [ ] نسخ احتياطي لـ .env في مكان آمن

---

**🎉 تهانينا! منصتك جاهزة للإطلاق.**

للدعم التقني: راجع Railway Logs أولاً، ثم Supabase Logs.
