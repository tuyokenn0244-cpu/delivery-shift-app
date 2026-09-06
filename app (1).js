const STORAGE='delivery-shift-pwa-v3-name-row';
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
let lastOCR=null; let manualPick={nameX:null,nameY:null,dateX:null,dateY:null,firstDate:null};
function cloneSeed(){return JSON.parse(JSON.stringify(seeded))}
function load(){try{const x=JSON.parse(localStorage.getItem(STORAGE));return x?{...seeded,...x,shifts:{...seeded.shifts,...(x.shifts||{})},timeMap:{...seeded.timeMap,...(x.timeMap||{})}}:cloneSeed()}catch{return cloneSeed()}}
function save(){localStorage.setItem(STORAGE,JSON.stringify(data))}
function pad(n){return String(n).padStart(2,'0')} function key(y,m,d){return `${y}-${pad(m+1)}-${pad(d)}`}
function norm(s){return (s||'').normalize('NFKC').replace(/[\s　・･.。,:：;；()（）\[\]【】]/g,'')}
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
el('saveName').onclick=()=>{data.name=el('workerName').value.trim();save();render();el('scanStatus').textContent='氏名を保存しました。空白の違いは無視して照合します。'};
el('workerName').value=data.name;
el('prevMonth').onclick=()=>{view=new Date(view.getFullYear(),view.getMonth()-1,1);selected=key(view.getFullYear(),view.getMonth(),1);render()};
el('nextMonth').onclick=()=>{view=new Date(view.getFullYear(),view.getMonth()+1,1);selected=key(view.getFullYear(),view.getMonth(),1);render()};
el('openScanner').onclick=()=>el('photoInput').click();
el('closePreview').onclick=()=>el('ocrPreview').classList.add('hidden');
el('addTime').onclick=()=>{const c=el('newCourse').value.trim(),t=el('newTime').value.trim();if(/^\d{3}$/.test(c)&&t){data.timeMap[c]=t;save();el('newCourse').value='';el('newTime').value='';render()}};
function buildPreview(rows,meta={}){preview={};const body=el('previewBody');body.innerHTML='';const days=Object.keys(rows).map(Number).filter(n=>n>=1&&n<=31);const minDay=days.length?Math.min(...days):1,maxDay=days.length?Math.max(...days):31;
  for(let d=minDay;d<=maxDay;d++){const r=rows[d]||{};preview[d]={second:r.second||'',third:r.third||'',off:!!r.off};const tr=document.createElement('tr');tr.innerHTML=`<td>${d}</td><td><input data-k="second" inputmode="numeric" maxlength="3" value="${preview[d].second}"></td><td><input data-k="third" inputmode="numeric" maxlength="3" value="${preview[d].third}"></td><td><input data-k="off" type="checkbox" ${preview[d].off?'checked':''}></td>`;tr.querySelectorAll('input').forEach(i=>i.oninput=()=>{if(i.dataset.k==='off')preview[d].off=i.checked;else preview[d][i.dataset.k]=i.value.replace(/\D/g,'').slice(0,3)});body.appendChild(tr)}
  const note=el('previewNote'); if(note) note.textContent=meta.nameMode?`本人行の検出：${meta.nameMode}。日付の横位置に合わせて候補を作成しました。`:'日付の横位置に合わせて候補を作成しました。';
  el('ocrPreview').classList.remove('hidden');el('ocrPreview').scrollIntoView({behavior:'smooth'})}
el('commitPreview').onclick=()=>{const y=view.getFullYear(),m=view.getMonth();for(const dStr of Object.keys(preview)){const d=Number(dStr),r=preview[d],k=key(y,m,d);if(r.off){data.shifts[k]={off:true}}else if(r.second||r.third){data.shifts[k]={second:r.second,third:r.third}}else{delete data.shifts[k]}}save();render();el('ocrPreview').classList.add('hidden');el('scanStatus').textContent='確認した勤務データを登録しました。出勤時間は登録済みのコース時間表から表示します。'};

