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
