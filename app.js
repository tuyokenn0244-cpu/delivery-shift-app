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
  render();el('ocrPreview').classList.add('hidden');feedback.show(`${count}日分を${y}年${m}月に登録しました。`,'success');
};


const feedback=window.ScanFeedback;
let photoState='empty',activeRead=null,autoGeneration=0,autoActive=false,rowTapMode=null;
const positionText=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)?`x=${Math.round(x)} y=${Math.round(y)}`:'未指定';
function logPositions(){feedback.log(`画像：${photoState==='ready'?'読み込み済み':photoState} / 氏名位置：${positionText(manualPick.nameX,manualPick.nameY)} / 日付位置：${positionText(manualPick.dateX,manualPick.dateY)}`)}
function stopAuto(){autoGeneration++;autoActive=false;if(window.PhotoReader)PhotoReader.cancelAuto();el('skipAuto').classList.add('hidden')}
function dateValue(id){const v=el(id).value.normalize('NFKC').trim();return /^\d+$/.test(v)?Number(v):NaN}
function readValidation(){
 if(photoState==='loading')return '写真を読み込み中です。準備ができるまでお待ちください。';
 if(photoState!=='ready'||!lastOCR||!lastOCR.canvas||!lastOCR.canvas.width||!lastOCR.canvas.height)return '勤務表の写真を選んでください。';
 if(!Number.isFinite(manualPick.nameX)||!Number.isFinite(manualPick.nameY))return '自分の名前の位置をタップしてください。';
 if(!Number.isFinite(manualPick.dateX)||!Number.isFinite(manualPick.dateY))return '最初の日付をタップしてください。';
 const ym=el('shiftMonth').value,[y,m]=ym.split('-').map(Number);
 if(!/^\d{4}-\d{2}$/.test(ym)||m<1||m>12)return '勤務表の年月を選んでください。';
 const a=dateValue('firstDateInput'),b=dateValue('lastDateInput'),limit=new Date(y,m,0).getDate();
 if(!Number.isInteger(a)||a<1||a>limit)return `写真の最初の日付を1〜${limit}の数字で入力してください。`;
 if(!Number.isInteger(b)||b<a||b>limit)return `写真の最後の日付を${a}〜${limit}の数字で入力してください。`;
 manualPick.firstDate=a;manualPick.lastDate=b;return '';
}
function updateReadButton(){
 const button=el('runManualRead');button.disabled=photoState!=='ready';
 // Missing fields remain clickable so a tap can explain exactly what is missing.
 button.textContent=scanning&&photoState==='ready'?'読み取り中…':'シフトを読み取る';
 const hint=el('readButtonHint');hint.textContent=scanning?'処理中です。中止して再指定できます。':readValidation()||'準備完了。「シフトを読み取る」を押してください。';
}
function refreshControls(){
 for(const id of ['pickSecondRow','pickThirdRow','rowStepInput'])el(id).disabled=scanning||photoState!=='ready';
 for(const id of ['openScanner','takePhoto','manualEntry','shiftMonth','firstDateInput','lastDateInput','resetManualPick','closeRowPicker','pickerManualEntry','rotatePhoto','photoZoom'])el(id).disabled=scanning;
 el('cancelRead').classList.toggle('hidden',!activeRead);el('rowPicker').setAttribute('aria-busy',String(scanning));updateReadButton();
}
function setReading(busy){scanning=busy;refreshControls()}
function showManualPicker(canvas){
 rowTapMode=null;el('rowStepInput').value='';
 manualPick={nameX:null,nameY:null,dateX:null,dateY:null,firstDate:null,lastDate:null};
 const out=el('rowPickerCanvas');out.width=canvas.width;out.height=canvas.height;
 el('firstDateInput').value='';el('lastDateInput').value='';
 el('pickerStep').textContent='① 写真の中の自分の名前の中央をタップしてください。';
 el('rowPicker').classList.remove('hidden');el('ocrPreview').classList.add('hidden');drawPickerMarks();refreshControls();
 el('rowPicker').scrollIntoView({behavior:'smooth',block:'start'});
}
function drawPickerMarks(grid){
 if(!lastOCR||!lastOCR.canvas)return;const out=el('rowPickerCanvas'),ctx=out.getContext('2d');if(!ctx)throw new Error('CANVAS_UNAVAILABLE');ctx.drawImage(lastOCR.canvas,0,0);
 ctx.lineWidth=Math.max(2,out.width/500);ctx.font=`${Math.max(24,out.width/35)}px sans-serif`;
 for(const [x,y,label,color] of [[manualPick.nameX,manualPick.nameY,'①','#2563eb'],[manualPick.dateX,manualPick.dateY,'②','#dc2626']]){if(!Number.isFinite(x)||!Number.isFinite(y))continue;ctx.strokeStyle=color;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,out.width/65,0,Math.PI*2);ctx.stroke();ctx.fillText(label,x+15,y-10)}
 if(grid){ctx.strokeStyle='#16a34a';for(const c of grid.cells)ctx.strokeRect(c.left,c.top,c.width,c.height)}
 for(const [y,label] of [[manualPick.secondY,'2便'],[manualPick.thirdY,'3便']]){if(!Number.isFinite(y))continue;ctx.strokeStyle='#9333ea';ctx.fillStyle='#9333ea';ctx.beginPath();ctx.moveTo(manualPick.dateX||0,y);ctx.lineTo(out.width,y);ctx.stroke();ctx.fillText(label,Math.max(0,(manualPick.dateX||0)-70),y-5)}
}
function requestRowTap(type){if(scanning)return;rowTapMode=type;const message=type==='second'?'2便の行をタップしてください。最初の日付列の2便セル中央を指定すると、3便は自動推定します。':'最初の日付列の3便セル中央をタップしてください（任意の修正）。';el('pickerStep').textContent=message;feedback.show(message);el('rowPicker').classList.remove('hidden');el('pickerStep').scrollIntoView({block:'start',behavior:'smooth'})}
el('pickSecondRow').onclick=()=>requestRowTap('second');
el('pickThirdRow').onclick=()=>{if(!Number.isFinite(manualPick.secondY)){requestRowTap('second');return}requestRowTap('third')};
el('rowStepInput').oninput=()=>{manualPick.rowStep=Number(el('rowStepInput').value)||null;if(Number.isFinite(manualPick.secondY)){manualPick.thirdY=null;drawPickerMarks();feedback.show('行間隔を変更しました。「シフトを読み取る」で確認できます。')}};
el('rowPickerCanvas').addEventListener('click',e=>{
 try{
  if(scanning){feedback.show('読み取り中…終了または中止してから位置を指定してください。');return}
  if(photoState!=='ready'||!lastOCR){feedback.show('写真の準備ができるまでお待ちください。');return}
  stopAuto();const c=el('rowPickerCanvas'),r=c.getBoundingClientRect();
  if(!r.width||!r.height)throw new Error('写真の表示サイズを取得できません');
  const x=(e.clientX-r.left)*c.width/r.width,y=(e.clientY-r.top)*c.height/r.height;
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=c.width||y>=c.height)throw new Error('写真の内側をタップしてください');
  if(rowTapMode){const type=rowTapMode;manualPick[type+'Y']=y;manualPick[type+'X']=x;if(type==='second'){manualPick.secondX=x;manualPick.thirdY=null}rowTapMode=null;el('pickerStep').textContent='行位置を指定しました。「シフトを読み取る」を押してください。';feedback.log(`${type==='second'?'2便':'3便'}の行：タップ y=${Math.round(y)}`);feedback.show(type==='second'?'2便の行を指定しました。3便は行間隔から推定します。「シフトを読み取る」を押してください。':'3便の行を修正しました。「シフトを読み取る」を押してください。')}
  else if(manualPick.nameX==null){manualPick.nameX=x;manualPick.nameY=y;el('pickerStep').textContent='② 写真の一番左の日付をタップしてください。';feedback.show('氏名位置を指定しました。最初の日付をタップしてください。')}
  else{manualPick.dateX=x;manualPick.dateY=y;el('pickerStep').textContent='③ 最初・最後の日付を入力し「シフトを読み取る」を押してください。';feedback.show('日付位置を指定しました。最初・最後の日付を確認してください。')}
  drawPickerMarks();logPositions();updateReadButton();
 }catch(error){feedback.fail(error)}
});
for(const id of ['firstDateInput','lastDateInput','shiftMonth']){
 for(const event of ['input','change'])el(id).addEventListener(event,()=>{try{updateReadButton()}catch(error){feedback.fail(error)}});
}
el('resetManualPick').onclick=()=>{try{if(lastOCR&&!scanning){stopAuto();showManualPicker(lastOCR.canvas);feedback.show('写真の準備ができました。自分の名前の位置をタップしてください。')}}catch(e){feedback.fail(e)}};
el('closeRowPicker').onclick=()=>el('rowPicker').classList.add('hidden');
el('pickerManualEntry').onclick=()=>el('manualEntry').onclick();
async function preprocess(file){
 const url=URL.createObjectURL(file);let img,timer;
 try{
 img=await new Promise((resolve,reject)=>{const i=new Image();timer=setTimeout(()=>{i.onload=null;i.onerror=null;reject(new Error('IMAGE_TIMEOUT'))},20000);i.onload=()=>{clearTimeout(timer);resolve(i)};i.onerror=()=>{clearTimeout(timer);reject(new Error('IMAGE_DECODE_FAILED'))};i.src=url});
 if(!img.naturalWidth||!img.naturalHeight)throw new Error('IMAGE_DECODE_FAILED');
 const scale=Math.min(1,2200/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('CANVAS_UNAVAILABLE');ctx.drawImage(img,0,0,canvas.width,canvas.height);return canvas;
 }finally{clearTimeout(timer);URL.revokeObjectURL(url)}
}
async function attemptAuto(canvas,generation){
 try{
  if(!window.PhotoReader)throw new Error('OCR_UNAVAILABLE');
  const pick=await PhotoReader.detect(canvas,data.name);
  if(generation!==autoGeneration||scanning)return;
  manualPick=pick;el('firstDateInput').value=pick.firstDate;el('lastDateInput').value=pick.lastDate;drawPickerMarks();
  feedback.show('氏名・日付の候補を検出しました。位置と日付を確認して「シフトを読み取る」を押してください。');logPositions();
 }catch(error){
  if(generation!==autoGeneration)return;
  feedback.log('自動検出：手動指定へ / '+feedback.errorText(error));
  feedback.show('写真の準備ができました。自動検出を確定できないため、自分の名前の位置をタップしてください。');
 }finally{if(generation===autoGeneration){autoActive=false;el('skipAuto').classList.add('hidden');updateReadButton()}}
}
async function scan(file){
 if(scanning){feedback.show('処理中です。終了または中止してから写真を選んでください。');return}
 stopAuto();const generation=autoGeneration;lastOCR=null;photoState='loading';scanning=true;
 try{
  refreshControls();el('ocrPreview').classList.add('hidden');el('rowPicker').classList.add('hidden');el('debugOutput').textContent='';feedback.show('写真を読み込み中…');feedback.log('画像：読み込み開始');
  const canvas=await preprocess(file);lastOCR={canvas};photoState='ready';scanning=false;showManualPicker(canvas);
  feedback.show('写真の準備ができました。自分の名前の位置をタップしてください。');logPositions();
  autoActive=true;el('skipAuto').classList.remove('hidden');feedback.log('自動検出：開始（タップ指定で中止できます）');
  void attemptAuto(canvas,generation);
 }catch(error){photoState='error';lastOCR=null;feedback.fail(error)}
 finally{scanning=false;refreshControls()}
}
el('skipAuto').onclick=()=>{stopAuto();feedback.show('写真の準備ができました。自分の名前の位置をタップしてください。');refreshControls()};
const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
function readFailure(error){
 const descriptions={ROW_GRID_NOT_FOUND:'氏名の上下の枠線を確認してください。名前の中央を指定し直せます',COLUMN_GRID_NOT_FOUND:'最初の日付の位置と、最初・最後の日付を確認してください',OCR_UNAVAILABLE:'OCRファイルの読み込みと通信状態を確認してください',CANVAS_UNAVAILABLE:'写真を表示するためのメモリが不足していないか確認し、写真を選び直してください',OCR_TIMEOUT:'OCRが時間内に応答しませんでした。通信状態を確認して再試行してください',GRID_TIMEOUT:'枠線の解析が時間内に終わりませんでした。写真の向きと位置指定を確認してください',OCR_RESULT_INVALID:'OCR結果が不正です。写真を確認し、再試行してください'};
 feedback.log('ERROR: '+feedback.errorText(error));feedback.show('読み取りに失敗しました。'+(descriptions[error.message]||feedback.errorText(error)+'。写真・入力内容・通信状態を確認してください。'), 'error');
}
window.startShiftRead=async function(){
 let job=null,timer=null;
 try{
  if(scanning){feedback.show(photoState==='loading'?'写真を読み込み中です。準備ができるまでお待ちください。':'読み取り中…すでに処理を実行しています。');return}
  logPositions();const missing=readValidation();
  if(missing){feedback.show('入力不足：'+missing,'error');updateReadButton();return}
  stopAuto();job={controller:new AbortController(),started:Date.now()};activeRead=job;setReading(true);
  el('scanProgressWrap').classList.remove('hidden');el('scanProgress').style.width='2%';el('ocrPreview').classList.add('hidden');
  feedback.show('読み取り中…');feedback.log('枠線解析：開始');
  // Paint the feedback before copying pixels or doing any analysis.
  await nextPaint();
  timer=setInterval(()=>feedback.log(`処理中：${Math.floor((Date.now()-job.started)/1000)}秒経過`),10000);
  if(!window.PhotoReader||typeof PhotoReader.locateGrid!=='function')throw new Error('OCR_UNAVAILABLE');
  if(!window.ShiftGrid)throw new Error('GRID_LIBRARY_UNAVAILABLE');
  const canvas=lastOCR.canvas,ctx=canvas.getContext('2d');if(!ctx)throw new Error('CANVAS_UNAVAILABLE');
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
  const grid=await PhotoReader.locateGrid(pixels,{...manualPick},job.controller.signal);
  for(const line of grid.diagnostics||[])feedback.log(line);
  if(grid.needsRowTap){manualPick.rowStep=grid.suggestedStep;el('rowStepInput').value=Math.round(grid.suggestedStep);scanning=false;requestRowTap('second');return}
  drawPickerMarks(grid);feedback.log('枠線解析：完了');
  feedback.show('読み取り中…OCRを準備しています。');feedback.log('OCR：開始');
  const result=await PhotoReader.readCells(pixels,grid,(c,i,total)=>{
   feedback.show(`読み取り中…${c.day}日・${c.type==='second'?'2便':'3便'} (${i+1}/${total})`);el('scanProgress').style.width=`${Math.round((i+1)/total*100)}%`;
  },job.controller.signal);
  if(job.controller.signal.aborted)throw new Error('READ_CANCELLED');
  if(!result||!result.rows||!Array.isArray(result.evidence)||result.evidence.length!==grid.cells.length)throw new Error('OCR_RESULT_INVALID');
  const {rows,evidence:snippets}=result;feedback.log('OCR：完了');
  el('debugOutput').textContent=JSON.stringify({dateColumns:grid.edges,row:{top:grid.top,bottom:grid.bottom},cells:snippets.map(({url,...c})=>c)},null,2);
  buildPreview(rows,{photo:true,autoOff:true,nameMode:'セル位置で読取。原本のマスと候補を照合'});
  const trs=[...el('previewBody').children];if(!trs.length||el('ocrPreview').classList.contains('hidden'))throw new Error('確認画面を表示できません。年月と日付を確認してください');
  for(const item of snippets){const tr=trs.find(t=>Number(t.dataset.day)===item.day);if(!tr)continue;const input=tr.querySelector(`[data-k="${item.type}"]`),img=document.createElement('img');img.src=item.url;img.alt=`${item.day}日 ${item.type==='second'?'2便':'3便'} 原本`;img.className='cell-source';input.parentElement.appendChild(img)}
  el('rowPicker').classList.add('hidden');feedback.log('確認画面：表示');feedback.show('読み取りが完了しました。候補を確認・修正してから「この内容で登録」を押してください。','success');
 }catch(error){
  if(error.message==='READ_CANCELLED'){feedback.log('OCR：中止');feedback.show('読み取りを中止しました。位置を確認して再試行できます。')}
  else if(['ROW_GRID_NOT_FOUND','GRID_TIMEOUT','ROW_SPACING_INVALID'].includes(error.message)){feedback.log('行の自動推定：手動補助へ / '+error.message);scanning=false;requestRowTap('second')}
  else readFailure(error);
 }finally{
  if(job){clearInterval(timer);job.controller.abort();if(activeRead===job)activeRead=null;scanning=false;el('scanProgressWrap').classList.add('hidden');refreshControls()}
 }
};
el('cancelRead').onclick=()=>{if(activeRead){activeRead.controller.abort();feedback.show('読み取りを中止しています…')}};
el('takePhoto').onclick=()=>el('cameraInput').click();
for(const id of ['cameraInput','photoInput'])el(id).onchange=e=>{const file=e.target.files&&e.target.files[0];if(file)void scan(file);e.target.value=''};
feedback.log('読み取りボタン：イベント登録済み（click / タッチ・キーボード対応）');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;el('installBtn').classList.remove('hidden')});
el('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null}};
if('serviceWorker'in navigator){
 navigator.serviceWorker.register('./sw.js?v=13',{updateViaCache:'none'}).then(r=>{r.update().catch(()=>{});document.addEventListener('visibilitychange',()=>{if(!document.hidden)r.update().catch(()=>{})})}).catch(console.warn);
 navigator.serviceWorker.addEventListener('controllerchange',()=>{el('updateNotice').classList.remove('hidden')});
}
el('reloadApp').onclick=()=>location.reload();
if(storageError){el('scanStatus').textContent=storageError;el('commitPreview').disabled=true}

render();

el('backToPhoto').onclick=()=>{if(lastOCR){stopAuto();showManualPicker(lastOCR.canvas);feedback.show('写真の準備ができました。位置を指定し直してください。')}else el('photoInput').click()};

el('photoZoom').onchange=()=>{el('rowPickerCanvas').style.width=`${Number(el('photoZoom').value)*100}%`};
el('rotatePhoto').onclick=()=>{if(!lastOCR||scanning)return;stopAuto();const old=lastOCR.canvas,c=document.createElement('canvas');c.width=old.height;c.height=old.width;const ctx=c.getContext('2d');ctx.translate(c.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(old,0,0);lastOCR={canvas:c};showManualPicker(c)};

refreshControls();
