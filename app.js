const STORAGE='delivery-shift-pwa-v2-date-aligned';
const seeded={
  name:'竹谷 健',
  shifts:{
    '2026-09-01':{second:'208',third:'322'},'2026-09-02':{off:true},'2026-09-03':{second:'213',third:'311'},
    '2026-09-04':{second:'204',third:'315'},'2026-09-05':{second:'224',third:'307'},'2026-09-06':{second:'205',third:'317'},
    '2026-09-07':{off:true},'2026-09-08':{second:'214',third:'313'},'2026-09-09':{second:'221',third:'302'},'2026-09-10':{off:true}
  },
  timeMap:{'204':'6:05〜6:15','205':'6:05〜6:15','208':'6:05〜6:15','214':'6:05〜6:15','213':'6:20〜6:30','221':'6:20〜6:30','224':'6:35〜6:45'}
};
let data=load(); let view=new Date(2026,8,1); let selected='2026-09-01'; let preview={}; let deferredPrompt=null;
function load(){try{const x=JSON.parse(localStorage.getItem(STORAGE));return x?{...seeded,...x,shifts:{...seeded.shifts,...(x.shifts||{})},timeMap:{...seeded.timeMap,...(x.timeMap||{})}}:structuredClone(seeded)}catch{return structuredClone(seeded)}}
function save(){localStorage.setItem(STORAGE,JSON.stringify(data))}
function pad(n){return String(n).padStart(2,'0')} function key(y,m,d){return `${y}-${pad(m+1)}-${pad(d)}`}
function norm(s){return (s||'').normalize('NFKC').replace(/\s+/g,'')}
const el=id=>document.getElementById(id);
function render(){
  const y=view.getFullYear(),m=view.getMonth(); el('monthLabel').textContent=`${y}年 ${m+1}月`; el('personLabel').textContent=data.name||'氏名未登録';
  const c=el('calendar');c.innerHTML=''; const start=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
  for(let i=0;i<start;i++){const x=document.createElement('div');x.className='day empty';c.appendChild(x)}
  for(let d=1;d<=days;d++){const k=key(y,m,d),s=data.shifts[k];const b=document.createElement('button');b.className='day'+(k===selected?' selected':'');b.innerHTML=`<div class="date">${d}</div>`;
    if(s?.off)b.innerHTML+=`<div class="off">休</div>`;else if(s){const time=data.timeMap[s.second]||'時間未設定';b.innerHTML+=`<div class="courses">2便 <b>${s.second||'—'}</b><br>3便 <b>${s.third||'—'}</b></div><div class="time">${time}</div>`}
    b.onclick=()=>{selected=k;render();renderDetail()};c.appendChild(b)
  } renderDetail(); renderMap();
}
function renderDetail(){const s=data.shifts[selected],d=new Date(selected+'T00:00:00');const title=`${d.getMonth()+1}月${d.getDate()}日`;
  if(!s){el('detail').innerHTML=`<b>${title}</b><p class="muted">勤務データなし</p>`;return}
  if(s.off){el('detail').innerHTML=`<b>${title}</b><div class="off">休み</div>`;return}
  const t=data.timeMap[s.second]||'時間未設定';el('detail').innerHTML=`<b>${title}</b><div class="detail-grid"><div class="pill"><div class="label">2便</div><div class="value">${s.second||'—'}</div></div><div class="pill"><div class="label">3便</div><div class="value">${s.third||'—'}</div></div></div><div class="bigtime">出勤時間：${t}</div>`
}
function renderMap(){const box=el('timeMap');box.innerHTML='';Object.keys(data.timeMap).sort().forEach(course=>{const r=document.createElement('div');r.className='map-row';r.innerHTML=`<b>${course}</b><input value="${data.timeMap[course]}"><button>削除</button>`;const inp=r.querySelector('input');inp.onchange=()=>{data.timeMap[course]=inp.value;save();render()};r.querySelector('button').onclick=()=>{delete data.timeMap[course];save();render()};box.appendChild(r)})}
el('saveName').onclick=()=>{data.name=el('workerName').value.trim();save();render();el('scanStatus').textContent='氏名を保存しました。'};
el('workerName').value=data.name;
el('prevMonth').onclick=()=>{view=new Date(view.getFullYear(),view.getMonth()-1,1);selected=key(view.getFullYear(),view.getMonth(),1);render()};
el('nextMonth').onclick=()=>{view=new Date(view.getFullYear(),view.getMonth()+1,1);selected=key(view.getFullYear(),view.getMonth(),1);render()};
el('openScanner').onclick=()=>el('photoInput').click();
el('closePreview').onclick=()=>el('ocrPreview').classList.add('hidden');
el('addTime').onclick=()=>{const c=el('newCourse').value.trim(),t=el('newTime').value.trim();if(/^\d{3}$/.test(c)&&t){data.timeMap[c]=t;save();el('newCourse').value='';el('newTime').value='';render()}};
function buildPreview(rows){preview={};const body=el('previewBody');body.innerHTML='';for(let d=1;d<=31;d++){const r=rows[d]||{};preview[d]={second:r.second||'',third:r.third||'',off:!!r.off};const tr=document.createElement('tr');tr.innerHTML=`<td>${d}</td><td><input data-k="second" inputmode="numeric" maxlength="3" value="${preview[d].second}"></td><td><input data-k="third" inputmode="numeric" maxlength="3" value="${preview[d].third}"></td><td><input data-k="off" type="checkbox" ${preview[d].off?'checked':''}></td>`;tr.querySelectorAll('input').forEach(i=>i.oninput=()=>{if(i.dataset.k==='off')preview[d].off=i.checked;else preview[d][i.dataset.k]=i.value.replace(/\D/g,'').slice(0,3)});body.appendChild(tr)}el('ocrPreview').classList.remove('hidden');el('ocrPreview').scrollIntoView({behavior:'smooth'})}
el('commitPreview').onclick=()=>{const y=view.getFullYear(),m=view.getMonth();for(let d=1;d<=31;d++){const r=preview[d],k=key(y,m,d);if(!r)continue;if(r.off){data.shifts[k]={off:true}}else if(r.second||r.third){data.shifts[k]={second:r.second,third:r.third}}}save();render();el('ocrPreview').classList.add('hidden');el('scanStatus').textContent='確認した勤務データを登録しました。'};

