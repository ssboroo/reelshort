import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const db = url && key ? createClient(url, key) : null;
export type Film = {id:string; title:string; genre:string; description:string; poster_url:string; featured:boolean; published:boolean; created_at?:string};
export type Episode = {id:string; series_id:string; number:number; title:string; video_url:string; published:boolean};
export const demoFilms:Film[] = [
 ['Тавилангийн учрал','Романтик','Нэг учрал бүхнийг өөрчилнө. Хотын завгүй амьдралд хоёр өөр ертөнцийн хүмүүсийн зам огтлолцоно.','photo-1516589178581-6cd7833ae3b2'],
 ['Хотын нууц','Драм','Гэр бүлийн нууц, итгэл, сонголтын тухай түүх.','photo-1519608487953-e999c86e7455'],
 ['Сүүлчийн захидал','Романтик','Олон жилийн дараа ирсэн захидал мартагдсан хайрыг сэрээнэ.','photo-1478720568477-152d9b164e26'],
 ['Шинэ эхлэл','Драм','Өөрийн мөрөөдлийн төлөө бүхнийг шинээр эхлэх зориг.','photo-1518837695005-2083093ee35b'],
 ['Шөнийн зочин','Триллер','Хаалганы цаана хэн байгааг хэн ч мэдэхгүй.','photo-1519608487953-e999c86e7455'],
 ['Зүрхний хэмнэл','Романтик','Хөгжим хоёр зүрхийг нэг хэмнэлээр цохилуулна.','photo-1516589178581-6cd7833ae3b2']
].map(([title,genre,description,photo],i)=>({id:`demo-${i}`,title,genre,description,poster_url:`https://images.unsplash.com/${photo}?auto=format&fit=crop&w=900&q=85`,featured:i===0,published:true}));
export const demoEpisodes = (id:string):Episode[] => [{id:`${id}-1`,series_id:id,number:1,title:'Туршилтын видео · Big Buck Bunny',video_url:'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',published:true}];
