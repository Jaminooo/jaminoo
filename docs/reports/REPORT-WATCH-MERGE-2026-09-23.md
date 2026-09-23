# REPORT-WATCH-MERGE-2026-09-23

## موج: هاب تماشا (Watch Hub) — ادغام سینما و انیمه به یک هاب یکپارچه

### چه افزوده شد
1. **`src/lib/watch-catalog.ts`** — منطق خالص کاتالوگ یکپارچه: `normalizeWatchKind` (نگاشت نوع سینما/انیمه به MOVIE/SERIES/ANIME/CARTOON)، `mergeWatchCatalog` (ادغام دو کاتالوگ)، `filterByWatchTab`، `buildWatchShelves` (سه قفسهٔ خانه)، `matchWatchQuery` (جستجوی کلاینتی)، `watchKindCounts`، `watchPartyPlan` (نگاشت عنوان به روم MOVIE/ANIME + بارگذاری media)، `watchTitleHue` (هیو قطعی برای جلدهای بدون پوستر).
2. **`src/components/watch-hub.tsx`** — هاب یکپارچه با الگوی `animex.click`:
   - تبهای نوع محتوا: خانه / فیلمها / سریالها / انیمه / کارتونها / فهرست من
   - hero + سه قفسهٔ خانه (پیشنهاد ویژه / تازه اضافهشده / در حال پخش)
   - جستجوی سراسری + فیلتر ژانر
   - مودال جزئیات با **پخش برای من** (همان `VinylPlayer` با همان دیفالتهای قبلی: variant=feature، poster، subtitlesUrl، rememberPosition) و **شروع جم تماشا** (روم MOVIE برای فیلم/سریال/کارتون، روم ANIME با اپیزود برای انیمه؛ از طریق PATCH `/api/jams/{id}/cinema` و `/api/jams/{id}/anime` موجود)
   - نشان نوع چهارگانه (فیلم/سریال/انیمه/کارتون) + امتیاز + وضعیت پخش
   - لیست تماشا یکپارچه با کلید `jamino_watch_list` (کلیدهای `cinema:{id}` / `anime:{id}`)
3. **پشتیبانی کارتون (CARTOON)**: فیلتر `GET /api/cinema`، اعتبارسنجی POST/PATCH ادمین، UI ادمین (StatCard جدید + گزینه در فرم/فیلتر/جدول با آیکون Sparkles و Badge کهربایی)، برچسب رویدادهای ممیزی.
4. **seed کارتون** در `server.js` (خارج از شرط جدول خالی تا در DB زندهٔ Render هم کارتونها اضافه شوند).
5. **ادغام مسیرها**: product جدید `watch` در store؛ یک کارت در `HubGateway` بهجای دو کارت سینما/انیمه؛ `app-shell` ترتیب را به `WatchHub` میدهد؛ `sync-routing` لینکهای قدیمی `?hub=cinema` و `?hub=anime` را به هاب یکتا نگاشت میکند.
6. حذف `cinema-hub.tsx`، `anime-hub.tsx`، `cinema-hub.css` (دیگر ارجاعی نداشتند). `anime-hub.css` بهعنوان بلوک مشترک `.anime-*` حفظ شد؛ `watch-hub.css` اضافه شد (accent رز→طلایی + چیپهای `.anime`/`.cartoon`).
7. **i18n کامل dوزبانه**: namespace جدید `watch.*` + `hubs.watch/watchDesc` + `admin.cartoon` در fa/en.

### چه تست شد
- **Unit (جدید)**: `src/lib/__tests__/watch-catalog.test.ts` — ۱۸ تست برای hue، نگاشت نوعها، ادغام و کلید پایدار، فیلتر تبها، جستجو، شمارش، قفسهها با fallback خالی، و plan پارتی (انیمه→ANIME با episode، بقیه→MOVIE با videoId، رد عنوانِ بیلینک).
- `npx tsc --noEmit` → صفر خطا
- `npm run test` → ۱۱۲/۱۱۲ پاس (۱۰ فایل)
- `npm run build` → موفق، بدون وارنینگ جدید
- `node --check server.js` → معتبر
- اعتبار JSON هر دو messages → معتبر

### چه باقی ماند
- تأیید زندهٔ کاربر روی Render (پس از روشنشدن VPN): کارت «هاب تماشا»، تب کارتونها (۲ عنوان دمو)، جستجو، پخش برای من، شروع جم تماشا و پخش همگام دوتبه.
- افزودن ویدیوهاب و پستهای ویدیویی به جستجوی سراسری ⌘K — موج مستقل (پیشنهاد بعدی).
- هر چیپ/اسم قدیمی «cinema»/«anime» در بلاکهای i18n که دیگر مصرف ندارند (بدون حذف برای امنیت رومهای قدیمی).

### گام بعد
- موج Google Sign-In (دومین درخواست کاربر): همان الگوی GitHub OAuth، کلیدها فقط از env.

### واژهنامهٔ موج
| واژه | معنا |
|---|---|
| WatchKind | نوع محتوای یکپارچه: MOVIE/SERIES/ANIME/CARTOON |
| watchPartyPlan | نگاشت عنوان به روم (ANIME با episode، بقیه با videoId) |
| key | شناسهٔ پایدار ادغام: `cinema:{id}` یا `anime:{id}` |
| hub-shell-watch | هویت رنگی هاب تماشا (رز→طلایی) |