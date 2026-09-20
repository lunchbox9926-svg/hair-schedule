const $=s=>document.querySelector(s);
const start=$("#start"), timeline=$("#timeline"), dayCount=$("#dayCount"), next=$("#next");
const recordDate=$("#recordDate"), history=$("#history");
const KEY="hairScheduleDataV1";
let data=JSON.parse(localStorage.getItem(KEY)||'{"start":"","history":[]}');
const iso=d=>{let x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`};
const jp=d=>new Intl.DateTimeFormat("ja-JP",{year:"numeric",month:"long",day:"numeric"}).format(d);
const addDays=(d,n)=>{let x=new Date(d);x.setDate(x.getDate()+n);return x};
const addMonths=(d,n)=>{let x=new Date(d);x.setMonth(x.getMonth()+n);return x};
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function render(){
 start.value=data.start;
 recordDate.value=iso(new Date());
 if(!data.start){dayCount.textContent="日付を設定してください";next.textContent="";timeline.innerHTML="";renderHistory();return}
 const s=new Date(data.start+"T00:00:00"), today=new Date(); today.setHours(0,0,0,0);
 const days=Math.floor((today-s)/86400000);
 dayCount.textContent=days>=0?`カラーから ${days} 日目`:`開始まで ${-days} 日`;
 const events=[
  ["2週間","色落ちを確認。必要なら補充を検討",addDays(s,14)],
  ["1か月","色味・ダメージを確認",addMonths(s,1)],
  ["4か月","ブリーチ予定ならカラーバター最終目安",addMonths(s,4)],
  ["6か月","残留色を確認し、次のカラーを検討",addMonths(s,6)]
 ];
 timeline.innerHTML=events.map(e=>`<div class="item"><strong>${e[0]}｜${e[1]}</strong><div class="date">${jp(e[2])}</div></div>`).join("");
 const upcoming=events.find(e=>e[2]>=today);
 next.textContent=upcoming?`次の目安：${upcoming[0]}（${jp(upcoming[2])}）`:"6か月の予定期間を過ぎています";
 renderHistory();
}
function renderHistory(){
 history.innerHTML=data.history.length?data.history.slice().sort().reverse().map((d,i)=>`<div class="historyItem"><span>${d}</span><button class="delete" data-d="${d}">削除</button></div>`).join(""):"<p>まだ記録はありません。</p>";
 document.querySelectorAll(".delete").forEach(b=>b.onclick=()=>{data.history=data.history.filter(x=>x!==b.dataset.d);save();render()});
}
start.onchange=()=>{data.start=start.value;save();render()};
$("#recordBtn").onclick=()=>{if(!recordDate.value)return;if(!data.history.includes(recordDate.value))data.history.push(recordDate.value);save();render()};
render();