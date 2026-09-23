const STORAGE='delivery-shift-pwa-v3-name-row';
const seeded={
  name:'竹谷 健',
  shifts:{
    '2026-09-01':{second:'208',third:'322'},'2026-09-02':{off:true},'2026-09-03':{second:'213',third:'311'},
    '2026-09-04':{second:'204',third:'315'},'2026-09-05':{second:'224',third:'307'},'2026-09-06':{second:'205',third:'317'},
    '2026-09-07':{off:true},'2026-09-08':{second:'214',third:'313'},'2026-09-09':{second:'221',third:'302'},'2026-09-10':{off:true}
  },
  timeMapVersion:"2026-09-01-complete",
  timeMap:{"201": "6:05〜6:15", "202": "6:05〜6:15", "204": "6:05〜6:15", "205": "6:05〜6:15", "206": "6:05〜6:15", "207": "6:05〜6:15", "208": "6:05〜6:15", "209": "6:05〜6:15", "210": "6:05〜6:15", "211": "6:05〜6:15", "214": "6:05〜6:15", "216": "6:05〜6:15", "203": "6:20〜6:30", "212": "6:20〜6:30", "213": "6:20〜6:30", "215": "6:20〜6:30", "217": "6:20〜6:30", "219": "6:20〜6:30", "221": "6:20〜6:30", "222": "6:20〜6:30", "218": "6:35〜6:45", "220": "6:35〜6:45", "223": "6:35〜6:45", "224": "6:35〜6:45", "225": "6:35〜6:45", "226": "6:35〜6:45"}
};
let storageError='';
let data;try{data=load()}catch(e){storageError='保存済みデータを読み出せません。元データを保護するため保存を停止しています。';data=cloneSeed()}  const today=new Date(); let view=new Date(today.getFullYear(),today.getMonth(),1); let selected=key(today.getFullYear(),today.getMonth(),today.getDate()); let previewMonth=null; let scanning=false; let preview={}; let deferredPrompt=null;
let lastOCR=null; let manualPick={nameX:null,nameY:null,dateX:null,dateY:null,firstDate:null};
function cloneSeed(){return JSON.parse(JSON.stringify(seeded))}
function load(){
 const raw=localStorage.getItem(STORAGE);
 if(raw===null)return cloneSeed();
 const x=JSON.parse(raw);
 if(!x||typeof x!=='object'||Array.isArray(x)||!x.shifts||typeof x.shifts!=='object'||Array.isArray(x.shifts)||!x.timeMap||typeof x.timeMap!=='object'||Array.isArray(x.timeMap))throw new Error('保存データの形式を確認してください');
 // Keep the same key and all existing values, including user-deleted courses.
 return {...seeded,...x,shifts:{...x.shifts},timeMap:{...x.timeMap}};
}
function save(){
 if(storageError)throw new Error(storageError);
 const raw=localStorage.getItem(STORAGE);
 if(raw&&!localStorage.getItem(STORAGE+'-before-v11'))localStorage.setItem(STORAGE+'-before-v11',raw);
 localStorage.setItem(STORAGE,JSON.stringify(data));
}
function changeSavedData(change){const previous=JSON.parse(JSON.stringify(data));try{change();save();return true}catch(e){data=previous;el('scanStatus').textContent=storageError||'保存できませんでした。変更前のデータを維持しています。';return false}}
function pad(n){return String(n).padStart(2,'0')} function key(y,m,d){return `${y}-${pad(m+1)}-${pad(d)}`}
function norm(s){return (s||'').normalize('NFKC').replace(/[\s　・･.。,:：;；()（）\[\]【】]/g,'')}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const el=id=>document.getElementById(id);
function render(){
  const y=view.getFullYear(),m=view.getMonth(); el('monthLabel').textContent=`${y}年 ${m+1}月`; el('personLabel').textContent=data.name||'氏名未登録';
  const c=el('calendar');c.innerHTML=''; const start=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
  for(let i=0;i<start;i++){const x=document.createElement('div');x.className='day empty';c.appendChild(x)}
  for(let d=1;d<=days;d++){const k=key(y,m,d),s=data.shifts[k];const b=document.createElement('button');b.className='day'+(k===selected?' selected':'');b.innerHTML=`<div class="date">${d}</div>`;
    if(s?.off)b.innerHTML+=`<div class="off">休</div>`;else if(s){const time=data.timeMap[s.second]||'時間未設定';b.innerHTML+=`<div class="courses">2便 <b>${esc(s.second||'—')}</b><br>3便 <b>${esc(s.third||'—')}</b></div><div class="time">${esc(time)}</div>`}
    b.onclick=()=>{selected=k;render();renderDetail()};c.appendChild(b)
  } renderDetail(); renderMap();
}
function renderDetail(){const s=data.shifts[selected],d=new Date(selected+'T00:00:00');const title=`${d.getMonth()+1}月${d.getDate()}日`;
  if(!s){el('detail').innerHTML=`<b>${title}</b><p class="muted">勤務データなし</p>`;return}
  if(s.off){el('detail').innerHTML=`<b>${title}</b><div class="off">休み</div>`;return}
  const t=data.timeMap[s.second]||'時間未設定';el('detail').innerHTML=`<b>${title}</b><div class="detail-grid"><div class="pill"><div class="label">2便</div><div class="value">${esc(s.second||'—')}</div></div><div class="pill"><div class="label">3便</div><div class="value">${esc(s.third||'—')}</div></div></div><div class="bigtime">出勤時間：${esc(t)}</div>`
}
function renderMap(){const list=el('knownCourses');list.innerHTML='';Object.keys(data.timeMap).sort().forEach(c=>{const option=document.createElement('option');option.value=c;option.label=data.timeMap[c];list.appendChild(option)});const box=el('timeMap');box.innerHTML='';Object.keys(data.timeMap).sort().forEach(course=>{const r=document.createElement('div');r.className='map-row';r.innerHTML=`<b>${esc(course)}</b><input value="${esc(data.timeMap[course])}"><button>削除</button>`;const inp=r.querySelector('input');inp.onchange=()=>{changeSavedData(()=>data.timeMap[course]=inp.value);render()};r.querySelector('button').onclick=()=>{changeSavedData(()=>delete data.timeMap[course]);render()};box.appendChild(r)})}
el('saveName').onclick=()=>{if(!changeSavedData(()=>data.name=el('workerName').value.trim()))return;render();el('scanStatus').textContent='氏名を保存しました。空白の違いは無視して照合します。'};
el('workerName').value=data.name;el('shiftMonth').value=`${view.getFullYear()}-${pad(view.getMonth()+1)}`;
el('prevMonth').onclick=()=>{view=new Date(view.getFullYear(),view.getMonth()-1,1);selected=key(view.getFullYear(),view.getMonth(),1);render()};
el('nextMonth').onclick=()=>{view=new Date(view.getFullYear(),view.getMonth()+1,1);selected=key(view.getFullYear(),view.getMonth(),1);render()};
el('openScanner').onclick=()=>el('photoInput').click();
el('closePreview').onclick=()=>el('ocrPreview').classList.add('hidden');
el('addTime').onclick=()=>{const c=el('newCourse').value.trim(),t=el('newTime').value.trim();if(/^\d{3}$/.test(c)&&t){if(!changeSavedData(()=>data.timeMap[c]=t))return;el('newCourse').value='';el('newTime').value='';render()}};
function buildPreview(rows,meta={}){
  preview={}; const ym=el('shiftMonth').value;
  if(!/^\d{4}-\d{2}$/.test(ym)){el('scanStatus').textContent='勤務表の年月を選んでください。';return}
  previewMonth=ym; const [y,m]=ym.split('-').map(Number),last=new Date(y,m,0).getDate();
  const body=el('previewBody');body.innerHTML='';
  for(const d of Object.keys(rows).map(Number).sort((a,b)=>a-b)){
    if(d<1||d>last)continue;
    const r=rows[d]||{};preview[d]={second:r.second||'',third:r.third||'',off:!!r.off,states:{...(r.states||{})},include:!!meta.photo};
    const tr=document.createElement('tr');tr.dataset.day=d;
    tr.innerHTML=`<td>${d}日<br><label><input type="checkbox" data-include ${meta.photo?'checked':''}>登録</label></td><td><input aria-label="${d}日 2便" data-k="second" list="knownCourses" inputmode="numeric" maxlength="3" value="${esc(preview[d].second)}"></td><td><input aria-label="${d}日 3便" data-k="third" inputmode="numeric" maxlength="3" value="${esc(preview[d].third)}"></td><td><input aria-label="${d}日 休み" data-k="off" type="checkbox" ${r.off?'checked':''}></td>`;
    for(const type of ['second','third']){
     const input=tr.querySelector(`[data-k="${type}"]`),label=document.createElement('small');label.className='cell-state';label.dataset.stateFor=type;input.after(label);
    }
    const refresh=()=>{for(const type of ['second','third']){const state=preview[d].states[type];tr.querySelector(`[data-state-for="${type}"]`).textContent=state==='unresolved'?'未確定':state==='blank'?'空欄':state==='confirmed'?'確認済み':'候補';tr.querySelector(`[data-k="${type}"]`).classList.toggle('needs-review',state==='unresolved')}};
    tr.querySelectorAll('input').forEach(i=>i.oninput=()=>{
     if(i.hasAttribute('data-include')){preview[d].include=i.checked;return}
     preview[d].include=true;tr.querySelector('[data-include]').checked=true;
     if(i.dataset.k==='off'){preview[d].off=i.checked;if(i.checked){preview[d].second='';preview[d].third='';preview[d].states={second:'blank',third:'blank'};tr.querySelectorAll('[data-k="second"],[data-k="third"]').forEach(x=>x.value='')}}
     else{i.value=i.value.normalize('NFKC').replace(/\D/g,'').slice(0,3);preview[d][i.dataset.k]=i.value;preview[d].states[i.dataset.k]=i.value?'confirmed':'blank';preview[d].off=!preview[d].second&&!preview[d].third&&['second','third'].every(k=>preview[d].states[k]==='blank');tr.querySelector('[data-k="off"]').checked=preview[d].off}
     refresh();
    });
    if(meta.photo){const check=document.createElement('button');check.type='button';check.textContent='原本と照合済み';check.onclick=()=>{preview[d].states={second:preview[d].second?'confirmed':'blank',third:preview[d].third?'confirmed':'blank'};preview[d].off=!preview[d].second&&!preview[d].third;tr.querySelector('[data-k="off"]').checked=preview[d].off;refresh()};tr.firstChild.appendChild(check)}
    refresh();body.appendChild(tr);
  }
  el('previewNote').textContent=`登録先：${y}年${m}月。${meta.nameMode||'手入力'}。${meta.autoOff?'2便・3便とも写真の空欄を確認できた日は休みにチェック済みです。原本と照合してください。':'休みの日にチェックしてください。'}未確定は修正または原本と照合してください。「登録」のチェックを外した日は変更しません。登録対象日は既存データを置き換えます。`;
  el('ocrPreview').classList.remove('hidden');el('ocrPreview').scrollIntoView({behavior:'smooth'});
}
el('manualEntry').onclick=()=>{const ym=el('shiftMonth').value;if(!ym)return;const [y,m]=ym.split('-').map(Number);const rows={};for(let d=1;d<=new Date(y,m,0).getDate();d++)rows[d]={};buildPreview(rows)};
el('commitPreview').onclick=()=>{
  if(!previewMonth)return;
  const entries=Object.entries(preview).filter(([,r])=>r.include);
  if(entries.some(([,r])=>Object.values(r.states).includes('unresolved'))){el('previewNote').textContent='未確定のセルがあります。修正・原本との照合、または日付の登録チェックを外してください。';return}
  for(const [d,r] of entries){
    if((r.off&&(r.second||r.third))||(!r.off&&((r.second&&!/^2\d{2}$/.test(r.second))||(r.third&&!/^3\d{2}$/.test(r.third))))){el('previewNote').textContent=`${d}日を確認してください。休みとコースは同時登録できません。2便は200番台、3便は300番台で入力してください。`;return}
  }
  const next={...data.shifts};let count=0;
  for(const [d,r] of entries){const k=`${previewMonth}-${pad(d)}`;if(r.off){next[k]={off:true};count++}else if(r.second||r.third){next[k]={second:r.second||'',third:r.third||''};count++}}
  if(!count){el('previewNote').textContent='コースを入力するか、休みにチェックを入れてください。';return}
  const previous=data.shifts;data.shifts=next;
  try{save()}catch{data.shifts=previous;el('previewNote').textContent='保存できませんでした。ブラウザの保存容量・設定を確認してください。';return}
  const [y,m]=previewMonth.split('-').map(Number);view=new Date(y,m-1,1);selected=`${previewMonth}-${pad(entries.find(([,r])=>r.off||r.second||r.third)[0])}`;
  render();el('ocrPreview').classList.add('hidden');el('scanStatus').textContent=`${count}日分を${y}年${m}月に登録しました。`;
};


