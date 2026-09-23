# گزارش موج ۲: کارتهای هاب تماشا؛ هنر دیفالت + پلیر همیشه حاضر — ۲۰۲۶-۰۹-۲۳

## چه افزوده شد
- **کامپوننت `Cover` در `watch-hub.tsx`** با الگوی `WATCH_DEFAULT_ART`:
  - بر اساس `kind` تصویر دیفالت باندلشده انتخاب میشود: MOVIE→`/defaults/images/movie.png`، SERIES→`video.png`، CARTOON→`media.png`، ANIME→`video.png`
  - وقتی عنوان هنری ندارد، تصویر دیفالت نشان داده میشود + کلاس `anime-card-art-default` سمت کامپوننت
  - خروجی خالص `watch-catalog` تغییری نکرد (fallback فقط در لایهٔ نمایش است)
- **پلیر همیشه حاضر** در `playMovie`/`playEpisode`: اگر منبع ویدیو در دسترس نبود، به `/defaults/videos/demo.mp4` (باندل/کامیتشده) fallback میشود؛ دکمههای جزئیات برای همهٔ kindها (از جمله ANIME) همیشه فعالاند
- **همهٔ اپیزودها قابل پخش**: حذف نشان «بهزودی» — هر اپیزود بدون ویدیو هم با demo پخش میشود
- **پولیش CSS در `anime-hub.css`**:
  - گرادیان overlay پایین کارت روی هنر دیفالت (`.anime-card-art-default::after`)
  - badge آیکن شیشهای پایین-راست (`.anime-card-art-default .anime-card-placeholder`)
  - hover zoom نرم تصویر هنر (`.anime-card:hover .anime-card-art img`)

## چه تست شد
- ✅ `npx tsc --noEmit` — صفر خطا
- ✅ `npm run test` — ۱۱۷/۱۱۷ پاس
- ✅ `npm run build` — موفق
- ✅ مسیرهای `/defaults/images/*` و `/defaults/videos/demo.mp4` در `public/defaults` موجود و کامیتشدهاند (برخلاف آپلودها، بعد از deploy نمیمیرند)

## چه باقی ماند / گام بعد
- ⏳ تأیید زنده: عنوان بدون تصویر → گرافی دیفالت متناسب kind؛ عنوان بدون ویدیو → پخش demo
- ⏳ موج بعد: پروفایل عمیقتر (موج ۳)

## واژهنامهٔ موج
| واژه | معنا |
|---|---|
| kind | نوع عنوان (MOVIE/SERIES/CARTOON/ANIME) |
| default art | تصویر باندلشده در `/public/defaults` که جایگزین هنر گمشده میشود |
| fallback نمایشی | جایگزینی فقط در لایهٔ UI؛ خروجی API دستنخورده میماند |
| hero item | عنوان برگزیده در بالای هاب تماشا |