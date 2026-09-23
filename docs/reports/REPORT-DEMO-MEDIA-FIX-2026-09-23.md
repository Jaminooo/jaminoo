# گزارش موج: تعمیر رسانهٔ دمو (بکت مسدود گوگل) — ۲۰۲۶-۰۹-۲۳

## چه افزوده شد
- `DEMO_MEDIA_REPLACEMENTS` + `demoMediaUrl(file)` در `server.js`: نگاشت فایلهای قدیمی (BigBuckBunny/Sintel/ElephantsDream/TearsOfSteel/Subaru/ForBigger*) به آینههای عمومی پایدار:
  - jsDelivr (`mediaelement-files`)، MDN GitHub Pages، MDN interactive-examples، w3schools
  - همه با پشتیبانی `Range` (206) و `content-type: video/mp4`
- `repairDemoMediaUrls()` در `server.js` که هر boot اجرا میشود:
  - ردیفهای `CinemaVideo` / `AnimeEpisode` / `VideoPost` که `externalUrl` آنها هنوز شامل `gtv-videos-bucket` است را به URL جدید بازنویسی میکند
  - idempotent است (بعد از اولین پاس، الگو دیگر match نمیشود)
  - هرگز URL کاربر/ادمین را لمس نمیکند (فقط فایلهای شناختهشدهٔ نگاشت)
- seedها (سینما/کارتون/انیمه/ویدیوهاب) بهجای `DEMO_MEDIA_BASE + file` از `demoMediaUrl(file)` استفاده میکنند (با fallback به بکت قدیمی برای فایلهای ناشناخته)

## ریشهٔ مشکل
- بکت `commondatastorage.googleapis.com/gtv-videos-bucket/sample/` برای مناطق تحریمشده **403 با پیام «not available in your location»** برمیگرداند (Geo-block در سطح گوگل، نه مشکل شبکه)
- از دو مسیر شبکهٔ مستقل تأیید شد (fetch محلی + webfetch) و با فایل کنترل (w3schools → 206) کالیبره شد که شبکه سالم است
- یعنی در مرورگر کاربر هم هیچ عنوان دمویی پخش نمیشد (پلیر باز میشد ولی `<video>` خطا میگرفت)

## چه تست شد
- ✅ هر ۹ URL نهایی نگاشتشده از منطقهٔ متأثر: `206 video/mp4` + `accept-ranges: bytes`
- ✅ `node --check server.js` — سینتکس سالم
- ✅ `npx tsc --noEmit` — صفر خطا
- ✅ `npm run test` — ۱۱۲/۱۱۲ پاس
- ✅ `npm run build` — موفق
- ✅ بازنویسی idempotent با شبیهسازی جلوتر از DB بررسی شد و گارد شد (فقط فایلهای شناختهشده بازنویسی میشوند)

## چه باقی ماند / گام بعد
- 🟢 deploy خودکار روی Render با push این ریپو: در اولین boot بعد از دیپلوی، `repairDemoMediaUrls()` ردیفهای موجود را اصلاح میکند
- ⏳ تأیید زنده توسط کاربر: انتخاب یک عنوان در هاب تماشا → «پخش برای من» → ویدیو باید واقعاً پخش شود (بعد از دیپلوی)
- ⏳ موجهای موکولشده قبلی بدون تغییر: جستجوی سراسری ⌘K، زیرساخت تست یکپارچه/CI
- وضعیت فعلی: دکمهٔ گوگل تأییدشده نمایش داده میشود؛ ورود کامل گوگل و پخش ویدیو در انتظار تأیید زندهٔ کاربر است

## واژه‌نامهٔ موج
| واژه | معنا |
|---|---|
| Geo-block | مسدودسازی جغرافیایی سمت سرویسدهنده (گوگل برای مناطق تحریم) |
| mirror | آینهٔ عمومی همان محتوا روی هاست دیگر که از منطقه در دسترس است |
| idempotent repair | بازنویسیای که بعد از یک بار اجرا دیگر تکرار نمیشود (الگو match نمیشود) |
| Range request | درخواست بخشی از فایل (پشتیبانی 206) — لازمهٔ seek و پخش روان |