function showManualPicker(canvas){
 manualPick={nameX:null,nameY:null,dateX:null,dateY:null,firstDate:null,lastDate:null};
 const out=el('rowPickerCanvas');out.width=canvas.width;out.height=canvas.height;
 el('firstDateInput').value='';el('lastDateInput').value='';el('firstDateInput').disabled=true;el('lastDateInput').disabled=true;
 el('runManualRead').disabled=true;el('pickerStep').textContent='① 写真の中の自分の名前の中央をタップしてください。';
 el('rowPickerStatus').textContent='氏名の位置から本人の枠を探します。No.は固定しません。';
 el('rowPicker').classList.remove('hidden');el('ocrPreview').classList.add('hidden');drawPickerMarks();el('rowPicker').scrollIntoView({behavior:'smooth',block:'start'});
}
function drawPickerMarks(grid){
 if(!lastOCR?.canvas)return;const out=el('rowPickerCanvas'),ctx=out.getContext('2d');ctx.drawImage(lastOCR.canvas,0,0);
 ctx.lineWidth=Math.max(2,out.width/500);ctx.font=`${Math.max(24,out.width/35)}px sans-serif`;
 for(const [x,y,label,color] of [[manualPick.nameX,manualPick.nameY,'①','#2563eb'],[manualPick.dateX,manualPick.dateY,'②','#dc2626']]){if(x==null)continue;ctx.strokeStyle=color;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,out.width/65,0,Math.PI*2);ctx.stroke();ctx.fillText(label,x+15,y-10)}
 if(grid){ctx.strokeStyle='#16a34a';for(const c of grid.cells)ctx.strokeRect(c.left,c.top,c.width,c.height)}
}
function updateReadButton(){
 const a=Number(el('firstDateInput').value),b=Number(el('lastDateInput').value),ym=el('shiftMonth').value;
 const [y,m]=ym.split('-').map(Number),limit=new Date(y,m,0).getDate();
 manualPick.firstDate=a;manualPick.lastDate=b;
 el('runManualRead').disabled=scanning||!/^\d{4}-\d{2}$/.test(ym)||m<1||m>12||manualPick.dateX==null||!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<a||b>limit;
}
el('rowPickerCanvas').addEventListener('click',e=>{
 if(!lastOCR||scanning)return;const c=el('rowPickerCanvas'),r=c.getBoundingClientRect();const x=(e.clientX-r.left)*c.width/r.width,y=(e.clientY-r.top)*c.height/r.height;
 if(manualPick.nameX==null){manualPick.nameX=x;manualPick.nameY=y;el('pickerStep').textContent='② 写真の一番左の日付をタップしてください。'}
 else{manualPick.dateX=x;manualPick.dateY=y;el('firstDateInput').disabled=false;el('lastDateInput').disabled=false;el('pickerStep').textContent='③ 写真の最初と最後の日付を入力してください。';el('rowPickerStatus').textContent='11〜20日の写真なら「11」と「20」を入力します。日付の文字認識は使いません。'}
 drawPickerMarks();updateReadButton();
});
el('firstDateInput').oninput=updateReadButton;el('lastDateInput').oninput=updateReadButton;el('shiftMonth').onchange=updateReadButton;
el('resetManualPick').onclick=()=>{if(lastOCR&&!scanning)showManualPicker(lastOCR.canvas)};
el('closeRowPicker').onclick=()=>el('rowPicker').classList.add('hidden');
el('pickerManualEntry').onclick=()=>{el('manualEntry').onclick()};
function setReading(busy){
 scanning=busy;for(const id of ['openScanner','takePhoto','manualEntry','shiftMonth','firstDateInput','lastDateInput','resetManualPick','closeRowPicker','pickerManualEntry','runManualRead','rotatePhoto','photoZoom'])el(id).disabled=busy;
 if(!busy)updateReadButton();
}
async function preprocess(file){
 const url=URL.createObjectURL(file);let img;
 try{img=await PhotoReader.deadline(new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url}),20000);
 const scale=Math.min(1,2200/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);canvas.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0,canvas.width,canvas.height);return canvas;
 }finally{URL.revokeObjectURL(url)}
}
let autoGeneration=0;
async function scan(file){
 if(scanning)return;const generation=++autoGeneration;setReading(true);lastOCR=null;el('ocrPreview').classList.add('hidden');el('rowPicker').classList.add('hidden');
 try{el('scanStatus').textContent='写真を表示しています…';const canvas=await preprocess(file);lastOCR={canvas};showManualPicker(canvas);el('scanStatus').textContent='氏名と日付を自動検出しています。手動指定で続けることもできます。';
 el('skipAuto').classList.remove('hidden');
 try{const pick=await PhotoReader.detect(canvas,data.name);if(generation!==autoGeneration)return;
 manualPick=pick;el('firstDateInput').value=pick.firstDate;el('lastDateInput').value=pick.lastDate;drawPickerMarks();el('pickerStep').textContent='検出位置と日付を確認して「この位置で読み取る」を押してください。';el('rowPickerStatus').textContent='氏名・日付を検出しました。緑の枠が本人の2便・3便か確認してください。';
 const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);drawPickerMarks(ShiftGrid.locateGrid(pixels,pick));
 }catch(e){if(generation!==autoGeneration)return;showManualPicker(canvas);el('scanStatus').textContent='自動検出を確定できませんでした。写真の自分の名前をタップして続けてください。'}
 }catch{el('scanStatus').textContent='写真を開けませんでした。「勤務表を撮る / 選ぶ」で再試行するか、手入力で続けてください。'}
 finally{if(generation===autoGeneration){setReading(false);el('firstDateInput').disabled=manualPick.dateX==null;el('lastDateInput').disabled=manualPick.dateX==null;el('skipAuto').classList.add('hidden')}}
}
el('skipAuto').onclick=()=>{autoGeneration++;PhotoReader.cancelAuto();setReading(false);showManualPicker(lastOCR.canvas);el('skipAuto').classList.add('hidden')};
el('runManualRead').onclick=async()=>{
 updateReadButton();if(el('runManualRead').disabled||!lastOCR)return;
 setReading(true);const status=el('rowPickerStatus'),wrap=el('scanProgressWrap'),bar=el('scanProgress');wrap.classList.remove('hidden');bar.style.width='2%';
 try{
  status.textContent='本人の枠線と日付の列を確認しています…';
  const canvas=lastOCR.canvas,pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height),grid=ShiftGrid.locateGrid(pixels,{...manualPick});drawPickerMarks(grid);
  const {rows,evidence:snippets}=await PhotoReader.readCells(pixels,grid,(c,i,total)=>{status.textContent=`${c.day}日・${c.type==='second'?'2便':'3便'}を読取中 (${i+1}/${total})`;bar.style.width=`${Math.round((i+1)/total*100)}%`});
  el('debugOutput').textContent=JSON.stringify({dateColumns:grid.edges,row:{top:grid.top,bottom:grid.bottom},cells:snippets.map(({url,...c})=>c)},null,2);
  buildPreview(rows,{photo:true,autoOff:true,nameMode:'セル位置で読取。原本のマスと候補を照合'});
  const trs=[...el('previewBody').children];for(const item of snippets){const tr=trs.find(t=>Number(t.dataset.day)===item.day);if(!tr)continue;const input=tr.querySelector(`[data-k="${item.type}"]`);const img=document.createElement('img');img.src=item.url;img.alt=`${item.day}日 ${item.type==='second'?'2便':'3便'} 原本`;img.className='cell-source';input.parentElement.appendChild(img);if(!rows[item.day].off&&(!item.value||item.confidence<85)){input.classList.add('needs-review');input.title='元のマスと照合してください'}}
  el('rowPicker').classList.add('hidden');el('scanStatus').textContent='読み取り候補と元のマスを照合してください。写真で2便・3便とも空欄の休み候補にチェックしました。原本と照合してから登録してください。';
 }catch(e){
  const errors={ROW_GRID_NOT_FOUND:'氏名の上下の枠線を確認できません。名前の中央を指定し直してください。',COLUMN_GRID_NOT_FOUND:'指定した日数分の列を確認できません。最初の日付の位置と、最初・最後の日付を確認してください。',OCR_UNAVAILABLE:'文字読み取りのファイルを読み込めません。アップロード内容と通信状態を確認してください。'};
  status.textContent=errors[e.message]||'読み取りを完了できませんでした。通信状態を確認して再実行するか、手入力で続けてください。';
 }finally{wrap.classList.add('hidden');setReading(false)}
};
el('takePhoto').onclick=()=>el('cameraInput').click();
el('cameraInput').onchange=e=>{const f=e.target.files?.[0];if(f)scan(f);e.target.value=''};
el('photoInput').onchange=e=>{const f=e.target.files?.[0];if(f)scan(f);e.target.value=''};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;el('installBtn').classList.remove('hidden')});
el('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null}};
if('serviceWorker'in navigator){
 navigator.serviceWorker.register('./sw.js?v=11',{updateViaCache:'none'}).then(r=>{r.update().catch(()=>{});document.addEventListener('visibilitychange',()=>{if(!document.hidden)r.update().catch(()=>{})})}).catch(console.warn);
 navigator.serviceWorker.addEventListener('controllerchange',()=>{el('updateNotice').classList.remove('hidden')});
}
el('reloadApp').onclick=()=>location.reload();
if(storageError){el('scanStatus').textContent=storageError;el('commitPreview').disabled=true}

render();

el('backToPhoto').onclick=()=>{if(lastOCR)showManualPicker(lastOCR.canvas);else el('photoInput').click()};

el('photoZoom').onchange=()=>{el('rowPickerCanvas').style.width=`${Number(el('photoZoom').value)*100}%`};
el('rotatePhoto').onclick=()=>{if(!lastOCR||scanning)return;const old=lastOCR.canvas,c=document.createElement('canvas');c.width=old.height;c.height=old.width;const ctx=c.getContext('2d');ctx.translate(c.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(old,0,0);lastOCR={canvas:c};showManualPicker(c)};
