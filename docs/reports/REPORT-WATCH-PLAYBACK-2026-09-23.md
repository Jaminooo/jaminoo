# گزارش موج ۱: پخش انحصاری، قاب ثابت شورت، پلیر همیشه فعال — ۲۰۲۶-۰۹-۲۳

## چه افزوده شد
- **ماژول خالص `src/lib/player-solo.ts`** (کلاس `PlayerSolo` + سینگلتون `playerSolo`):
  - `register(id, pauseSelf)` — ثبت یک پلیر در سیستم پخش انحصاری
  - `claim(id)` — فعالکردن یک پلیر و مکث خودکار بقیه
  - `tryClaim(id)` — همان claim اما در صورت فعال بودن دیگری، رد میشود (گیت ورودی observer)
  - `release(id)` — آزاد کردن فقط اگر همان پلیر فعال باشد (idempotent)
- **اتصال کامل `vinyl-player.tsx`**:
  - ثبت هر پلیر هنگام mount با افکت جداگانه (نه فقط حالت autoplay) → انحصاری بودن در همهٔ سطحها (کارتهای فید، پلیر جزئیات، شورت)
  - `tryClaim` قبل از autoplay در observer و `claim` در `onPlay` و `attemptPlay`؛ `release` در `onPause`
  - حذف گارد معکوس اشتباه `if (videoRef.current?.paused) return` از `onPlay` (باعث ردشدن بهروزرسانی UI در race میشد)
- **قاب ثابت شورت** در `video-hub.tsx`: `dynamicAspect={false}` + `defaultAspect="9 / 16"` → همهٔ شورتها چارچوب عمودی یکسان دارند؛ پستهای افقی مثل قبل ۱۶/۹ میمانند (تغییری در رفتار قبلیشان نیست)
- **CSS شورت** در `hub-workspaces.css`: `aspect-ratio: 9/16`، ارتفاع کنترلشده و `object-fit: contain` برای پلیر تمامقد داخل ویدیو
- **نظافت مسیر observer**: حذف register/unregister تکراری از افکت autoplay (حالا فقط observer است)

## چه تست شد
- ✅ `src/lib/__tests__/exclusive-playback.test.ts` — ۵ تست: register/claim/tryClaim/release/زنجیرهٔ مکثها
- ✅ `npx tsc --noEmit` — صفر خطا
- ✅ `npm run test` — ۱۱۷/۱۱۷ پاس
- ✅ `npm run build` — موفق

## چه باقی ماند / گام بعد
- ⏳ تأیید زنده روی Render (نیاز VPN): پخش یک ویدیو در فید → بقیهٔ کارتها باید خودکار مکث شوند
- ⏳ موجهای بعد: کارتهای هاب تماشا (موج ۲)، پروفایل (موج ۳)، لندینگ (موج ۴)، ماندگاری آپلود (موج ۵)

## واژهنامهٔ موج
| واژه | معنا |
|---|---|
| claim | مالکیت انحصاری پخش را گرفتن (و مکث بقیه) |
| tryClaim | تلاش برای مالکیت؛ اگر دیگری فعال است رد میشود |
| release | آزادکردن مالکیت فقط توسط همان پلیر فعال |
| dynamicAspect | تطبیق قاب با نسبت واقعی ویدیو بعد از metadata |
| object-fit: contain | جاگذاری کامل ویدیو داخل قاب بدون برش |