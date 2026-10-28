# ReelShort MN

Монгол хэлтэй богино цувралын веб платформ. React + TypeScript + Vite + Supabase. This is an independent project, not an official ReelShort service.

## Одоо ажиллах хэсгүүд

- Responsive кино каталог, нэрээр хайх, төрлөөр шүүх.
- HTML5 MP4 тоглуулагч, анги сонгох, дараагийн ангийг автоматаар тоглуулах.
- Google OAuth, имэйл magic link, утасны SMS OTP бүртгэл / нэвтрэлт (Supabase тохируулсны дараа).
- Хэрэглэгч тус бүрийн хадгалсан кино, 10 секунд тутам болон pause үед хадгалах үзсэн хугацаа.
- Админд зориулсан цуврал, анги нийтлэх форм. Нийтлэлийг өөрчлөх/устгах ажлыг Supabase Table Editor-оос хийж болно.
- PWA manifest, offline мэдээллийн хуудас. Видео offline татах боломжгүй.
- Supabase RLS: хэрэглэгч зөвхөн өөрийн хадгалалт, түүхийг уншиж өөрчилнө; админ л каталог өөрчилнө.

## Эхлүүлэх

Node 22.12+.

```sh
npm ci
cp .env.example .env
npm run dev
```

`.env` дотор Supabase URL болон public anon key-ээ оруулна. Service-role key-ийг `VITE_` хувьсагчид эсвэл frontend-д ХЭЗЭЭ Ч бүү оруул.

Хувьсагчгүй үед зохиомол нэртэй жишээ каталог, Big Buck Bunny туршилтын видео гарна. Нэвтрэлт хуурамч амжилт үзүүлэхгүй. Supabase тохируулсан үед зөвхөн database-ийн контентыг үзүүлнэ.

## Supabase тохируулах

1. Supabase project үүсгээд SQL Editor дээр `supabase/schema.sql` ажиллуулна (нэг удаа).
2. Authentication → URL Configuration: Site URL `https://reelshort.mn`; redirect allowlist-д `https://reelshort.mn`, `http://localhost:5173` болон preview domain-оо нэмнэ.
3. Email provider идэвхжүүлж production SMTP тохируулна. Имэйл холбоосоор бүртгүүлж, нэвтэрнэ.
4. Google provider: Google Cloud OAuth client ID/secret-ийг Supabase dashboard-д оруулна. Google-ийн callback нь Supabase dashboard-д үзүүлсэн `https://PROJECT.supabase.co/auth/v1/callback` байна. Secret-ийг репод бүү хадгал.
5. Phone provider болон SMS provider (Монгол +976 дугаар дэмждэг үйлчилгээ) тохируулна. SMS төлбөр, rate limits, delivery-г бодит дугаараар шалгана.
6. Нэг удаа бүртгүүлээд auth.users доторх UUID-г авна. SQL Editor:

```sql
insert into public.admins(user_id) values ('YOUR_AUTH_USER_UUID');
```

Дахин нэвтрэхэд footer дэх Админ товч гарна. Admin role нь хэрэглэгчийн өөрчилж болох metadata-аас авдаггүй.

## ReelShort кино оруулах

Энэ репо ReelShort-ийн кино файлуудыг агуулаагүй. Нийтлэх эрхтэй киноны файл/постер эсвэл эрх эзэмшигчээс өгсөн HTTPS видео URL шаардлагатай. ReelShort-ийн веб хуудасны URL нь видео тоглуулагчийн URL биш.

1. Эрхтэй MP4 видеог CDN эсвэл Supabase Storage дээр байрлуулна. Hosting нь `Content-Type: video/mp4`, range requests дэмжих ёстой.
2. Админ → Цуврал нэмэх: монгол нэр, тайлбар, төрөл, постер.
3. Админ → Анги нэмэх: цуврал сонгоод дараалсан дугаар, нэр, MP4 URL оруулна.
4. Private/unpublished болгохдоо Table Editor-ийн `published` утгыг false болгоно. Нүүрийн онцлох кинонд `featured=true` болгоно.

