/* Grid geometry is derived from pixels and the user's taps, never worker No. */
(function(root){
function locateStrictGrid(image,pick){
 const {width:w,height:h,data}=image;
 if(!['nameX','nameY','dateX','dateY'].every(k=>Number.isFinite(pick[k]))||pick.nameX<0||pick.nameX>=w||pick.nameY<0||pick.nameY>=h)throw new Error('ROW_GRID_NOT_FOUND');
 if(!Number.isInteger(pick.firstDate)||!Number.isInteger(pick.lastDate)||pick.firstDate<1||pick.lastDate>31||pick.lastDate<pick.firstDate)throw new Error('COLUMN_GRID_NOT_FOUND');
 const gray=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<0||x>=w||y<0||y>=h)return 255;const i=(y*w+x)*4;return data[i]*.299+data[i+1]*.587+data[i+2]*.114};
 const dark=(x,y)=>Math.min(gray(x,y),gray(x,y-1),gray(x,y+1))<135;
 function horizontal(cy,left,right){let best={score:0,y:cy,slope:0};for(let dy=-3;dy<=3;dy++)for(let slope=-.04;slope<=.04;slope+=.004){let n=0,total=0;for(let x=left;x<=right;x+=2){n+=dark(x,cy+dy+slope*(x-pick.nameX));total++}if(n/total>best.score)best={score:n/total,y:cy+dy,slope}}return best}
 const candidates=[];for(let y=Math.max(1,Math.round(pick.nameY-w*.07));y<Math.min(h-1,pick.nameY+w*.07);y+=2){const v=horizontal(y,pick.nameX-w*.045,pick.nameX+w*.045);if(v.score>.91)candidates.push(v)}
 const above=candidates.filter(v=>v.y<pick.nameY-5).sort((a,b)=>b.y-a.y),below=candidates.filter(v=>v.y>pick.nameY+5).sort((a,b)=>a.y-b.y);
 if(!above.length||!below.length)throw new Error('ROW_GRID_NOT_FOUND');
 let top=horizontal(above[0].y,pick.nameX,w*.94),bottom=horizontal(below[0].y,pick.nameX,w*.94);
 const at=(line,x)=>line.y+line.slope*(x-pick.nameX);
 if(top.score<.75||bottom.score<.75||bottom.y-top.y<w*.022||bottom.y-top.y>w*.10)throw new Error('ROW_GRID_NOT_FOUND');
 const raw=[];for(let x=Math.round(pick.nameX+w*.055);x<w*.98;x++){let best=0;for(let slope=-.06;slope<=.06;slope+=.02){let hit=0,n=0;const y0=at(top,x)+5,y1=at(bottom,x)-5;for(let y=y0;y<=y1;y+=1){const xx=x+slope*(y-(y0+y1)/2);hit+=Math.min(gray(xx-1,y),gray(xx,y),gray(xx+1,y))<135;n++}best=Math.max(best,hit/n)}if(best>.90)raw.push(x)}
 const lines=[];for(const x of raw){const last=lines[lines.length-1];if(last&&x-last.end<=3){last.end=x;last.x=(last.start+x)/2}else lines.push({start:x,end:x,x})}
 const anchor=lines.findIndex((v,i)=>lines[i+1]&&v.x<pick.dateX&&lines[i+1].x>pick.dateX);
 const count=pick.lastDate-pick.firstDate+1;
 if(anchor<0||count<1||count>31||lines.length<anchor+count+1)throw new Error('COLUMN_GRID_NOT_FOUND');
 const edges=[lines[anchor].x,lines[anchor+1].x],spacing=edges[1]-edges[0];
 for(let i=2;i<=count;i++){const expected=edges[edges.length-1]+spacing,found=lines.filter(v=>v.x>edges[edges.length-1]+spacing*.65).sort((a,b)=>Math.abs(a.x-expected)-Math.abs(b.x-expected))[0];if(!found||Math.abs(found.x-expected)>spacing*.2)throw new Error('COLUMN_GRID_NOT_FOUND');edges.push(found.x)}
 const gaps=edges.slice(1).map((x,i)=>x-edges[i]),mean=gaps.reduce((a,b)=>a+b)/gaps.length;
 if(mean<w*.025||gaps.some(g=>g<mean*.75||g>mean*1.25))throw new Error('COLUMN_GRID_NOT_FOUND');
 const cells=[];for(let i=0;i<count;i++){const left=edges[i],right=edges[i+1],cx=(left+right)/2,t=at(top,cx),b=at(bottom,cx);for(let row=0;row<2;row++)cells.push({day:pick.firstDate+i,type:row?'third':'second',left:Math.ceil(left+5),top:Math.ceil(t+(b-t)*row/2+4),width:Math.floor(right-left-10),height:Math.floor((b-t)/2-8)})}
 if(cells.some(c=>c.width<8||c.height<6||c.left<0||c.top<0||c.left+c.width>w||c.top+c.height>h))throw new Error('ROW_GRID_NOT_FOUND');
 return {cells,edges,top,bottom};
}
// Recover missing bottom borders without using employee numbers or OCR text order.
function locateGrid(image,pick){
 const {width:w,height:h,data}=image, count=pick.lastDate-pick.firstDate+1;
 if(!['nameX','nameY','dateX','dateY'].every(k=>Number.isFinite(pick[k]))||pick.nameX<0||pick.nameX>=w||pick.nameY<0||pick.nameY>=h)throw new Error('ROW_GRID_NOT_FOUND');
 if(!Number.isInteger(count)||count<1||count>31||pick.firstDate<1||pick.lastDate>31||pick.dateX<=pick.nameX||pick.dateX>=w)throw new Error('COLUMN_GRID_NOT_FOUND');
 if(!Number.isFinite(pick.secondY)){
  try{const grid=locateStrictGrid(image,pick);grid.diagnostics=['上罫線：検出','下罫線：検出','本人行：上下罫線から確定',`日付列：${count}列検出`];return grid}catch(error){if(!['ROW_GRID_NOT_FOUND','COLUMN_GRID_NOT_FOUND'].includes(error.message))throw error}
 }
 const dark=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<0||x>=w||y<0||y>=h)return false;const i=(y*w+x)*4;return data[i]*.299+data[i+1]*.587+data[i+2]*.114<135};
 const median=a=>{a=[...a].sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null};
 const group=(values,gap=4)=>{const groups=[];for(const v of values){const last=groups[groups.length-1];if(last&&v-last.at(-1)<=gap)last.push(v);else groups.push([v])}return groups.map(a=>a.reduce((s,v)=>s+v,0)/a.length)};
 // Name columns have one merged cell per employee, unlike the date columns.
 const raw=[];for(let y=1;y<h-1;y+=2){let best=null;for(let slope=-.04;slope<=.0401;slope+=.008){let hits=0,n=0;for(let x=Math.max(0,pick.nameX-w*.045);x<=Math.min(w-1,pick.nameX+w*.045);x+=2){hits+=dark(x,y+slope*(x-pick.nameX))||dark(x,y+slope*(x-pick.nameX)+1);n++}if(!best||hits/n>best.score)best={y,slope,score:hits/n}}if(best.score>.82)raw.push(best)}
 const boundaries=group(raw.map(v=>v.y)).map(y=>raw.reduce((a,b)=>Math.abs(b.y-y)<Math.abs(a.y-y)?b:a));
 // Use long rules to refine skew; a short name-cell segment alone has ambiguous slope.
 for(const line of boundaries){let best={score:0,slope:0,y:line.y};for(let dy=-2;dy<=2;dy++)for(let slope=-.04;slope<=.0401;slope+=.004){let hits=0,n=0;for(let x=pick.nameX;x<w*.96;x+=3){hits+=dark(x,line.y+dy+slope*(x-pick.nameX));n++}const score=hits/n;if(score>best.score||(score===best.score&&Math.abs(slope)<Math.abs(best.slope)))best={score,slope,y:line.y+dy}}if(best.score>.65)Object.assign(line,best)}
 const gaps=boundaries.slice(1).map((v,i)=>v.y-boundaries[i].y).filter(g=>g>w*.022&&g<w*.1);
 const typical=median(gaps), consistent=typical?gaps.filter(g=>Math.abs(g-typical)<typical*.25):[];
 const rowHeight=consistent.length>=3?consistent.reduce((a,b)=>a+b,0)/consistent.length:null;
 const above=boundaries.filter(v=>v.y<pick.nameY-4).at(-1),below=boundaries.find(v=>v.y>pick.nameY+4);
 let top,bottom,method;const diagnostics=[];
 const plausible=v=>v&&rowHeight&&Math.abs(v.y-pick.nameY)<rowHeight*.8;
 const hasTop=plausible(above),hasBottom=plausible(below);
 diagnostics.push(`上罫線：${hasTop?'検出':'未検出'}`,`下罫線：${hasBottom?'検出':'未検出'}`);
 if(rowHeight)diagnostics.push(`平均社員行高：${rowHeight.toFixed(1)}px（${consistent.length}区間）`);
 const slope=median(boundaries.map(v=>v.slope))||0;
 if(Number.isFinite(pick.secondY)){
  const step=Number.isFinite(pick.thirdY)?pick.thirdY-pick.secondY-slope*((pick.thirdX||pick.dateX)-(pick.secondX||pick.dateX)):(Number(pick.rowStep)||rowHeight/2||w*.02);
  if(step<6||step>w*.1)throw new Error('ROW_SPACING_INVALID');
  const refX=Number.isFinite(pick.secondX)?pick.secondX:pick.dateX;
  top={y:pick.secondY-step/2-slope*(refX-pick.nameX),slope};bottom={y:top.y+step*2,slope};method='2便タップから3便を推定';
 }else if(rowHeight){
  if(hasTop&&hasBottom&&Math.abs(below.y-above.y-rowHeight)<rowHeight*.25){top=above;bottom=below;method='画像全体の上下罫線';}
  else if(hasTop){top=above;bottom={y:top.y+rowHeight,slope:top.slope};method='平均行高から下罫線を補完';}
  else if(hasBottom){bottom=below;top={y:bottom.y-rowHeight,slope:bottom.slope};method='平均行高から上罫線を補完';}
  else{top={y:pick.nameY-rowHeight/2,slope};bottom={y:pick.nameY+rowHeight/2,slope};method='氏名中央と平均行高から推定';}
 }else return {needsRowTap:true,suggestedStep:w*.02,diagnostics:[...diagnostics,'本人行：2便の行をタップしてください']};
 diagnostics.push('→ '+method);
 const at=(line,x)=>line.y+line.slope*(x-pick.nameX);
 // Vertical edges are searched across the table, not only the damaged last row.
 const vertical=[];for(let x=Math.max(0,Math.round(pick.dateX-w*.06));x<w;x++){let hit=0,n=0;for(let y=Math.max(0,pick.dateY);y<Math.min(h,pick.nameY);y+=3){hit+=dark(x,y)||dark(x-1,y)||dark(x+1,y);n++}if(n&&hit/n>.65)vertical.push(x)}
 // Short local vertical segments tolerate photo skew better than full-height ones.
 const local=[];for(let x=Math.max(0,Math.round(pick.dateX-w*.06));x<w;x++){let hit=0,n=0;for(let y=Math.max(0,at(top,x)+4);y<Math.min(h,at(bottom,x)-4);y++){hit+=dark(x,y)||dark(x-1,y)||dark(x+1,y);n++}if(n&&hit/n>.85)local.push(x)}
 const localLines=group(local),localAnchor=localLines.findIndex((x,i)=>x<pick.dateX&&localLines[i+1]>pick.dateX);
 const lines=localAnchor>=0&&localLines.length>=localAnchor+count+1?localLines:group(vertical), anchor=lines.findIndex((x,i)=>x<pick.dateX&&lines[i+1]>pick.dateX);
 let spacing=anchor>=0?lines[anchor+1]-lines[anchor]:null;
 if(!spacing||spacing<w*.015||spacing>w*.15)spacing=(w*.98-pick.dateX)/(count-.5);
 let edges=Array.from({length:count+1},(_,i)=>pick.dateX+(i-.5)*spacing),columnEstimated=true;
 if(anchor>=0&&lines.length>=anchor+count+1){const candidate=lines.slice(anchor,anchor+count+1);if(candidate.slice(1).every((x,i)=>Math.abs(x-candidate[i]-spacing)<spacing*.2)){edges=candidate;columnEstimated=false}}
 diagnostics.push(`日付範囲：${pick.firstDate}〜${pick.lastDate}`,`日付列：${count}列${columnEstimated?'推定（原本と照合してください）':'検出'}`);
 const cells=[];for(let i=0;i<count;i++){const left=edges[i],right=edges[i+1],cx=(left+right)/2,t=at(top,cx),b=at(bottom,cx),step=(b-t)/2;
  for(let row=0;row<2;row++){const mx=Math.max(3,(right-left)*.08),my=Math.max(3,step*.12);const l=Math.max(0,Math.ceil(left+mx)),r=Math.min(w,Math.floor(right-mx)),a=Math.max(0,Math.ceil(t+step*row+my)),z=Math.min(h,Math.floor(t+step*(row+1)-my));cells.push({day:pick.firstDate+i,type:row?'third':'second',left:l,top:a,width:Math.max(0,r-l),height:Math.max(0,z-a),uncertain:true,unavailable:r-l<8||z-a<6})}
 }
 diagnostics.push(`2便Y：${Math.round(at(top,pick.dateX)+(bottom.y-top.y)/4)}`,`3便Y：${Math.round(at(top,pick.dateX)+(bottom.y-top.y)*3/4)}`);
 return {cells,edges,top,bottom,diagnostics,estimated:true};
}
function cellImage(image,cell){
 const scale=4,pad=20,width=cell.width*scale+pad*2,height=cell.height*scale+pad*2,data=new Uint8ClampedArray(width*height*4);data.fill(255);
 for(let y=0;y<cell.height*scale;y++)for(let x=0;x<cell.width*scale;x++){
 const sx=Math.max(0,Math.min(cell.width-1,(x+.5)/scale-.5)),sy=Math.max(0,Math.min(cell.height-1,(y+.5)/scale-.5)),x0=Math.floor(sx),y0=Math.floor(sy),fx=sx-x0,fy=sy-y0,dst=((y+pad)*width+x+pad)*4;
 const sample=(xx,yy,c)=>image.data[((cell.top+Math.min(cell.height-1,yy))*image.width+cell.left+Math.min(cell.width-1,xx))*4+c];
 for(let c=0;c<3;c++)data[dst+c]=(sample(x0,y0,c)*(1-fx)+sample(x0+1,y0,c)*fx)*(1-fy)+(sample(x0,y0+1,c)*(1-fx)+sample(x0+1,y0+1,c)*fx)*fy;
 }
 return {data,width,height};
}
function isBlankCell(image,cell){
 // Ignore the outer margin where grid lines or the printed footer can intrude.
 const values=[],mx=Math.max(2,Math.floor(cell.width*.1)),my=Math.max(2,Math.floor(cell.height*.16));
 for(let y=cell.top+my;y<cell.top+cell.height-my;y++)for(let x=cell.left+mx;x<cell.left+cell.width-mx;x++){const i=(y*image.width+x)*4;values.push(image.data[i]*.299+image.data[i+1]*.587+image.data[i+2]*.114)}
 if(values.length<100)return false;
 values.sort((a,b)=>a-b);const background=values[Math.floor(values.length*.65)];
 if(background<75)return false;
 return values.filter(v=>v<background-35).length/values.length<.005;
}
function applyBlankDays(rows,evidence){
 for(const day of Object.keys(rows)){const cells=evidence.filter(c=>String(c.day)===day);if(cells.length===2&&cells.some(c=>c.type==='second')&&cells.some(c=>c.type==='third')&&cells.every(c=>c.blank&&c.raw==='')&&!rows[day].second&&!rows[day].third)rows[day].off=true}
 return rows;
}
root.ShiftGrid={locateGrid,cellImage,isBlankCell,applyBlankDays};if(typeof module!=='undefined')module.exports=root.ShiftGrid;
})(typeof globalThis!=='undefined'?globalThis:this);
