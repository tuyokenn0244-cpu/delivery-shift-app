const STORAGE='delivery-shift-pwa-v1';
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
  }catch(e){console.error(e);status.textContent='読み取りに失敗しました。写真を明るく真上から撮って再試行してください。'}finally{setTimeout(()=>wrap.classList.add('hidden'),900)}
}
function parseTable(words,text){
  const out={};
  // まずOCR文字列から3桁コース番号を拾う。表レイアウトが取れる場合は座標で2段に分ける。
  const nums=words.filter(w=>/^\d{3}$/.test((w.text||'').trim()));
  if(nums.length){
    const ys=nums.map(w=>(w.bbox.y0+w.bbox.y1)/2).sort((a,b)=>a-b); const clusters=[];
    ys.forEach(y=>{let c=clusters.find(c=>Math.abs(c.avg-y)<18);if(!c){c={avg:y,ys:[]};clusters.push(c)}c.ys.push(y);c.avg=c.ys.reduce((a,b)=>a+b,0)/c.ys.length});
    // 最も多く3桁番号が並ぶ近接2行を2便/3便候補とする。
    const lines=clusters.map(c=>({y:c.avg,items:nums.filter(w=>Math.abs(((w.bbox.y0+w.bbox.y1)/2)-c.avg)<18).sort((a,b)=>a.bbox.x0-b.bbox.x0)})).filter(l=>l.items.length>=2).sort((a,b)=>b.items.length-a.items.length);
    if(lines.length>=2){const pair=lines.slice(0,5).sort((a,b)=>a.y-b.y);let best=null;for(let i=0;i<pair.length-1;i++){const score=Math.min(pair[i].items.length,pair[i+1].items.length);if(!best||score>best.score)best={a:pair[i],b:pair[i+1],score}};if(best){const a=best.a.items,b=best.b.items;const n=Math.min(31,Math.max(a.length,b.length));for(let i=0;i<n;i++){out[i+1]={second:a[i]?.text?.trim()||'',third:b[i]?.text?.trim()||''}};return out}}
  }
  // 座標解析が難しい場合は、出現順の3桁番号を2行として仮配置する（必ず確認画面を出す）。
  const flat=(text.match(/\b\d{3}\b/g)||[]).slice(0,62);const half=Math.ceil(flat.length/2);for(let i=0;i<Math.min(31,half);i++)out[i+1]={second:flat[i]||'',third:flat[i+half]||''};return out;
}
el('photoInput').onchange=e=>{const f=e.target.files?.[0];if(f)scan(f);e.target.value=''};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;el('installBtn').classList.remove('hidden')});
el('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null}else{alert('iPhoneではSafariの共有ボタン →「ホーム画面に追加」を選んでください。')}};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn);
render();
