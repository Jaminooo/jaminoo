# گزارش موج ۷ — بازطراحی نتفلیکسی هاب تماشا (Rails + مگامنو + هیرو)

تاریخ: ۲۰۲۶-۰۹-۲۴ ‏| وضعیت: تکمیل‌شده ✔

## چه افزوده شد

### منطق خالص `src/lib/watch-catalog.ts` (خروجی توابع قبلی دست‌نخورده)
- `buildNewRails(items, limit)` — دو ریل «انیمه‌های تازه» و «فیلم‌ها/سریال‌های تازه» از روی کاتالوگ یکتا (تفکیک `source`)
- `buildGenreRails(items, {min, maxRails, limit})` — ریل‌های ژانر بر پایهٔ فراوانی هر ژانر (مرتب‌سازی نزولی)
- `buildCategoryRails(items, limit)` — ریل‌های دسته‌بندی فیلم / انیمه / کارتون
- `buildHeroPicks(items, limit)` — عنوان‌های ویژهٔ هیرو (روتیت)
- `genreCounts(items)` — تالی ژانر برای مگامنو (با شکست مساوی الفبایی)
- تست واحد: `src/lib/__tests__/watch-catalog-rails.test.ts` — **۱۲ تست پاس**

### صفحهٔ اصلی هاب (نسخهٔ نتفلیکسی)
- **اسلایدر ژانر بالای صفحه**: ریل افقی «انیمه‌های تازه» (اطلاع از استودیوها) + «فیلم‌ها و سریال‌های تازه» (تازه در سالن) — اسکرول افقی با `scroll-snap`
- **دسته‌بندی پایین‌تر**: ریل‌های فیلم / انیمه / کارتون («جست‌وجو بر اساس نوع»)
- **دنیای ژانرها**: ریل‌های ژانر محبوب در ادامه
- قفسه‌های گزینش‌شدهٔ قبلی (featured / fresh / airing) زیر ریل‌ها حفظ شد
- هیرو با **اسپات‌لایت چرخان**: پیک‌های `buildHeroPicks` هر ۷ ثانیه می‌چرخد + دکمه‌های قبل/بعد و نقطه‌های ناوبری
- **مگامنو «مرور ژانرها»**: پنلی با دسته‌بندی‌ها (فیلم/سریال/انیمه/کارتون) + تمام ژانرها همراه تالی هر ژانر؛ کلیک روی ژانر → فیلتر کاتالوگ
- کارت ریل: پوستر + نشان نوع + پخش سریع؛ کلیک → سالن تماشا

### CSS (anime-hub.css)
- `.anime-rail` / `.anime-rail-track` / `.anime-rail-card` — اسکرول‌بار نازک، hover لطیف، snap
- `.anime-mega` / `.anime-mega-col` / `.anime-mega-link` / `.anime-mega-chip` / `.anime-mega-grid` — پنل مگامنو با انیمیشن ورود
- ریسپانسیو: ≤900px ستون‌بندی مگامنو، ≤640px یک‌ستونه + کارت‌های باریک‌تر

### ترجمه
- کلیدهای `watch.newAnime*`، `watch.newFilms*`، `watch.category*`، `watch.genreKicker`، `watch.browseGenres`، `watch.mega*`، `watch.previousFeatured`/`nextFeatured`/`showFeaturedTitle` در `fa.json` و `en.json`

## چه تست شد
- `npx vitest run src/lib/__tests__/watch-catalog-rails.test.ts` — ۱۲/۱۲ پاس
- `npm run test` — ۱۴ فایل / ۱۴۷ تست همگی پاس
- `npx tsc --noEmit` — صفر خطا
- `npm run build` — موفق (پس از پاک‌سازی cache بشکهٔ قبلی خطای `Cannot find module` برطرف شد)
- مسیر `/watch/[source]/[id]` در خروجی build ثبت شد

## چه باقی ماند
- تأیید زندهٔ Render با `queuetest.js` روی `https://jaminoo.onrender.com` (نیاز VPN)
- شبکه‌سازی نهایی localStorage پخش (بازیابی موقعیت) در سالن تماشا

## گام بعد
- اجرای `queuetest.js` با VPN روی Render و تأیید جریان کامل: لاگین → هاب → سالن → انتخاب فصل/کیفیت → پخش.

## واژه‌نامهٔ موج
| واژه | معنی |
|---|---|
| WatchRail | ریل افقی عنوان‌ها با اسکرول اسنپ |
| Mega-menu | پنل مرور دسته‌بندی/ژانر با تالی |
| Hero spotlight | اسپات‌لایت چرخان هیرو |
| Genre tally | شمار عنوان‌ها در هر ژانر |