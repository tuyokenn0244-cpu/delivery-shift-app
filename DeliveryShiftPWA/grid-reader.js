/* Grid geometry is derived from pixels and the user's taps, never worker No. */
(function(root){
function locateGrid(image,pick){
 const {width:w,height:h,data}=image;
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
 return {cells,edges,top,bottom};
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
root.ShiftGrid={locateGrid,cellImage};if(typeof module!=='undefined')module.exports=root.ShiftGrid;
})(typeof globalThis!=='undefined'?globalThis:this);
