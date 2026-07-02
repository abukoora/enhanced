# رحلة الحياة الزوجية — PWA

منصة تعليمية تفاعلية بأربع مراحل (ما قبل الخطوبة، الخطوبة، حديثو الزواج، الاستقرار الأسري)، مبنية بـ HTML/CSS/JS خالص (بدون أي إطار عمل) + Supabase، وجاهزة للعمل كتطبيق PWA على الكمبيوتر والجوال والتابلت.

## 📁 محتويات المشروع
```
index.html            الصفحة الرئيسية (كل الشاشات داخلها)
manifest.json          إعدادات PWA
service-worker.js       العمل دون اتصال
schema.sql              قاعدة البيانات الكاملة (نفّذها في Supabase أولاً)
css/                    التصميم (متغيرات، تخطيط، مكوّنات)
js/                     منطق التطبيق (مقسّم بوحدات ES Modules)
assets/icons/           أيقونات التطبيق
```

## 🚀 خطوات التشغيل (3 خطوات فقط)

### 1) قاعدة البيانات (Supabase)
1. أنشئ مشروعاً جديداً على [supabase.com](https://supabase.com)
2. اذهب إلى **SQL Editor** والصق محتوى ملف `schema.sql` كاملاً ثم شغّله
3. من **Settings → API** انسخ: `Project URL` و `anon public key`

### 2) الإعدادات
افتح `js/config.js` وعدّل:
```js
SUPABASE_URL: "https://xxxx.supabase.co",
SUPABASE_ANON_KEY: "eyJhbGciOi...",
WHATSAPP_DEFAULT_NUMBER: "201000000000", // بصيغة دولية بدون + أو صفر
```

### 3) الرفع والنشر (GitHub + Netlify)
```bash
git init
git add .
git commit -m "أول نسخة من منصة رحلة الحياة الزوجية"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```
ثم في [Netlify](https://app.netlify.com):
1. **Add new site → Import an existing project → GitHub**
2. اختر المستودع (لا حاجة لأي أمر Build، الموقع Static بالكامل)
3. Publish directory: اتركه فارغاً أو `.`
4. اضغط **Deploy**

بعد أول نشر، أي `git push` جديد سيُحدّث الموقع تلقائياً.

## ➕ إضافة محتوى تعليمي (دروس)
من Supabase → **Table Editor → contents** أضف صفاً جديداً:
| title | body | stage | category | gender | order |
|---|---|---|---|---|---|
| عنوان الدرس | نص الدرس الكامل | `pre_engagement` | تواصل | `both` | 1 |

## 👤 تعيين مستخدم كمشرف (Supervisor)
من **Table Editor → profiles** غيّر `is_supervisor` إلى `true` للمستخدم المطلوب (لا يمكن فعل هذا من الواجهة لأسباب أمنية).

## 🔒 ملاحظات أمنية مطبَّقة
- كل الحماية عبر **Row Level Security** في قاعدة البيانات، وليس فقط في الواجهة
- تعقيم كل نص يدخله المستخدم قبل عرضه (`js/utils/sanitize.js`) لمنع XSS
- المذكرات الخاصة محمية بسياسة RLS لا تسمح حتى للمشرف برؤيتها
- روابط واتساب تمر عبر `sanitizeUrl()` قبل تفعيلها

## 📱 PWA
- يعمل دون اتصال بالإنترنت (يعرض آخر الدروس المحفوظة)
- قابل للتثبيت على الشاشة الرئيسية (كمبيوتر، أندرويد، آيفون)
- متجاوب بالكامل: عمود واحد على الجوال، عمودان على التابلت، ثلاثة أعمدة + قائمة جانبية على الكمبيوتر
