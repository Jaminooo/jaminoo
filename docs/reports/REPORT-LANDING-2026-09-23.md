# گزارش موج ۴: یک لندینگ واحد و بسیار زیبا — ۲۰۲۶-۰۹-۲۳

## چه افزوده شد
- **پاکسازی وضعیت «دو لندینگ»**: در واقع یک کامپوننت (`landing-page.tsx`) با **دو جهت طراحی درهم** وجود داشت — نیمهٔ قدیمی (bento/hero-blob) در CSS کنار نیمهٔ جدید (hero-stage/feature-card)؛ ظاهر نتیجهٔ نهایی ترکیبی و ناهماهنگ بود. کل بخش لندینگ در `landing-creator.css` (خطوط ۱–۴۲۱) بازنویسی شد و استایلهای اپ (creator studio و… از خط ۴۲۳ به بعد) دستنخورده ماندند.
- **بازطراحی کامل `landing-page.tsx`** به یک طراحی منسجم:
  - پسزمینهٔ امبینت: گرید ظریف + دو blob متحرک + صفحهٔ ناوبری شیشهای sticky
  - **هیرو**: kicker با پالس زنده، تیتر گرادیانی بزرگ، استیج انیمیتشدهٔ CSS (mascot داخل حلقهٔ شناور + کارتهای شناور «جم خصوصی» و «گوشدادن هماهنگ» با EQ زنده) + ردیف اعتماد (اثبات اجتماعی)
  - **ریل محصولات**: چهار چیپ Community/Music/Video/Cinema + نشان «یک حساب متصل»
  - **بنتو ویژگیها**: سه کارت با mock مینیاتوری زنده (حباب چت / EQ موسیقی / تامبنیل ویدیو) + دو چیپ کوچک «سریع» و «حریم خصوصی»
  - **چطور کار میکند**: ۳ قدم با ماسکوتها و hover
  - **دموی زنده**: پخش ویدیوی واقعی `/defaults/videos/demo.mp4` با بج preview
  - **CTA پایانی**: پنل گرادیانی «انتظار میکشد/آدمهایت را بیاور» + استیج آرتورکت با چیپهای محصولات شناور
  - **فوتر** تمیز با back-to-top
- **ترجمهها**: دو کلید کوچک جدید `landing.fast` و `landing.privacy` (fa/en)؛ بقیه از کلیدهای موجود `landing.*` استفاده شد که قبلاً بلااستفاده بودند
- **RTL**: مسیرهای منطقی (inset-inline)، flip آیکن با `.icon-rtl` و فونت Tahoma در حالت فارسی حفظ شد
- **Compatibility**: کلاسهای مشترک `.landing-brand`/`.lang-toggle`/`.landing-flow-card`/`.landing-auth-section` حفظ شدند (auth page و dark/light theme وابستهاند)؛ `prefers-reduced-motion` پوشش داده شد

## چه تست شد
- ✅ `npx tsc --noEmit` — صفر خطا
- ✅ `npm run test` — ۱۱۷/۱۱۷ پاس
- ✅ `npm run build` — موفق (مسیرهای landing و auth و light-theme همه کامپایل شدند)
- ✅ مرز کات CSS با grep تأیید شد: بخش creator studio (خط ۳۰۸ به بعد) سالم باقی مانده

## چه باقی ماند / گام بعد
- ⏳ تأیید زنده: باز کردن سایت بدون لاگین → لندینگ جدید در حالت لایو، فارسی/انگلیسی، موبایل
- ⏳ موج بعد: ماندگاری آپلودهای Render بعد از اسلیپ (موج ۵)

## واژهنامهٔ موج
| واژه | معنا |
|---|---|
| hero-stage | استیج نمایشی کنار تیتر که با CSS خالص حالوهوای اپ را میسازد |
| محصولات (products) | چهار هاب اصلی: کامیونیتی، موسیقی، ویدیو، سینما |
| بنتو (bento) | چیدمان کارتی با ابعاد متفاوت در یک گرید |
| aurora / blob | ناحیههای رنگی محوِ پسزمینه |
| reduced-motion | تنظیم سیستم کاربر برای حذف انیمیشنها |

## Landing refresh follow-up — 2026-09-23

### What changed
- Reworked the guest landing hero into a responsive product preview for Jamino's shared watch room, synced audio, and connected hubs.
- Added Watch Hub / anime discovery to the product rail and translated the new preview copy in Persian and English.
- Refined the landing page navigation, visual hierarchy, mobile layout, and reduced-motion handling.

### Validation
- `npx tsc --noEmit` passed.
- `npm run build` passed; existing lint warnings remain in unrelated files.
- Automated tests were not run in this change.

### Remaining / next step
- Review the deployed landing page at desktop and mobile widths.

### Glossary
- **Product preview:** the illustrative in-page mockup of Jamino's watch room.
- **Watch Hub:** the connected home for anime, films, and series.
