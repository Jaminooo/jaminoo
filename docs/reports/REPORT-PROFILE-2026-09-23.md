# گزارش موج ۳: پروفایل عمیقتر — API + دو رابط کاربری — ۲۰۲۶-۰۹-۲۳

## چه افزوده شد
- **API `GET /api/users/[id]/profile`** (با `Promise.all` همزمان):
  - شاخصهای جدید: `videoPostCount` (پستهای ویدیوی عمومی)، `tweetCount` (پستهای عمومی)، `playlistCount` (پلیلیستهای ویدیو)، `jamMemberships` (تعداد دنیاهایی که عضو است)
  - `jamList`: لیست دنیاهای میزبانیشده (id/name/kind/type/createdAt) — همیشه بهصورت ISO سریالایز
  - `joinedAt` هم از طریق `user.createdAt` در `pubUser` موجود است
- **`FriendProfilePanel` (رهیاب دوستان)**:
  - آمار از ۴ به ۸ رسید: دوستان/مشترک/جمها/پیامها/ویدیوها/پستها/پلیلیستها/دنیاهای عضو
  - بخش «دنیاهایی که میسازد»: چیپهای شیشهای از `jamList` با نشان kind؛ حالت خالی با پیام «هنوز دنیایی نساخته»
- **`PublicIdentityView` (صفحهٔ هویت عمومی)**:
  - بازنویسی کامل به JSX خوانا؛ کارت با تاریخ عضویت، ۷ آمار، و لیست دنیاهای میزبانی
  - حالت loading/404/خطا حفظ شد
- **ترجمهها**: کلیدهای `fp.*` جدید در fa/en (statVideos/statTweets/statPlaylists/statMember/worldsHosted/noWorlds)
- **CSS**: `.fp-worlds*` در `jams-friends.css` و `.public-identity-date/worlds*` در `social-world.css` (RTL-safe با inset-inline)

## چه تست شد
- ✅ `npx tsc --noEmit` — صفر خطا (مسیرهای query همگی با schema تطبیق شد: Tweet.authorId/visibility، VideoPlaylist.userId، JamMember، VideoPost.visibility/workflowStatus)
- ✅ `npm run test` — ۱۱۷/۱۱۷ پاس
- ✅ `npm run build` — موفق

## چه باقی ماند / گام بعد
- ⏳ تأیید زنده: باز کردن پروفایل یک کاربر در رهیاب دوستان → ۸ آمار + لیست جمها
- ⏳ موج بعد: حذف/ادغام لندینگهای قدیمی و ساخت یک لندینگ واحد (موج ۴)

## واژهنامهٔ موج
| واژه | معنا |
|---|---|
| mutual | تعداد دوستان مشترک بین من و کاربر موردنظر |
| jamMemberships | تعداد Jams که کاربر عضو آنهاست |
| jamList | دنیاهایی که کاربر میزبان است (owner) |
| Promise.all | اجرای موازی کوئریهای مستقل برای کاهش تأخیر نقطه |