# Jamino — استاندارد توسعهٔ پلتفرم حرفهای

هر تغییری در این ریپو باید این استانداردها را رعایت کند.

## ۱) تعریف «تمام‌شده» (Definition of Done)
یک فیچر تمام‌شده است اگر و فقط اگر همهٔ این‌ها برقرار باشد:
- [ ] با معماری موجود هماهنگ است (Next.js 15 App Router، React 19، TS strict، Prisma/PostgreSQL، Socket.IO، Zustand، Tailwind v4)
- [ ] منطق خالص → unit test در `src/lib/__tests__`
- [ ] هر endpoint جدید → integration test (اگر زیرساخت نیست، اول بساز: `tests/api/` + vitest config)
- [ ] `npx tsc --noEmit` صفر خطا
- [ ] `npm run test` پاس
- [ ] `npm run build` موفق
- [ ] هر endpoint حساس rate limiting دارد (از `src/lib/rate-limit.ts`)
- [ ] هیچ خطای ۵۰۰ بی‌لاگ نمی‌ماند؛ catch + log + پاسخ مناسب
- [ ] در گزارش موج ثبت شد

## ۲) پروتکل موج‌ها (Wave Protocol)
کار را به موج‌های کوچک تقسیم کن (هر موج ۱ تا ۳ فیچر مرتبط).
انتهای هر موج:
1. اجرای کامل: تست + تایپ‌چک + build
2. ثبت `docs/reports/REPORT-<موج>-<تاریخ>.md` با این بخش‌ها: چه افزوده شد / چه تست شد / چه باقی ماند / گام بعد
3. ابتدای موج بعد: اول رفع باگ‌های موج قبل، بعد فیچر جدید

## ۳) اولویت‌های فنی مداوم (تا تکمیل کامل)
1. زیرساخت تست و CI — شکاف فعلی: هیچ CI نیست، تست یکپارچه صفر است، health endpoint ندارد
   - موج ۱: `src/app/api/health/route.ts` + `scripts/smoke.mjs` + `.github/workflows/ci.yml` (typecheck + test + build + lint روی هر push/PR)
   - موج ۲: ۲۰+ تست یکپارچه برای: auth/login، sessions، profile، tweets CRUD، jams join/leave
2. مشاهده‌پذیری: endpoint سلامت، لاگ ساختاریافته، شمارش آنلاین/خطا
3. امنیت تکمیلی: ۲FA/TOTP اختیاری + لاگ ممیزی برای: بن کاربر، حذف محتوا، تغییر نقش، لاگین ادمین
4. مستندات عملیاتی: `docs/RUNBOOK.md`، `docs/DEPLOY.md`، `docs/ROLLBACK.md` + اسکریپت بکاپ
5. اسکریپت عملیاتی smoke test برای بوت کامل: لاگین + یک چرخهٔ اصلی + سلامت

## ۴) استاندارد کد
- پیام کامیت: `feat(...)` / `fix(...)` / `test(...)` / `docs(...)`
- هیچ رازی در کد یا کامیت؛ همه از env (الگوی `.env.example`)
- نظرات کوتاه و معنادار؛ بدون نظر تزئینی
- ریسپانسیو و RTL/LTR دولزبانه را نشکن
- بعد هر موج، یک واژه‌نامهٔ کوتاه از تغییرات در گزارش موج بنویس