Одоогийн каталог үнэгүй/public streaming зориулалттай. Public MP4 URL-ийг үзэгч хуулж чадна. Төлбөртэй кинонд серверийн entitlement шалгалт + богино хугацааны signed playback URL + төлбөрийн webhook хэрэгтэй; энэ хувилбарт төлбөр, DRM, QPay ороогүй.

## Deployment / reelshort.mn

Vercel дээр энэ репог import → Vite → build `npm run build` → output `dist`. Дээрх хоёр `VITE_` хувьсагчийг build environment-д нэмнэ. Custom Domains-д `reelshort.mn`, `www.reelshort.mn` нэмээд Vercel-ийн өгсөн DNS утгыг домэйн дээр тохируулна. TLS идэвхжсэний дараа auth redirect-уудыг шалгана. Репод домэйн эзэмших эрх, DNS хандалт эсвэл Supabase credential байхгүй тул автоматаар production холболт хийгдээгүй.

```sh
npm run build
npm run preview
```

## Утасны апп

Одоогийн хувилбар mobile-responsive веб/PWA. iOS Safari → Share → Add to Home Screen; Android Chrome → Add to Home Screen. App Store/Play Store-д бэлэн native binary биш.

Дараагийн native шатанд Capacitor wrapper эсвэл Expo client нэмж ижил Supabase schema/API ашиглаж болно. Native OAuth-д deep link callback, secure session storage, app signing, store listing болон store payment policy-г тусад нь хэрэгжүүлнэ. Одоогийн Google redirect веб origin-д зориулагдсан.

## Launch шалгалт

- Хоёр тусдаа хэрэглэгчээр watchlist/progress тусгаарлагдсан эсэх.
- Энгийн хэрэглэгч series/episodes дээр insert/update/delete хийхэд RLS татгалзах эсэх.
- Google, имэйл, SMS бодит хүргэлт; sign out; expired OTP.
- Видео seek, pause/resume, дараагийн анги; iOS/Android бодит төхөөрөмж.
- Домен, SSL, постер/video CDN, мэдээллийн нууцлалын бодит холбоо барих хаяг.

CI нь TypeScript болон production build шалгана. Supabase project/SMS credential-гүй орчинд live auth болон SQL migration execution баталгаажаагүй.

Demo video: Big Buck Bunny © Blender Foundation, CC BY 3.0, https://www.bigbuckbunny.org/ . Demo imagery: Unsplash remote images. Бодит кино болон постеруудыг эрхтэй эх үүсвэрээр солино.

## ReelShort metadata scrape → админ хяналт → ноорог импорт

Энэ нэмэлт нь **нэр, тайлбар, эх киноны холбоос** цуглуулна. Видео, постер файл, төлбөртэй анги татахгүй. ReelShort-ийн бодит хуудсыг энэ хөгжүүлэлтийн орчноос шалгахад HTTP 403 ирсэн; live extraction баталгаажаагүй. HTML parser нь Open Graph / title / description metadata дэмждэг; сайт зөвхөн JavaScript-ээр мэдээлэл гаргадаг бол parser шинэчлэх шаардлагатай.

1. Одоо байгаа Supabase project дээр `supabase/migrations/002_catalog_import.sql` ажиллуулна. Шинэ суулгалтад эхлээд `schema.sql`, дараа нь энэ migration.
2. `urls.txt` дотор нэг мөрөнд нэг `https://www.reelshort.com/movie/...` киноны хуудасны холбоос тавина (дээд тал нь 50).
3. Python 3-аар ажиллуулна:

```sh
python3 scripts/catalog.py urls.txt --output catalog.json
```

Скрипт эхлээд robots.txt шалгаж, хүсэлтүүдийн хооронд дор хаяж 2 секунд хүлээнэ. 403, 429, robots хориг, буруу HTML эсвэл сүлжээний алдаа гарвал зогсоно; proxy/cookie/login ашиглаж тойрохгүй. Бүх хуудас амжилттай болсны дараа шинэ JSON файл бичнэ. Өмнөх файлыг дарж бичихгүй. URL-уудаас гадна автомат sitemap crawler ороогүй.

