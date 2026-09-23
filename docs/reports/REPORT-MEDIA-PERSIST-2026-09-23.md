# گزارش موج ۵: ماندگاری آپلودها بعد از اسلیپ Render — ۲۰۲۶-۰۹-۲۳

## چه افزوده شد
- **فیلد `Media.data Bytes?`** در `prisma/schema.prisma` + مهاجرت «خودکار با deploy»:
  - `prisma/migrations/20260923_media_db_persist/migration.sql` → `ALTER TABLE "Media" ADD COLUMN "data" BYTEA;`
  - چون استارت Render = `npx prisma migrate deploy && node server.js`، همین فایل در اولین restart/دیپلوی اعمال میشود
- **هلپر `src/lib/media-store.ts`**:
  - `shouldPersistMediaBytes(size, mime)` — منطق خالص: فقط payloadهای ۱ تا ۵ مگابایت و غیر-ویدیو
  - `persistMediaBytes(id, buf, mime)` — mirror best-effort در Postgres؛ هرگز throw نمیکند تا جریان آپلود مختل نشود
- **اتصال به همهٔ نقاط آپلود تصویر/صدا**:
  - `POST /api/media` (عکسهای پروفایل/بنر/پست) — سقف ۵MB → همیشه در DB ذخیره میشود
  - `POST /api/tweets/assets` و `POST /api/video/assets` (تصاویر ≤۵MB)
  - `storeVoice` در `src/lib/messages.ts` (نوت صوتی ≤۳MB)
  - ویدیوهای ۱۰۰MB عمداً **فقط روی دیسک** میمانند (جایشان در DB رایگان نیست) و fallback باندلشدهٔ قبلی روی سرو شدن حفظ است
- **سروینگ `GET /api/media/[id]`**:
  - اگر `media.data` موجود باشد → بایت از Postgres سرو میشود (همان منطق Range/206 قبلی)
  - در غیر این صورت دیسک؛ و اگر فایل پاک شده باشد → fallback باندلشده (رفتار قبلی حفظ شد)
- **تست واحد** `src/lib/__tests__/media-store.test.ts` — ۵ تست منطق خالص

## چه تست شد
- ✅ `src/lib/__tests__/media-store.test.ts` — ۵/۵ (مرز سایز، فیلتر mime ویدیو، payload خالی)
- ✅ `npx tsc --noEmit` — صفر خطا
- ✅ `npm run test` — ۱۲۲/۱۲۲ پاس
- ✅ `npm run build` — موفق
- ✅ `npx prisma generate` بعد از تغییر schema (کلاینت `data` را میشناسد)
- ✅ سازگاری نوع Prisma 6 (Bytes → `Uint8Array<ArrayBuffer>`) با کپی در بافر جدید

## چه باقی ماند / گام بعد
- ⏳ deploy: با push این موج، مهاجرت روی Render اعمال میشود؛ از آن به بعد آپلودهای جدید تصویر/صدا بعد از اسلیپ زنده میمانند (آپلودهای قبلی که قبلاً پاک شدهاند قابل بازیابی نیستند)
- ⏳ اگر حجم DB بالا رفت: انتقال به استوریج خارجی (R2/S3) برای همهٔ سایزها
- ⏳ پس از موجهای UI: زیرساخت تست یکپارچه/CI طبق AGENTS.md (health endpoint، ۲۰+ تست یکپارچه)

## واژهنامهٔ موج
| واژه | معنا |
|---|---|
| ephemeral disk | دیسک موقتی هاست; با اسلیپ/redeploy پاک میشود (Render رایگان) |
| mirror / DB persist | ذخیرهٔ کپی بایت در Postgres تا از پاکشدن دیسک در امان بماند |
| BYTEA | نوع باینری PostgreSQL برای نگهداری بایتخام |
| Range / 206 | سرو بخشی از فایل — لازمهٔ seek ویدیو |
| best-effort | تلاش بدون تضمین; failure سر راه آپلود را نمیگیرد |
| shadow/migration deploy | اعمال خودکار فایلهای migration در استارت |