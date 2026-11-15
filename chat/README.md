# SIMAK sayt chati

Saytdagi "Narx so'rash" tugmasi Telegramga o'tkazish o'rniga sayt ichida chat oynasini ochadi.

## Qanday ishlaydi
1. Mijoz "Narx so'rash"ni bosadi -> oyna ochiladi, model nomi avtomatik olinadi.
2. Bot 3-4 ta savol beradi (qayerda ishlatadi, hajm, 220V/380V, ism va telefon).
3. Har bir mijoz operatorlarning Telegram guruhida alohida mavzu (topic) bo'lib chiqadi.
4. Operator o'sha mavzuda yozadi -> mijoz saytdagi oynada ko'radi.
   `#` yoki `/` bilan boshlangan xabar ichki izoh, mijozga ketmaydi.

## Fayllar
- `simak-chat.js`, `simak-chat.css` — saytdagi oyna.
- `namuna.html` — namuna sahifa (server yo'q, hech narsa yuborilmaydi).
- `server/` — Cloudflare Worker (bepul tarif) + D1 baza.

## Ishga tushirish (Muhammadning "ha"sidan keyin)
1. Cloudflare'da bepul akkaunt (Muhammad o'zi ochadi).
2. @BotFather'da yangi bot (masalan "SIMAK sayt chat"). Token'ni Muhammad o'zi kiritadi.
   Mavjud @simakuz_ai_bot ishlatilmaydi — uning webhook'i buzilmasligi uchun.
3. Operatorlar uchun Telegram guruhi, "Mavzular" (Topics) yoqilgan; bot admin, "Mavzularni boshqarish" huquqi bilan.
4. `wrangler d1 create simak-chat`, `wrangler d1 execute simak-chat --remote --file=schema.sql`,
   `wrangler secret put TG_TOKEN`, `wrangler secret put TG_SECRET`, `wrangler deploy`.
5. Telegram webhook: `setWebhook` -> `https://<worker>/tg`, `secret_token` = TG_SECRET.
6. Saytga: `<script>window.SIMAK_CHAT={api:"https://<worker>"}</script>` + css/js.
7. `maxfiylik.html`ga chat orqali ism/telefon yig'ilishi haqida band qo'shiladi.
