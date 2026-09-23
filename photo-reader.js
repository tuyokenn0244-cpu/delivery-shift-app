/* OCR is restricted to geometry-derived cells; employee numbers are never used. */
(function(root){
 const normalize=s=>String(s||'').normalize('NFKC').replace(/[\s　]/g,'');
 function deadline(p,ms=45000){let timer;return Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('OCR_TIMEOUT')),ms)})]).finally(()=>clearTimeout(timer))}
 async function createWorker(language='eng'){
  if(!root.Tesseract)throw new Error('OCR_UNAVAILABLE');
  const base=new URL('./vendor/',location.href).href;let expired=false;
  const pending=Tesseract.createWorker(language,1,{workerPath:base+'worker.min.js',corePath:base+'core',langPath:base+'lang',gzip:false});
  pending.then(w=>{if(expired)w.terminate().catch(()=>{})},()=>{});
  try{return await deadline(pending)}catch(e){expired=true;throw e}
 }
 function anchors(blocks,name){
  const lines=(blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>p.lines||[]));
  const names=[];
  for(const line of lines){const words=line.words||[];for(let i=0;i<words.length;i++)for(let n=1;n<=6&&i+n<=words.length;n++){
   const chunk=words.slice(i,i+n);if(!normalize(name)||normalize(chunk.map(w=>w.text).join(''))!==normalize(name))continue;
   if(chunk.some(w=>w.confidence<65))continue;
   names.push({x:(chunk[0].bbox.x0+chunk.at(-1).bbox.x1)/2,y:(Math.min(...chunk.map(w=>w.bbox.y0))+Math.max(...chunk.map(w=>w.bbox.y1)))/2});
  }}
  if(names.length!==1)throw new Error('NAME_UNCERTAIN');
  const person=names[0],groups=[];
  for(const line of lines){const words=(line.words||[]).map(w=>({...w,day:Number(normalize(w.text).replace(/日$/,''))})).filter(w=>Number.isInteger(w.day)&&w.day>=1&&w.day<=31&&w.bbox.y1<person.y&&w.bbox.x0>person.x&&w.confidence>=65).sort((a,b)=>a.bbox.x0-b.bbox.x0);
   if(words.length<2||words.some((w,i)=>i&&w.day!==words[i-1].day+1))continue;
   const gaps=words.slice(1).map((w,i)=>(w.bbox.x0+w.bbox.x1-words[i].bbox.x0-words[i].bbox.x1)/2),avg=gaps.reduce((a,b)=>a+b)/gaps.length;
   if(gaps.some(g=>Math.abs(g-avg)>avg*.2))continue;groups.push(words);
  }
  if(groups.length!==1)throw new Error('DATES_UNCERTAIN');
  const dates=groups[0],first=dates[0];return {nameX:person.x,nameY:person.y,dateX:(first.bbox.x0+first.bbox.x1)/2,dateY:(first.bbox.y0+first.bbox.y1)/2,firstDate:first.day,lastDate:dates.at(-1).day};
 }
 let activeAuto=null;
 function cancelAuto(){if(activeAuto){activeAuto.cancelled=true;if(activeAuto.worker)activeAuto.worker.terminate().catch(()=>{})}}
 async function detect(canvas,name){const job={cancelled:false,worker:null};activeAuto=job;let w;
  try{w=await createWorker('jpn+eng');job.worker=w;if(job.cancelled)throw new Error('CANCELLED');await w.setParameters({tessedit_pageseg_mode:'11'});const r=await deadline(w.recognize(canvas,{}, {text:true,blocks:true}));if(job.cancelled)throw new Error('CANCELLED');return anchors(r.data.blocks,name)}
  finally{if(w)w.terminate().catch(()=>{});if(activeAuto===job)activeAuto=null}
 }
 async function readCells(pixels,grid,onProgress){let w;const rows={},evidence=[];
  try{w=await createWorker();await w.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'0123456789'});
   for(const c of grid.cells){onProgress(c,evidence.length,grid.cells.length);const crop=ShiftGrid.cellImage(pixels,c),part=document.createElement('canvas');part.width=crop.width;part.height=crop.height;part.getContext('2d').putImageData(new ImageData(crop.data,crop.width,crop.height),0,0);
    const result=await deadline(w.recognize(part)),raw=normalize(result.data.text),confidence=result.data.confidence,blank=ShiftGrid.isBlankCell(pixels,c)&&raw==='';
    const valid=(c.type==='second'?/^2\d{2}$/:/^3\d{2}$/).test(raw),state=blank?'blank':valid&&confidence>=85?'candidate':'unresolved';
    rows[c.day]??={states:{}};rows[c.day][c.type]=valid?raw:'';rows[c.day].states[c.type]=state;
    evidence.push({...c,raw,confidence,blank,state,value:valid?raw:'',url:part.toDataURL('image/png')});
   }
   ShiftGrid.applyBlankDays(rows,evidence);return {rows,evidence};
  }finally{if(w)w.terminate().catch(()=>{})}
 }
 root.PhotoReader={cancelAuto,normalize,anchors,detect,readCells,deadline};
})(globalThis);