function showManualPicker(canvas,reason='自動認識が不安定でした。'){
  const box=el('rowPicker'), out=el('rowPickerCanvas'), status=el('rowPickerStatus'), step=el('pickerStep'), firstDate=el('firstDateInput'), runBtn=el('runManualRead');
  manualPick={nameX:null,nameY:null,dateX:null,dateY:null,firstDate:null};
  out.width=canvas.width; out.height=canvas.height;
  const ctx=out.getContext('2d'); ctx.clearRect(0,0,out.width,out.height); ctx.drawImage(canvas,0,0);
  step.textContent='① 写真の中の自分の名前をタップしてください。';
  status.textContent=reason+' 写真上で「自分の名前」→「最初の日付」の順にタップします。';
  firstDate.value=''; firstDate.disabled=true; runBtn.disabled=true;
  box.classList.remove('hidden'); box.scrollIntoView({behavior:'smooth',block:'start'});
  drawPickerMarks();
}
function drawPickerMarks(){
  if(!lastOCR?.canvas)return;
  const out=el('rowPickerCanvas'), ctx=out.getContext('2d');
  ctx.clearRect(0,0,out.width,out.height); ctx.drawImage(lastOCR.canvas,0,0);
  ctx.save(); ctx.lineWidth=Math.max(4,out.width/500); ctx.font=`${Math.max(26,out.width/32)}px sans-serif`;
  if(manualPick.nameX!=null){ctx.strokeStyle='#2563eb';ctx.fillStyle='#2563eb';ctx.beginPath();ctx.arc(manualPick.nameX,manualPick.nameY,Math.max(14,out.width/70),0,Math.PI*2);ctx.stroke();ctx.fillText('①',manualPick.nameX+18,manualPick.nameY-12)}
  if(manualPick.dateX!=null){ctx.strokeStyle='#dc2626';ctx.fillStyle='#dc2626';ctx.beginPath();ctx.arc(manualPick.dateX,manualPick.dateY,Math.max(14,out.width/70),0,Math.PI*2);ctx.stroke();ctx.fillText('②',manualPick.dateX+18,manualPick.dateY-12)}
  ctx.restore();
}
function nearestRecognizedDay(words,x,y){
  let best=null;
  for(const w of words){const d=digits(w.text),n=Number(d);if(!d||d.length>2||n<1||n>31)continue;const dx=centerX(w)-x,dy=centerY(w)-y,dist=Math.hypot(dx,dy*1.5);if(!best||dist<best.dist)best={day:n,dist,w}}
  return best&&best.dist<Math.max(90,lastOCR?.canvas?.width*0.06||90)?best.day:null;
}
function clusterByX(items,tol){
  const clusters=[];[...items].sort((a,b)=>centerX(a)-centerX(b)).forEach(w=>{const x=centerX(w);let c=clusters.find(c=>Math.abs(c.x-x)<=tol);if(!c){c={x,items:[]};clusters.push(c)}c.items.push(w);c.x=c.items.reduce((n,z)=>n+centerX(z),0)/c.items.length});return clusters;
}
function findTableColumns(words,minX){
  const nums=words.filter(w=>{const d=digits(w.text),n=Number(d);return d.length===3&&n>=200&&n<=399&&centerX(w)>minX});
  if(nums.length<6)return null;
  const widths=nums.map(w=>Math.max(1,w.bbox.x1-w.bbox.x0)); const tol=Math.max(16,median(widths)*0.8);
  let clusters=clusterByX(nums,tol).filter(c=>c.items.length>=2).sort((a,b)=>a.x-b.x);
  if(clusters.length<4){clusters=clusterByX(nums,tol*1.35).filter(c=>c.items.length>=2).sort((a,b)=>a.x-b.x)}
  return clusters.length>=4?clusters:null;
}
function nearestColumnIndex(x,cols){let best=null;cols.forEach((c,i)=>{const d=Math.abs(c.x-x);if(!best||d<best.d)best={i,d}});const gaps=[];for(let i=1;i<cols.length;i++)gaps.push(cols[i].x-cols[i-1].x);const spacing=median(gaps)||90;return best&&best.d<=spacing*.62?best.i:null}
function parseTableFromTwoTaps(words,nameX,nameY,dateX,firstDay){
  if(!(firstDay>=1&&firstDay<=31))throw new Error('FIRST_DATE_REQUIRED');
  const fakeBox={x0:nameX,y0:nameY-20,x1:nameX+12,y1:nameY+20};
  const lines=findCourseLines(words,fakeBox); if(!lines)throw new Error('COURSE_ROWS_NOT_FOUND');
  const cols=findTableColumns(words,nameX+20); if(!cols)throw new Error('COLUMN_GRID_NOT_FOUND');
  const anchor=nearestColumnIndex(dateX,cols); if(anchor==null)throw new Error('DATE_COLUMN_NOT_FOUND');
  const out={};
  const put=(w,type,min,max)=>{const n=Number(digits(w.text));if(n<min||n>max)return;const ci=nearestColumnIndex(centerX(w),cols);if(ci==null)return;const day=firstDay+(ci-anchor);if(day<1||day>31)return;out[day]={...(out[day]||{}),[type]:String(n)}};
  lines.second.items.forEach(w=>put(w,'second',200,299)); lines.third.items.forEach(w=>put(w,'third',300,399));
  // 表示中の列は空欄も休み候補として出す。前後に過剰拡張しない。
  const used=Object.keys(out).map(Number); if(!used.length)throw new Error('NO_COURSES_MAPPED');
  const min=Math.max(1,firstDay-anchor), max=Math.min(31,firstDay+(cols.length-1-anchor));
  for(let d=min;d<=max;d++){if(!out[d])out[d]={off:true}}
  return {rows:out,nameMode:'2点タップ指定'};
}
el('closeRowPicker').onclick=()=>el('rowPicker').classList.add('hidden');
el('rowPickerCanvas').addEventListener('click',e=>{
  if(!lastOCR)return;
  const canvas=el('rowPickerCanvas'), rect=canvas.getBoundingClientRect();
  const x=(e.clientX-rect.left)*(canvas.width/rect.width), y=(e.clientY-rect.top)*(canvas.height/rect.height);
  const step=el('pickerStep'),status=el('rowPickerStatus'),firstDate=el('firstDateInput'),runBtn=el('runManualRead');
  if(manualPick.nameX==null){
    manualPick.nameX=x;manualPick.nameY=y;step.textContent='② 次に、表の上にある「最初の日付」をタップしてください。';status.textContent='名前の位置を保存しました。次は、その写真で一番左に表示されている日付（例：11）をタップしてください。';
  }else if(manualPick.dateX==null){
    manualPick.dateX=x;manualPick.dateY=y;const guessed=nearestRecognizedDay(lastOCR.words,x,y);manualPick.firstDate=guessed;firstDate.value=guessed||'';firstDate.disabled=false;runBtn.disabled=false;step.textContent='③ 日付を確認して「この位置で読み取る」を押してください。';status.textContent=guessed?`日付「${guessed}」付近を指定しました。数字が合っているか確認してください。`:'日付の数字だけ自動確認できませんでした。下の欄にタップした日付を入力してください。';
  }else{
    // やり直したい場合は日付タップを更新
    manualPick.dateX=x;manualPick.dateY=y;const guessed=nearestRecognizedDay(lastOCR.words,x,y);if(guessed){manualPick.firstDate=guessed;firstDate.value=guessed}status.textContent='日付位置を更新しました。';
  }
  drawPickerMarks();
});
el('resetManualPick').onclick=()=>{if(lastOCR?.canvas)showManualPicker(lastOCR.canvas,'指定をやり直します。')};
el('firstDateInput').addEventListener('input',e=>{const n=Number(e.target.value);manualPick.firstDate=(n>=1&&n<=31)?n:null;el('runManualRead').disabled=!manualPick.firstDate||manualPick.dateX==null||manualPick.nameX==null});
el('runManualRead').onclick=()=>{
  const status=el('rowPickerStatus');
  try{
    const firstDay=Number(el('firstDateInput').value);const parsed=parseTableFromTwoTaps(lastOCR.words,manualPick.nameX,manualPick.nameY,manualPick.dateX,firstDay);
    buildPreview(parsed.rows,{nameMode:'名前＋最初の日付をタップ'});status.textContent='2点指定から候補を作成しました。内容を確認してください。';el('rowPicker').classList.add('hidden');el('scanStatus').textContent='本人行と日付位置を手動指定しました。読み取り候補を確認してください。';
  }catch(err){console.error(err);const msg={FIRST_DATE_REQUIRED:'日付を1〜31で入力してください。',COURSE_ROWS_NOT_FOUND:'名前のタップ位置から2便・3便を特定できませんでした。「竹谷 健」の文字中央をタップし直してください。',COLUMN_GRID_NOT_FOUND:'表の縦列を確認できませんでした。写真全体が入った画像を使ってください。',DATE_COLUMN_NOT_FOUND:'タップした日付と表の列を対応できませんでした。日付の数字中央をタップし直してください。',NO_COURSES_MAPPED:'本人行のコースを列へ対応できませんでした。2点を指定し直してください。'};status.textContent=msg[err.message]||'読み取り候補を作れませんでした。2点を指定し直してください。';}
};

