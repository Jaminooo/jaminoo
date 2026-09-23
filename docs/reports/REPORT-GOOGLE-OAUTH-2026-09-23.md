# REPORT-GOOGLE-OAUTH-2026-09-23

## موج: ورود با گوگل (Google OAuth 2.0) — الگوی همسان GitHub

### چه افزوده شد
1. **مدل داده**: فیلدهای `google Boolean @default(false)` و `googleLogin String? @unique` به `User` (Prisma) + migration `20260923_google_oauth` (با `prisma migrate deploy` در استارت Render خودکار اعمال میشود).
2. **مسیرهای API**:
   - `GET /api/auth/google` — ساخت URL رضایت گوگل (`accounts.google.com/o/oauth2/v2/auth`) + کوکی CSRF `jam_oauth_state` (همان مکانیزم GitHub).
   - `GET /api/auth/callback/google` — تبادل code با توکن، دریافت پروفایل از `oauth2/v3/userinfo`، یافتن/ساخت کاربر و ساخت سشن (جهت‌دهی به `/`). **مسیر عمداً `/api/auth/callback/google` است** چون redirect URI ثبتشده در کنسول گوگل کاربر دقیقاً همین است.
   - `GET /api/auth/google/status` — نشاندادن/مخفی‌کردن دکمه با توجه به env.
3. **حساب کاربری**: نام کاربری از بخش محلی ایمیل گوگل (سانیتایز + حلقهٔ یکتایی)، اعلان «Signed in with Google»، چک بن قبل از سشن. حساب‌های گوگلی مثل حساب‌های گیت‌هابی از ورود با رمز/بازیابی مستثنی شدند (`auth/route.ts`).
4. **کلاینت**: دکمهٔ «ادامه با گوگل» (آیکن G چهاررنگ) زیر دکمهٔ گیت‌هاب در `auth-screen.tsx`، با status gate.
5. **پیلود**: `google` به پاسخ `GET /api/auth`، `pubUser` و تایپ‌های `PubUser`/`Me` اضافه شد (اختیاری — برای نشانهای آینده).
6. **env/مستندات**: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` در `.env.example`؛ مقدارهای واقعی فقط در `.env` محلی (gitignored) گذاشته شد. **هیچ رازی وارد کد یا کامیت نشد.**
7. **i18n**: `auth.google` در fa/en.

### چه تست شد
- `npx prisma generate` → client بازتولید شد
- `npx tsc --noEmit` → صفر خطا
- `npm run test` → ۱۱۲/۱۱۲ پاس
- `npm run build` → موفق
- `node --check server.js` → معتبر
- اعتبار JSON هر دو messages → معتبر

### چه باقی ماند
- افزودن رازها به **Render Env Vars** (دستورالعمل جدولی زیر)؛ بدون آن دکمه مخفی میماند.
- تأیید زندهٔ E2E ورود گوگل (نیاز به VPN در این سشن).
- نشان «Google» روی پروفایل/دوستان (پولیش آتی؛ پیلود آماده است).

### گام بعد
- تست زنده با `queuetest.js` + راهنمای جدولی مراحل Render (زیر).

### واژهنامهٔ موج
| واژه | معنا |
|---|---|
| googleLogin | شناسهٔ پایدار گوگل (`sub`) برای تطبیق حساب | 
| jam_oauth_state | کوکی CSRF مشترک میان OAuthها |
| /api/auth/callback/google | مسیر callback ثبتشده در کنسول گوگل کاربر |

## راهنمای فعالسازی در Render (جدولی)
| متغیر | مقدار | نکته |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `543954262663-n4ldso15nbd13c8c31ebpphujq62ca5d.apps.googleusercontent.com` | از پنل گوگل |
| `GOOGLE_CLIENT_SECRET` | (مقدار GOCSPX از کاربر) | محرمانه — فقط در Render/env |
| `NEXT_PUBLIC_BASE_URL` | `https://jaminoo.onrender.com` | اگر ست نشده، callback خودکار همان URI کنسول ساخته میشود |