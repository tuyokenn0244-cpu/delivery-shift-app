/* OCR and geometry have bounded, cancellable lifetimes. No employee number is used. */
(function(root){
 const normalize=s=>String(s||'').normalize('NFKC').replace(/[\s　]/g,'');
 const abortError=()=>new Error('READ_CANCELLED');
 function deadline(p,ms=45000,signal){
  return new Promise((resolve,reject)=>{
   let timer;const abort=()=>finish(reject,abortError());
   function finish(fn,value){clearTimeout(timer);if(signal)signal.removeEventListener('abort',abort);fn(value)}
   if(signal&&signal.aborted){reject(abortError());return}
   timer=setTimeout(()=>finish(reject,new Error('OCR_TIMEOUT')),ms);
   if(signal)signal.addEventListener('abort',abort,{once:true});
   Promise.resolve(p).then(v=>finish(resolve,v),e=>finish(reject,e));
  });
 }
 async function withWorker(language,signal,work){
  if(!root.Tesseract)throw new Error('OCR_UNAVAILABLE');
  if(signal&&signal.aborted)throw abortError();
  const base=new URL('./vendor/',location.href).href;
  let worker,closed=false,rejectWorker;
  const failure=new Promise((_,reject)=>{rejectWorker=reject});failure.catch(()=>{});
  const pending=Promise.resolve().then(()=>Tesseract.createWorker(language,1,{workerPath:base+'worker.min.js',corePath:base+'core',langPath:base+'lang',gzip:false,errorHandler:e=>rejectWorker(new Error(String(e)))}));
  const terminate=w=>{try{Promise.resolve(w.terminate()).catch(()=>{})}catch{}};
  pending.then(w=>{if(closed)terminate(w)},()=>{});
  const run=p=>deadline(Promise.race([p,failure]),45000,signal);
  try{worker=await run(pending);return await work(worker,run)}finally{closed=true;if(worker)terminate(worker)}
 }
 function locateGrid(image,pick,signal){
  return new Promise((resolve,reject)=>{
   if(signal&&signal.aborted){reject(abortError());return}
   let worker,timer;const abort=()=>finish(new Error('READ_CANCELLED'));
   function finish(error,grid){clearTimeout(timer);if(signal)signal.removeEventListener('abort',abort);if(worker)worker.terminate();error?reject(error):resolve(grid)}
   try{
    worker=new Worker(new URL('./grid-worker.js?v=14',location.href));
    worker.onmessage=e=>e.data&&e.data.grid?finish(null,e.data.grid):finish(new Error(e.data&&e.data.error||'GRID_RESULT_INVALID'));
    worker.onerror=e=>{e.preventDefault();finish(new Error(e.message||'GRID_WORKER_FAILED'))};
    timer=setTimeout(()=>finish(new Error('GRID_TIMEOUT')),20000);
    if(signal)signal.addEventListener('abort',abort,{once:true});
    worker.postMessage({image,pick});
   }catch(e){finish(e)}
  });
 }
 function anchors(blocks,name){
  const lines=(blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>p.lines||[]));
  const names=[];
  for(const line of lines){const words=line.words||[];for(let i=0;i<words.length;i++)for(let n=1;n<=6&&i+n<=words.length;n++){
   const chunk=words.slice(i,i+n);if(!normalize(name)||normalize(chunk.map(w=>w.text).join(''))!==normalize(name))continue;
   if(chunk.some(w=>w.confidence<65))continue;
   names.push({x:(chunk[0].bbox.x0+chunk[chunk.length-1].bbox.x1)/2,y:(Math.min(...chunk.map(w=>w.bbox.y0))+Math.max(...chunk.map(w=>w.bbox.y1)))/2});
  }}
  if(names.length!==1)throw new Error('NAME_UNCERTAIN');
  const person=names[0],groups=[];
  for(const line of lines){const words=(line.words||[]).map(w=>({...w,day:Number(normalize(w.text).replace(/日$/,''))})).filter(w=>Number.isInteger(w.day)&&w.day>=1&&w.day<=31&&w.bbox.y1<person.y&&w.bbox.x0>person.x&&w.confidence>=65).sort((a,b)=>a.bbox.x0-b.bbox.x0);
   if(words.length<2||words.some((w,i)=>i&&w.day!==words[i-1].day+1))continue;
   const gaps=words.slice(1).map((w,i)=>(w.bbox.x0+w.bbox.x1-words[i].bbox.x0-words[i].bbox.x1)/2),avg=gaps.reduce((a,b)=>a+b)/gaps.length;
   if(gaps.some(g=>Math.abs(g-avg)>avg*.2))continue;groups.push(words);
  }
  if(groups.length!==1)throw new Error('DATES_UNCERTAIN');
  const dates=groups[0],first=dates[0];return {nameX:person.x,nameY:person.y,dateX:(first.bbox.x0+first.bbox.x1)/2,dateY:(first.bbox.y0+first.bbox.y1)/2,firstDate:first.day,lastDate:dates[dates.length-1].day};
 }

 let activeAuto=null;
 function cancelAuto(){if(activeAuto)activeAuto.abort()}
 async function detect(canvas,name){
  cancelAuto();const controller=new AbortController();activeAuto=controller;
  try{return await withWorker('jpn+eng',controller.signal,async(w,run)=>{
   await run(w.setParameters({tessedit_pageseg_mode:'11'}));
   const r=await run(w.recognize(canvas,{}, {text:true,blocks:true}));
   if(!r||!r.data)throw new Error('OCR_RESULT_INVALID');return anchors(r.data.blocks,name);
  })}finally{if(activeAuto===controller)activeAuto=null}
 }
 async function readCells(pixels,grid,onProgress,signal){
  if(!grid||!Array.isArray(grid.cells)||!grid.cells.length)throw new Error('GRID_RESULT_INVALID');
  return withWorker('eng',signal,async(w,run)=>{
   const rows={},evidence=[];
   await run(w.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'0123456789'}));
   for(const c of grid.cells){
    if(signal&&signal.aborted)throw abortError();
    onProgress(c,evidence.length,grid.cells.length);
    if(c.unavailable){rows[c.day]??={states:{}};rows[c.day][c.type]='';rows[c.day].states[c.type]='unresolved';evidence.push({...c,raw:'',confidence:0,blank:false,state:'unresolved',value:'',url:''});continue}
    const crop=ShiftGrid.cellImage(pixels,c),part=document.createElement('canvas');part.width=crop.width;part.height=crop.height;
    const ctx=part.getContext('2d');if(!ctx)throw new Error('CANVAS_UNAVAILABLE');
    ctx.putImageData(new ImageData(crop.data,crop.width,crop.height),0,0);
    const result=await run(w.recognize(part));
    if(!result||!result.data||typeof result.data.text!=='string')throw new Error('OCR_RESULT_INVALID');
    const raw=normalize(result.data.text),confidence=Number(result.data.confidence),blank=!c.uncertain&&ShiftGrid.isBlankCell(pixels,c)&&raw==='';
    const valid=(c.type==='second'?/^2\d{2}$/:/^3\d{2}$/).test(raw),state=c.uncertain?'unresolved':blank?'blank':valid&&confidence>=85?'candidate':'unresolved';
    rows[c.day]??={states:{}};rows[c.day][c.type]=valid?raw:'';rows[c.day].states[c.type]=state;
    evidence.push({...c,raw,confidence,blank,state,value:valid?raw:'',url:part.toDataURL('image/png')});
   }
   ShiftGrid.applyBlankDays(rows,evidence);return {rows,evidence};
  });
 }
 root.PhotoReader={cancelAuto,normalize,anchors,detect,readCells,deadline,locateGrid};
})(globalThis);