4. Веб дээр админ бүртгэлээр орно → footer **Админ** → **ReelShort каталог импортлох** → JSON сонгоно.
5. Нэр, тайлбарыг монголоор засаж, төрлийг сонгож, импортлох мөрүүдийг тэмдэглэнэ. **Нооргоор импортлох** дарна.
6. Давхардсан source_url-ийг алгасна, өмнөх киноны утгыг дарж өөрчлөхгүй. Импорт нэг database transaction; алдаа гарвал багц бүхэлдээ буцна. Шинэ бичлэгүүд `published=false` бөгөөд public хэрэглэгчид харагдахгүй.
7. Supabase Table Editor-оос ноорогийг хянаж, өөрийн эрхтэй постер, ангиудыг нэмсний дараа `published=true` болгоно. Импортын placeholder нь reelshort.mn/icon.svg тул домэйн холбохоос өмнө өөрийн постер URL-аар солино.

`npm test` нь parser, URL validation, robots хориг, давхардал, crawl delay, алдаа дээр зогсох урсгалыг offline fixtures-ээр шалгана. Database migration/RLS-г live Supabase дээр шалгаагүй.

## Нэг холбоосоор нэмэх + кино нээж олох

Админ хэсгийн эхэнд **Нэг холбоос. Шинэ кино.** форм нэмэгдсэн. ReelShort movie URL тавиад **Мэдээллийг авах** дарна. Public HTML metadata амжилттай ирвэл нэр/тайлбар бөглөгдөнө. 403, robots хориг, CORS биш серверийн алдаа, endpoint идэвхгүй үед нэр/тайлбарыг гараар оруулж хадгалж болно. Постер заавал биш. **Хянасан, каталогт шууд нийтлэх** сонголттой; сонгоогүй бол ноорог. Доорх төлөвийн жагсаалтаас нийтлэх/нуух боломжтой. Ноорог public каталог болон админы үзэгчийн нүүрт ч харагдахгүй.

- Видео анги байхгүй, source_url байгаа бол **ReelShort дээр үзэх** товч шинэ цонхоор эх сайтыг нээнэ. Энэ нь embed/free unlock биш; эх сайтын бүртгэл, төлбөр хэвээр.
- Видео анги нэмэгдсэн бол дотоод тоглуулагч ажиллана.
- Хайлт нэр + тайлбар + төрлөөр; шинэ/нэр/хадгалсан киноны төрлөөр эрэмбэлнэ.
- Ижил төрлийн кино санал болгоно. Энэ нь энгийн төрлийн тохирол, AI API ашигладаггүй.

### Metadata endpoint

`api/metadata.mjs` нь Vercel Node function (Web Request/Response handler). `npm run dev` нь Vite UI л ажиллуулдаг; endpoint-ийг туршихад Vercel preview эсвэл Vercel dev хэрэгтэй. Энгийн static hosting дээр endpoint ажиллахгүй; гараар нэмэх боломж хэвээр.

`SUPABASE_URL` + `SUPABASE_ANON_KEY` сервер env эсвэл одоогийн `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`-г ашиглана. Service-role key хэрэггүй. `003_metadata_rate_limit.sql` migration-ийг 002-ын дараа ажиллуулна. Endpoint Supabase session + admin RPC шалгаад database-backed глобал 10 секундийн throttle хэрэглэнэ. Зөвхөн ReelShort HTTPS movie URL, redirect хориг, 8 секунд timeout, 1MB HTML limit, robots.txt шалгалттай. Crawl-delay заасан бол API таталтыг зогсоож багц скрипт/гараар оруулахыг санал болгоно.

Live Supabase, Google/SMS, Vercel deployment, бодит ReelShort metadata таталтыг энэ орчинд баталгаажуулаагүй. Offline tests нь auth-ийн эрт татгалзах салаа, URL validation, robots, parser, хэмжээний хязгаар болон 403 дээр зогсохыг шалгана. Frontend TypeScript + production build шалгагдсан; browser QA хийгдээгүй.