async function preprocess(file){
  const img=await createImageBitmap(file); const maxW=2200; const scale=Math.min(2.0,maxW/img.width); const w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);
  const im=ctx.getImageData(0,0,w,h),p=im.data; for(let i=0;i<p.length;i+=4){const g=Math.round(0.299*p[i]+0.587*p[i+1]+0.114*p[i+2]);const v=g<205?Math.max(0,(g-128)*1.45+128):Math.min(255,(g-128)*1.18+128);p[i]=p[i+1]=p[i+2]=v} ctx.putImageData(im,0,0); return canvas;
}
async function scan(file){
  const status=el('scanStatus'),wrap=el('scanProgressWrap'),bar=el('scanProgress');wrap.classList.remove('hidden');bar.style.width='2%';
  if(!window.Tesseract){status.textContent='OCR機能を読み込めませんでした。インターネット接続を確認してください。';return}
  status.textContent='写真を補正して読み取っています…';
  try{
    const canvas=await preprocess(file);
    const result=await Tesseract.recognize(canvas,'jpn+eng',{logger:m=>{if(m.status==='recognizing text')bar.style.width=`${Math.max(5,Math.round(m.progress*100))}%`;status.textContent=`文字を読み取り中… ${Math.round((m.progress||0)*100)}%`}});
    const words=result.data.words||[]; lastOCR={words,text:result.data.text,canvas}; const parsed=parseTable(words,result.data.text); buildPreview(parsed.rows,{nameMode:parsed.nameMode}); status.textContent='本人の行と日付列を対応させた候補を作りました。内容を確認してから登録してください。';bar.style.width='100%';
  }catch(e){
    console.error(e);
    if(lastOCR?.canvas){
      const reasons={NAME_NOT_FOUND:'氏名を自動確認できませんでした。',DATE_HEADER_NOT_FOUND:'日付見出しを自動確認できませんでした。',COURSE_ROWS_NOT_FOUND:'本人の2便・3便を自動特定できませんでした。',NO_COURSES_MAPPED:'コースと日付を自動対応できませんでした。'};
      status.textContent=(reasons[e.message]||'自動読み取りが不安定でした。')+' 手動指定画面へ切り替えます。';
      showManualPicker(lastOCR.canvas,reasons[e.message]||'自動読み取りが不安定でした。');
    }else{status.textContent='読み取りに失敗しました。もう一度写真を選んでください。'}
  }finally{setTimeout(()=>wrap.classList.add('hidden'),900)}
}
function centerX(w){return (w.bbox.x0+w.bbox.x1)/2}
function centerY(w){return (w.bbox.y0+w.bbox.y1)/2}
function digits(s){return (s||'').normalize('NFKC').replace(/[^0-9]/g,'')}
function median(arr){const a=[...arr].sort((x,y)=>x-y);if(!a.length)return 0;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function clusterByY(items,tol){const clusters=[];[...items].sort((a,b)=>centerY(a)-centerY(b)).forEach(w=>{const y=centerY(w);let c=clusters.find(c=>Math.abs(c.y-y)<=tol);if(!c){c={y,items:[]};clusters.push(c)}c.items.push(w);c.y=c.items.reduce((n,x)=>n+centerY(x),0)/c.items.length});return clusters}
function levenshtein(a,b){a=norm(a);b=norm(b);if(!a.length)return b.length;if(!b.length)return a.length;const v=Array(b.length+1).fill(0).map((_,i)=>i);for(let i=1;i<=a.length;i++){let prev=v[0];v[0]=i;for(let j=1;j<=b.length;j++){const old=v[j];v[j]=Math.min(v[j]+1,v[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old}}return v[b.length]}
function similarity(a,b){const aa=norm(a),bb=norm(b),n=Math.max(aa.length,bb.length);return n?1-levenshtein(aa,bb)/n:0}
function nameParts(raw){const arr=(raw||'').normalize('NFKC').trim().split(/[\s　]+/).map(norm).filter(Boolean);if(arr.length>=2)return arr;const n=norm(raw);return n.length>=3?[n.slice(0,2),n.slice(2)]:[n]}
function rowBox(items){return {x0:Math.min(...items.map(w=>w.bbox.x0)),y0:Math.min(...items.map(w=>w.bbox.y0)),x1:Math.max(...items.map(w=>w.bbox.x1)),y1:Math.max(...items.map(w=>w.bbox.y1))}}
function findNameBox(words,rawTarget){
  const target=norm(rawTarget); if(!target)return null; const parts=nameParts(rawTarget); const surname=parts[0]||target; const given=parts[1]||'';
  const lines=clusterByY(words,18).map(line=>{const items=[...line.items].sort((a,b)=>a.bbox.x0-b.bbox.x0);const text=items.map(w=>norm(w.text)).join('');return{...line,items,text}});
  let best=null;
  for(const line of lines){
    const txt=line.text; if(!txt)continue;
    let score=0,mode='';
    if(txt.includes(target)){score=1;mode='氏名の完全一致'}
    else if(surname.length>=2&&txt.includes(surname)&&(!given||txt.includes(given))){score=.96;mode='姓・名の部分一致'}
    else if(surname.length>=2&&txt.includes(surname)){score=.89;mode='姓の一致'}
    else {
      for(let i=0;i<line.items.length;i++)for(let j=i;j<Math.min(line.items.length,i+4);j++){
        const seg=line.items.slice(i,j+1).map(w=>norm(w.text)).join(''); const sim=Math.max(similarity(seg,target),surname.length>=2?similarity(seg,surname)*.93:0); if(sim>score){score=sim;mode='氏名の近似一致'}
      }
    }
    // 氏名列らしい文字中心の行を優先し、数字だらけの行を下げる
    const digitCount=(txt.match(/\d/g)||[]).length; const charCount=txt.length-digitCount; score += Math.min(.04,charCount*.005)-Math.min(.08,digitCount*.006);
    if(!best||score>best.score)best={score,mode,box:rowBox(line.items),line};
  }
  if(!best||best.score<.72)return null;
  // 本人名付近だけのbboxに狭める。行全体ではなく、氏名候補語を中心にする。
  let chosen=best.line.items.filter(w=>{const t=norm(w.text);return (surname&&similarity(t,surname)>=.5)||(given&&similarity(t,given)>=.5)||(target&&similarity(t,target)>=.5)});
  if(!chosen.length)chosen=best.line.items;
  return {box:rowBox(chosen),mode:best.mode,score:best.score};
}
function findDateHeaders(words,nameY){
  const dayWords=words.filter(w=>{const d=digits(w.text),n=Number(d);return d.length<=2&&n>=1&&n<=31&&centerY(w)<nameY});
  const clusters=clusterByY(dayWords,16).map(c=>({y:c.y,items:c.items.filter(w=>{const n=Number(digits(w.text));return n>=1&&n<=31})})).filter(c=>c.items.length>=4);
  if(!clusters.length)return null;
  clusters.sort((a,b)=>(b.items.length-a.items.length)||Math.abs(nameY-a.y)-Math.abs(nameY-b.y));
  for(const best of clusters){
    const arr=best.items.map(w=>({day:Number(digits(w.text)),x:centerX(w)})).sort((a,b)=>a.x-b.x); const uniq=[]; for(const x of arr){if(!uniq.some(u=>u.day===x.day))uniq.push(x)}
    if(uniq.length<4)continue; const spac=[];for(let i=1;i<uniq.length;i++)spac.push(uniq[i].x-uniq[i-1].x); const med=median(spac.filter(x=>x>5)); if(!med)continue; const sane=spac.filter(x=>x>med*.45&&x<med*1.7).length>=Math.max(2,spac.length-2); if(sane)return uniq;
  }
  return null;
}
function findCourseLines(words,nameBox){
  const y=(nameBox.y0+nameBox.y1)/2, h=Math.max(18,nameBox.y1-nameBox.y0);
  const nums=words.filter(w=>{const d=digits(w.text),n=Number(d),cy=centerY(w);return d.length===3&&n>=200&&n<=399&&Math.abs(cy-y)<=Math.max(115,h*4.2)&&w.bbox.x0>nameBox.x0});
  const lines=clusterByY(nums,15).map(c=>({y:c.y,items:c.items}));
  const seconds=lines.filter(l=>l.items.filter(w=>{const n=Number(digits(w.text));return n>=200&&n<=299}).length>=1);
  const thirds=lines.filter(l=>l.items.filter(w=>{const n=Number(digits(w.text));return n>=300&&n<=399}).length>=1);
  let best=null; for(const a of seconds)for(const b of thirds){if(b.y<=a.y)continue;const gap=b.y-a.y;if(gap>Math.max(85,h*3.2))continue;const ac=a.items.filter(w=>Number(digits(w.text))>=200&&Number(digits(w.text))<=299).length,bc=b.items.filter(w=>Number(digits(w.text))>=300&&Number(digits(w.text))<=399).length,count=ac+bc;const dist=Math.abs(((a.y+b.y)/2)-y);const score=count*10-dist*.08-gap*.05;if(!best||score>best.score)best={second:a,third:b,score}}
  return best;
}
function nearestDay(x,headers){let best=null;for(const h of headers){const dist=Math.abs(h.x-x);if(!best||dist<best.dist)best={day:h.day,dist}}const spacings=[];for(let i=1;i<headers.length;i++)spacings.push(headers[i].x-headers[i-1].x);const spacing=median(spacings)||80;return best&&best.dist<=spacing*.48?best.day:null}
function parseTableFromTap(words,tapX,tapY){
  const headers=findDateHeaders(words,tapY); if(!headers)throw new Error('DATE_HEADER_NOT_FOUND');
  const fakeBox={x0:tapX,y0:tapY-18,x1:tapX+10,y1:tapY+18};
  const lines=findCourseLines(words,fakeBox); if(!lines)throw new Error('COURSE_ROWS_NOT_FOUND');
  const out={};
  for(const w of lines.second.items){const n=Number(digits(w.text));if(n<200||n>299)continue;const day=nearestDay(centerX(w),headers);if(day)out[day]={...(out[day]||{}),second:String(n)}}
  for(const w of lines.third.items){const n=Number(digits(w.text));if(n<300||n>399)continue;const day=nearestDay(centerX(w),headers);if(day)out[day]={...(out[day]||{}),third:String(n)}}
  for(const h of headers){if(!out[h.day])out[h.day]={off:true}}
  if(!Object.values(out).some(r=>r.second||r.third))throw new Error('NO_COURSES_MAPPED');
  return {rows:out,nameMode:'tap'};
}

function parseTable(words,text){
  const found=findNameBox(words,data.name); if(!found)throw new Error('NAME_NOT_FOUND'); const nameBox=found.box,nameY=(nameBox.y0+nameBox.y1)/2;
  const headers=findDateHeaders(words,nameY); if(!headers)throw new Error('DATE_HEADER_NOT_FOUND'); const lines=findCourseLines(words,nameBox); if(!lines)throw new Error('COURSE_ROWS_NOT_FOUND');
  const out={};
  for(const w of lines.second.items){const n=Number(digits(w.text));if(n<200||n>299)continue;const day=nearestDay(centerX(w),headers);if(day)out[day]={...(out[day]||{}),second:String(n)}}
  for(const w of lines.third.items){const n=Number(digits(w.text));if(n<300||n>399)continue;const day=nearestDay(centerX(w),headers);if(day)out[day]={...(out[day]||{}),third:String(n)}}
  for(const h of headers){if(!out[h.day])out[h.day]={off:true}}
  if(!Object.values(out).some(r=>r.second||r.third))throw new Error('NO_COURSES_MAPPED'); return {rows:out,nameMode:found.mode};
}
el('photoInput').onchange=e=>{const f=e.target.files?.[0];if(f)scan(f);e.target.value=''};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;el('installBtn').classList.remove('hidden')});
el('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null}else{alert('iPhoneではSafariの共有ボタン →「ホーム画面に追加」を選んでください。')}};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v=5').catch(console.warn);
render();
