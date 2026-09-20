const $=s=>document.querySelector(s);
const start=$("#start"), timeline=$("#timeline"), dayCount=$("#dayCount"), next=$("#next");
const recordDate=$("#recordDate"), colorName=$("#colorName"), history=$("#history"), storageInfo=$("#storageInfo");
const KEY="hairScheduleDataV3";
let data=JSON.parse(localStorage.getItem(KEY)||'{"start":"","records":[]}');

const v2=JSON.parse(localStorage.getItem("hairScheduleDataV2")||'null');
if(v2 && !data.start && !data.records.length){
 data.start=v2.start||"";
 data.records=(v2.records||[]).map(r=>({id:r.id,date:r.date,color:r.color,photos:r.photoId?[{id:r.photoId,type:"経過",date:r.date}]:[]}));
 save();
}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
const iso=d=>{let x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`};
const jp=d=>new Intl.DateTimeFormat("ja-JP",{year:"numeric",month:"long",day:"numeric"}).format(d);
const addDays=(d,n)=>{let x=new Date(d);x.setDate(x.getDate()+n);return x};
const addMonths=(d,n)=>{let x=new Date(d);x.setMonth(x.getMonth()+n);return x};
function openDB(){return new Promise((res,rej)=>{let q=indexedDB.open("hairSchedulePhotos",1);q.onupgradeneeded=()=>q.result.createObjectStore("photos");q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function putPhoto(id,blob){let db=await openDB();return new Promise((res,rej)=>{let tx=db.transaction("photos","readwrite");tx.objectStore("photos").put(blob,id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function getPhoto(id){let db=await openDB();return new Promise((res,rej)=>{let q=db.transaction("photos").objectStore("photos").get(id);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}
async function delPhoto(id){let db=await openDB();return new Promise((res,rej)=>{let tx=db.transaction("photos","readwrite");tx.objectStore("photos").delete(id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function compress(file){let bmp=await createImageBitmap(file),max=1280,s=Math.min(1,max/Math.max(bmp.width,bmp.height)),c=document.createElement("canvas");c.width=Math.round(bmp.width*s);c.height=Math.round(bmp.height*s);c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);return new Promise(res=>c.toBlob(res,"image/jpeg",.78))}
function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function daysSince(base,d){return Math.max(0,Math.floor((new Date(d+"T00:00:00")-new Date(base+"T00:00:00"))/86400000))}

function render(){
 start.value=data.start;if(!recordDate.value)recordDate.value=iso(new Date());
 if(!data.start){dayCount.textContent="日付を設定してください";next.textContent="";timeline.innerHTML=""}
 else{
  let s=new Date(data.start+"T00:00:00"),t=new Date();t.setHours(0,0,0,0),days=Math.floor((t-s)/86400000);
  dayCount.textContent=days>=0?`カラーから ${days} 日目`:`開始まで ${-days} 日`;
  let ev=[["2週間","色落ちを確認",addDays(s,14)],["1か月","色味・ダメージを確認",addMonths(s,1)],["4か月","次の施術に向けて残留色を確認",addMonths(s,4)],["6か月","髪の状態を確認し、次のカラーを検討",addMonths(s,6)]];
  timeline.innerHTML=ev.map(e=>`<div class="item"><strong>${e[0]}｜${e[1]}</strong><div class="date">${jp(e[2])}</div></div>`).join("");
  let up=ev.find(e=>e[2]>=t);next.textContent=up?`次の目安：${up[0]}（${jp(up[2])}）`:"6か月の予定期間を過ぎています";
 }
 renderHistory();
}
async function saveFile(file,type,date,rec){
 if(!file)return;let id=`photo-${crypto.randomUUID?crypto.randomUUID():Date.now()+Math.random()}`;let blob=await compress(file);await putPhoto(id,blob);rec.photos.push({id,type,date});
}
async function renderHistory(){
 if(!data.records.length){history.innerHTML="<p>まだ記録はありません。</p>";storageInfo.textContent="写真 0枚｜使用容量 0 MB";return}
 let rs=[...data.records].sort((a,b)=>b.date.localeCompare(a.date));
 history.innerHTML=rs.map(r=>`<article class="record" data-rec="${r.id}">
 <div class="recordHead"><div><strong>${r.date}</strong><div class="color">${esc(r.color||"カラー名なし")}</div></div><button class="deleteRec" data-id="${r.id}">記録を削除</button></div>
 <div class="carousel">${(r.photos||[]).map((p,i)=>`<div class="slide"><div class="photoLabel">${esc(p.type)}${p.type==="経過"?`｜${daysSince(r.date,p.date)}日後`:""}</div><div class="photoSlot" data-photo="${p.id}">読み込み中…</div><button class="deletePhoto" data-rec="${r.id}" data-photo="${p.id}">この写真を削除</button></div>`).join("")}</div>
 <div class="dots">${(r.photos||[]).map(()=>"<span>●</span>").join(" ")}</div>
 <div class="addProgress"><label>現在の経過写真を追加</label><input class="progressDate" type="date" value="${iso(new Date())}"><input class="progressFile" type="file" accept="image/*"><button class="addProgressBtn" data-id="${r.id}">経過写真を追加</button></div>
 </article>`).join("");
 let total=0,count=0;
 for(let slot of document.querySelectorAll(".photoSlot")){let blob=await getPhoto(slot.dataset.photo);if(blob){total+=blob.size;count++;let u=URL.createObjectURL(blob);slot.innerHTML=`<img src="${u}" alt="ヘアカラー記録写真">`}else slot.textContent="写真を読み込めませんでした"}
 storageInfo.textContent=`写真 ${count}枚｜使用容量 ${(total/1048576).toFixed(1)} MB`;
 document.querySelectorAll(".deletePhoto").forEach(b=>b.onclick=async()=>{
  if(!confirm("この写真をアプリの記録から削除しますか？\nスマホに保存されている元の写真は削除されません。"))return;
  let r=data.records.find(x=>x.id===b.dataset.rec);await delPhoto(b.dataset.photo);r.photos=r.photos.filter(p=>p.id!==b.dataset.photo);save();renderHistory();
 });
 document.querySelectorAll(".deleteRec").forEach(b=>b.onclick=async()=>{
  if(!confirm("このカラー記録を削除しますか？\nアプリ内の写真も削除されますが、スマホに保存されている元の写真は削除されません。"))return;
  let r=data.records.find(x=>x.id===b.dataset.id);for(let p of r.photos||[])await delPhoto(p.id);data.records=data.records.filter(x=>x.id!==b.dataset.id);save();render();
 });
 document.querySelectorAll(".addProgressBtn").forEach(b=>b.onclick=async()=>{
  let box=b.closest(".addProgress"),f=box.querySelector(".progressFile").files[0],d=box.querySelector(".progressDate").value,r=data.records.find(x=>x.id===b.dataset.id);
  if(!f){alert("写真を選んでください。");return}await saveFile(f,"経過",d,r);save();renderHistory();
 });
}
start.onchange=()=>{data.start=start.value;save();render()};
const beforeInput=$("#beforePhoto"), beforePreview=$("#beforePreview"), beforePreviewWrap=$("#beforePreviewWrap");
beforeInput.onchange=()=>{
 const f=beforeInput.files[0];
 if(!f){beforePreviewWrap.hidden=true;return}
 beforePreview.src=URL.createObjectURL(f);
 beforePreviewWrap.hidden=false;
};
$("#clearBefore").onclick=()=>{
 beforeInput.value="";
 beforePreview.removeAttribute("src");
 beforePreviewWrap.hidden=true;
};
$("#recordBtn").onclick=async()=>{
 if(!recordDate.value){alert("日付を選んでください。");return}
 let r={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),date:recordDate.value,color:colorName.value.trim()||"カラー名なし",photos:[]};
 try{
  await saveFile($("#beforePhoto").files[0],"カラー前",r.date,r);
 }catch(e){alert("写真の保存に失敗しました。")}
 data.records.push(r);save();$("#beforePhoto").value="";beforePreview.removeAttribute("src");beforePreviewWrap.hidden=true;colorName.value="";render();
};
render();