## Live Монгол хадмал

**Live хадмал** хуудаснаас local видео сонгох эсвэл киноны тоглуулагч дээр **CC Монгол · Шууд хадмал** асаана. Видео local төхөөрөмжөөс сонгогдвол файл upload хийхгүй; зөвхөн асаасан үеийн дууны хэсгүүд сервер/OpenAI руу явна. Микрофон ашиглахгүй. API түлхүүр frontend рүү очихгүй.

Энэ хувилбар бол **4 секундийн аудио хэсгээр давтан орчуулдаг near-live MVP**. AudioWorklet PCM-ийг 16kHz mono WAV болгож `gpt-4o-mini-transcribe` → `gpt-4.1-mini` Монгол орчуулга → overlay харуулна. Хадмалд 4 секундын цуглуулалт дээр API latency нэмэгдэнэ; тэг хоцролт эсвэл үг бүртэй синхрон хадмал биш. Бүхэл видео урьдчилж боловсруулахгүй, үүссэн хадмалыг database-д хадгалахгүй. Тасалдсан өгүүлбэр, чимээ, дуу хөгжим орчуулгын алдаа үүсгэж болно. Pause/seek/анги солих/унтраахад хуучин хүсэлт болон хадмалыг цуцална. 4 секунд хүрээгүй төгсгөлийн хэсэг илгээгдэхгүй. Хүсэлт удаан байвал хэсгийг алгасаж хоцролтыг хуримтлуулахгүй.

### Идэвхжүүлэх

1. Supabase migration-уудыг дарааллаар ажиллуулна; `004_live_subtitles.sql` шинэ migration шаардлагатай.
2. Vercel **server environment**-д `OPENAI_API_KEY` тохируулна. `.env.local`-д локал түлхүүр хадгалж болно; репод commit хийхгүй. `VITE_OPENAI_API_KEY` бүү ашигла.
3. Supabase URL/public anon key, хэрэглэгчийн нэвтрэлт, OpenAI API billing/credit идэвхтэй байх ёстой.
4. HTTPS дээр ажиллуулна. Local Vite нь API route ажиллуулахгүй; Vercel preview эсвэл Vercel dev хэрэгтэй.
5. Remote видео CDN `Access-Control-Allow-Origin` зөв өгсөн байх ёстой. HTML video нь `crossOrigin="anonymous"` ашиглана. CORS дэмжихгүй эх сурвалжийн видео/дуу ажиллахгүй. Local файлд энэ хязгаар байхгүй.

Нэвтэрсэн хэрэглэгчид нэг хүсэлт / 3 секунд, UTC өдрийн 300 хүсэлт хүртэл. Энэ нь төсөл даяарх зардлын hard cap биш; production нээлтээс өмнө OpenAI project spending controls тохируулна. Сервер 1–6 секундийн mono PCM WAV болон 192044 bytes хязгаар шалгана. Хүсэлтүүд төлбөртэй, browser abort нь provider дээр эхэлсэн төлбөрийг заавал буцаахгүй.

Хадмал inline тоглуулагч дээр харагдана; native video fullscreen/PiP дотор HTML overlay харагдахгүй. Бодит Android/iOS дээр Web Audio болон AudioWorklet дэмжлэгийг шалгах шаардлагатай.

### Шалгалтын төлөв

- Automated tests: WAV validation, worklet averaging/reset, provider request pipeline, no-speech, upstream errors, auth rejection.
- Production build амжилттай.
- Бодит API translation smoke test HTTP 429 `billing_not_active` өгсөн. Түлхүүр үүссэн боловч төлбөр идэвхгүй учраас амжилттай live орчуулга баталгаажаагүй.
- Supabase migration болон бүтэн authenticated audio flow live project дээр шалгаагүй.

Browser QA: Live хадмал хуудас болон CC товч харагдсан, тохиргоо дутуу үед тодорхой мессеж гарсан. Cloud preview дээр demo remote video ачаалаагүй; бодит видео тоглуулах/хадмалын end-to-end тест бүрэн хийгдээгүй.
