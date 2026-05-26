# Expert Medical Chat Evaluation

واجهة ويب لتقييم محادثات نظام الشات بوت الطبي متعدد الوكلاء — مخصصة للأطباء الخبراء.

## التشغيل

```bash
pip install -r requirements.txt
python run.py
```

افتح: http://127.0.0.1:8765

## التقنيات

- FastAPI + SQLAlchemy + SQLite (`hospital.db`)
- HTML / CSS / JavaScript

## الأقسام

| القسم | Session IDs |
|-------|-------------|
| طب الأعصاب | 157–177 |
| طب العيون | 178–197 |
| ENT | 198–217 |
| الجهاز الهضمي | 219–238 |
| أمراض الصدر | 239–258 |