async function scan(file){
  const status=el('scanStatus'),wrap=el('scanProgressWrap'),bar=el('scanProgress');wrap.classList.remove('hidden');bar.style.width='2%';
  if(!window.Tesseract){status.textContent='OCR機能を読み込めませんでした。インターネット接続を確認してください。';return}
  status.textContent='写真を読み取っています…';
  try{
    const result=await Tesseract.recognize(file,'jpn+eng',{logger:m=>{if(m.status==='recognizing text')bar.style.width=`${Math.max(5,Math.round(m.progress*100))}%`;status.textContent=`文字を読み取り中… ${Math.round((m.progress||0)*100)}%`}});
    const words=result.data.words||[]; const target=norm(data.name); const all=norm(result.data.text);
    if(target && !all.includes(target)){status.textContent=`「${data.name}」を明確に検出できませんでした。候補を確認してください。`}
    const parsed=parseTable(words,result.data.text);buildPreview(parsed);status.textContent='読取候補を作りました。数字を確認してから登録してください。';bar.style.width='100%';
  }catch(e){console.error(e);const msg={NAME_NOT_FOUND:'登録した氏名を画像内で確認できませんでした。氏名がはっきり写るように撮り直してください。',DATE_HEADER_NOT_FOUND:'日付の見出しを確認できませんでした。日付欄から氏名欄まで入るように真上から撮ってください。',COURSE_ROWS_NOT_FOUND:'本人の2便・3便の行を確実に特定できませんでした。誤登録を防ぐため登録していません。',NO_COURSES_MAPPED:'コース番号と日付の位置を対応できませんでした。誤登録を防ぐため登録していません。'};status.textContent=msg[e.message]||'読み取りに失敗しました。写真を明るく真上から撮って再試行してください。'}finally{setTimeout(()=>wrap.classList.add('hidden'),900)}
}
function centerX(w){return (w.bbox.x0+w.bbox.x1)/2}
function centerY(w){return (w.bbox.y0+w.bbox.y1)/2}
function digits(s){return (s||'').normalize('NFKC').replace(/[^0-9]/g,'')}
function median(arr){const a=[...arr].sort((x,y)=>x-y);if(!a.length)return 0;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function clusterByY(items,tol){const clusters=[];[...items].sort((a,b)=>centerY(a)-centerY(b)).forEach(w=>{const y=centerY(w);let c=clusters.find(c=>Math.abs(c.y-y)<=tol);if(!c){c={y,items:[]};clusters.push(c)}c.items.push(w);c.y=c.items.reduce((n,x)=>n+centerY(x),0)/c.items.length});return clusters}
function findNameBox(words,target){
  if(!target)return null;
  // 1語で認識された場合
  for(const w of words){if(norm(w.text).includes(target)||target.includes(norm(w.text))&&norm(w.text).length>=2)return w.bbox}
  // 氏名が「竹谷」「健」など複数語に割れた場合、同じ行の近接語を連結して探す
  const lines=clusterByY(words,18);
  for(const line of lines){const row=[...line.items].sort((a,b)=>a.bbox.x0-b.bbox.x0);for(let i=0;i<row.length;i++){let joined='';let x0=row[i].bbox.x0,y0=row[i].bbox.y0,x1=row[i].bbox.x1,y1=row[i].bbox.y1;for(let j=i;j<Math.min(row.length,i+4);j++){joined+=norm(row[j].text);x1=Math.max(x1,row[j].bbox.x1);y0=Math.min(y0,row[j].bbox.y0);y1=Math.max(y1,row[j].bbox.y1);if(joined===target||joined.includes(target)){return{x0,y0,x1,y1}}}}
  }
  return null;
}
function findDateHeaders(words,nameY){
  const dayWords=words.filter(w=>{const d=digits(w.text);const n=Number(d);return d.length<=2&&n>=1&&n<=31&&centerY(w)<nameY});
  const clusters=clusterByY(dayWords,16).map(c=>({y:c.y,items:c.items.filter(w=>{const n=Number(digits(w.text));return n>=1&&n<=31})})).filter(c=>c.items.length>=3);
  if(!clusters.length)return null;
  // 日付は横一列に最も多く並ぶ。名前に近いことも加味。
  clusters.sort((a,b)=>(b.items.length-a.items.length)||((nameY-b.y)-(nameY-a.y)));
  const best=clusters[0];
  const seen=new Map();
  best.items.sort((a,b)=>centerX(a)-centerX(b)).forEach(w=>{const d=Number(digits(w.text));if(!seen.has(d))seen.set(d,centerX(w))});
  if(seen.size<3)return null;
  return [...seen.entries()].map(([day,x])=>({day,x})).sort((a,b)=>a.x-b.x);
}
function findCourseLines(words,nameBox){
  const y=(nameBox.y0+nameBox.y1)/2;
  const h=Math.max(18,nameBox.y1-nameBox.y0);
  // 名前行の周辺だけを見る。別の従業員の行は対象外。
  const nums=words.filter(w=>{const d=digits(w.text);const n=Number(d);const cy=centerY(w);return d.length===3&&n>=200&&n<=399&&Math.abs(cy-y)<=Math.max(90,h*3.2)});
  const lines=clusterByY(nums,15).map(c=>({y:c.y,items:c.items}));
  const seconds=lines.filter(l=>l.items.some(w=>{const n=Number(digits(w.text));return n>=200&&n<=299}));
  const thirds=lines.filter(l=>l.items.some(w=>{const n=Number(digits(w.text));return n>=300&&n<=399}));
  if(!seconds.length||!thirds.length)return null;
  let best=null;
  for(const a of seconds)for(const b of thirds){if(b.y<=a.y)continue;const dist=Math.abs(a.y-y)+Math.abs(b.y-y)+(b.y-a.y)*0.25;const count=a.items.length+b.items.length;if(!best||count>best.count||(count===best.count&&dist<best.dist))best={second:a,third:b,count,dist}}
  return best;
}
function nearestDay(x,headers){
  let best=null;for(const h of headers){const dist=Math.abs(h.x-x);if(!best||dist<best.dist)best={day:h.day,dist}}
  const spacings=[];for(let i=1;i<headers.length;i++)spacings.push(headers[i].x-headers[i-1].x);const spacing=median(spacings)||80;
  return best&&best.dist<=spacing*0.46?best.day:null;
}
function parseTable(words,text){
  const target=norm(data.name);
  const nameBox=findNameBox(words,target);
  if(!nameBox)throw new Error('NAME_NOT_FOUND');
  const nameY=(nameBox.y0+nameBox.y1)/2;
  const headers=findDateHeaders(words,nameY);
  if(!headers)throw new Error('DATE_HEADER_NOT_FOUND');
  const lines=findCourseLines(words,nameBox);
  if(!lines)throw new Error('COURSE_ROWS_NOT_FOUND');
  const out={};
  for(const w of lines.second.items){const n=Number(digits(w.text));if(n<200||n>299)continue;const day=nearestDay(centerX(w),headers);if(day)out[day]={...(out[day]||{}),second:String(n)}}
  for(const w of lines.third.items){const n=Number(digits(w.text));if(n<300||n>399)continue;const day=nearestDay(centerX(w),headers);if(day)out[day]={...(out[day]||{}),third:String(n)}}
  // 2便・3便とも空白の列は休み候補。ただし、日付ヘッダーとして実際に検出できた日のみ。
  for(const h of headers){if(!out[h.day])out[h.day]={off:true}}
  if(!Object.values(out).some(r=>r.second||r.third))throw new Error('NO_COURSES_MAPPED');
  return out;
}

el('photoInput').onchange=e=>{const f=e.target.files?.[0];if(f)scan(f);e.target.value=''};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;el('installBtn').classList.remove('hidden')});
el('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null}else{alert('iPhoneではSafariの共有ボタン →「ホーム画面に追加」を選んでください。')}};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn);
render();
