const $=s=>document.querySelector(s);
const start=$("#start"), timeline=$("#timeline"), dayCount=$("#dayCount"), next=$("#next");
const recordDate=$("#recordDate"), colorName=$("#colorName"), photo=$("#photo"), history=$("#history");
const preview=$("#preview"), previewWrap=$("#previewWrap");
const KEY="hairScheduleDataV2";
let data=JSON.parse(localStorage.getItem(KEY)||'{"start":"","records":[]}');

const old=JSON.parse(localStorage.getItem("hairScheduleDataV1")||'null');
if(old && !data.start && data.records.length===0){
  data.start=old.start||"";
  data.records=(old.history||[]).map((d,i)=>({id:`old-${d}-${i}`,date:d,color:"アッシュブルー",photoId:null}));
  save();
}

const iso=d=>{let x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`};
const jp=d=>new Intl.DateTimeFormat("ja-JP",{year:"numeric",month:"long",day:"numeric"}).format(d);
const addDays=(d,n)=>{let x=new Date(d);x.setDate(x.getDate()+n);return x};
const addMonths=(d,n)=>{let x=new Date(d);x.setMonth(x.getMonth()+n);return x};
function save(){localStorage.setItem(KEY,JSON.stringify(data))}

function openDB(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open("hairSchedulePhotos",1);
  req.onupgradeneeded=()=>req.result.createObjectStore("photos");
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error);
 });
}
async function putPhoto(id,blob){
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction("photos","readwrite");
  tx.objectStore("photos").put(blob,id);
  tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
 });
}
async function getPhoto(id){
 if(!id)return null;
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const req=db.transaction("photos").objectStore("photos").get(id);
  req.onsuccess=()=>resolve(req.result||null); req.onerror=()=>reject(req.error);
 });
}
async function deletePhoto(id){
 if(!id)return;
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction("photos","readwrite");
  tx.objectStore("photos").delete(id);
  tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
 });
}
async function compressImage(file){
 const bmp=await createImageBitmap(file);
 const max=1280, scale=Math.min(1,max/Math.max(bmp.width,bmp.height));
 const canvas=document.createElement("canvas");
 canvas.width=Math.round(bmp.width*scale); canvas.height=Math.round(bmp.height*scale);
 canvas.getContext("2d").drawImage(bmp,0,0,canvas.width,canvas.height);
 return new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",0.78));
}

function render(){
 start.value=data.start;
 if(!recordDate.value) recordDate.value=iso(new Date());
 if(!data.start){dayCount.textContent="日付を設定してください";next.textContent="";timeline.innerHTML="";renderHistory();return}
 const s=new Date(data.start+"T00:00:00"), today=new Date(); today.setHours(0,0,0,0);
 const days=Math.floor((today-s)/86400000);
 dayCount.textContent=days>=0?`カラーから ${days} 日目`:`開始まで ${-days} 日`;
 const events=[
  ["2週間","色落ちを確認",addDays(s,14)],
  ["1か月","色味・ダメージを確認",addMonths(s,1)],
  ["4か月","次の施術に向けて残留色を確認",addMonths(s,4)],
  ["6か月","髪の状態を確認し、次のカラーを検討",addMonths(s,6)]
 ];
 timeline.innerHTML=events.map(e=>`<div class="item"><strong>${e[0]}｜${e[1]}</strong><div class="date">${jp(e[2])}</div></div>`).join("");
 const upcoming=events.find(e=>e[2]>=today);
 next.textContent=upcoming?`次の目安：${upcoming[0]}（${jp(upcoming[2])}）`:"6か月の予定期間を過ぎています";
 renderHistory();
}

async function renderHistory(){
 if(!data.records.length){history.innerHTML="<p>まだ記録はありません。</p>";return}
 const records=[...data.records].sort((a,b)=>b.date.localeCompare(a.date));
 history.innerHTML=records.map(r=>`<article class="record" data-id="${r.id}">
   <div class="recordHead"><div><strong>${r.date}</strong><div class="color">${escapeHtml(r.color||"カラー名なし")}</div></div>
   <button class="delete" data-id="${r.id}">削除</button></div>
   ${r.photoId?`<div class="photoSlot" data-photo="${r.photoId}">写真を読み込み中…</div>`:""}
 </article>`).join("");
 document.querySelectorAll(".delete").forEach(b=>b.onclick=async()=>{
   const r=data.records.find(x=>x.id===b.dataset.id);
   if(r?.photoId) await deletePhoto(r.photoId);
   data.records=data.records.filter(x=>x.id!==b.dataset.id); save(); render();
 });
 for(const slot of document.querySelectorAll(".photoSlot")){
   const blob=await getPhoto(slot.dataset.photo);
   if(blob){
     const url=URL.createObjectURL(blob);
     slot.innerHTML=`<img src="${url}" alt="カラー記録写真">`;
   }else slot.textContent="写真を読み込めませんでした";
 }
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

start.onchange=()=>{data.start=start.value;save();render()};
photo.onchange=()=>{
 const f=photo.files[0];
 if(!f){previewWrap.hidden=true;return}
 preview.src=URL.createObjectURL(f); previewWrap.hidden=false;
};
$("#clearPhoto").onclick=()=>{photo.value="";preview.removeAttribute("src");previewWrap.hidden=true};

$("#recordBtn").onclick=async()=>{
 if(!recordDate.value)return;
 const id=(crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`);
 let photoId=null;
 if(photo.files[0]){
   try{
     const blob=await compressImage(photo.files[0]);
     photoId=`photo-${id}`; await putPhoto(photoId,blob);
   }catch(e){alert("写真の保存に失敗しました。写真なしで記録します。")}
 }
 data.records.push({id,date:recordDate.value,color:colorName.value.trim()||"カラー名なし",photoId});
 save();
 colorName.value=""; photo.value=""; previewWrap.hidden=true; render();
};
render();
