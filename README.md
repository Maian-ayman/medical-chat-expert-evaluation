# Expert Medical Chat Evaluation

واجهة ويب لتقييم محادثات نظام الشات بوت الطبي متعدد الوكلاء — مخصصة للأطباء الخبراء.

## التشغيل

```bash
pip install -r requirements.txt
python run.py
```

افتح: http://127.0.0.1:8765

## التقنيات

- FastAPI + SQLAlchemy
- **PostgreSQL** (Render / production) — التقييمات والمحادثات تبقى محفوظة
- **SQLite** (`hospital.db`) — للتطوير المحلي فقط إذا لم تُضبط `DATABASE_URL`

## ربط PostgreSQL (مرة واحدة)

1. أنشئي قاعدة على PostgreSQL (مثلاً اسمها `hospital`)
2. في Render → Environment → أضيفي:
   `DATABASE_URL` = رابط PostgreSQL من Render (Internal Database URL)
3. **تلقائياً:** عند أول تشغيل على Render (مع `DATABASE_URL`)، التطبيق ينسخ المحادثات من `hospital.db` إلى PostgreSQL إذا كانت مفقودة.

   أو يدوياً من جهازك:

```powershell
cd "c:\Users\maian\Downloads\dr web"
pip install -r requirements.txt
$env:DATABASE_URL = "postgresql+psycopg2://USER:PASSWORD@HOST:5432/hospital"
python scripts/migrate_to_postgres.py
```

تحققي: `https://YOUR-APP.onrender.com/api/health` — يجب أن يظهر `chat_messages` حوالي **3648**.

بعدها كل التقييمات والمحادثات تُقرأ وتُحفظ من PostgreSQL — وملف CSV يعمل من التقييمات المحفوظة.
- HTML / CSS / JavaScript

## الأقسام

| القسم | Session IDs |
|-------|-------------|
| طب الأعصاب | 157–177 |
| طب العيون | 178–197 |
| ENT | 198–217 |
| الجهاز الهضمي | 219–238 |
| أمراض الصدر | 239–258 |
