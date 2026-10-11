(function(){
'use strict';
if(typeof canvas==='undefined'||typeof strokes==='undefined'||typeof redraw!=='function'||typeof syncUi!=='function')return;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clone=v=>JSON.parse(JSON.stringify(v));
let selectedId=null,drag=null,suppressClick=false;

function svgData(svg){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
function widthsFor(obj){
 const n=Math.max(2,obj.barCount||2);
 if(Array.isArray(obj.barCompareWidths)&&obj.barCompareWidths.length===n)return obj.barCompareWidths.map(v=>clamp(Number(v)||.5,.16,1));
 return Array.from({length:n},(_,i)=>clamp(1-i*.11,.16,1));
}
function rebuild(obj){
 const count=Math.max(2,obj.barCount||2),stroke='#17324d',fills=Array.from({length:count},(_,i)=>obj.barFills?.[i]||'#ffffff');
 const widths=widthsFor(obj),W=900,H=Math.max(260,120+count*115),els=[],x=70,maxW=760;
 for(let i=0;i<count;i++){
  const w=maxW*widths[i];
  els.push(`<rect x="${x}" y="${45+i*105}" width="${w}" height="72" rx="2" fill="${fills[i]}" stroke="${stroke}" stroke-width="8"/>`);
 }
 obj.barCompareWidths=widths;
 obj.src=svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${els.join('')}</svg>`);
}
function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/Math.max(1,r.width),y:(e.clientY-r.top)/Math.max(1,r.height),r}}
function hitComparison(x,y){
 for(let i=strokes.length-1;i>=0;i--){const s=strokes[i];if(!s||s.smartType!=='barModel'||s.smartBarType!=='comparison'||!s.w||!s.h)continue;if(x>=s.x&&x<=s.x+s.w&&y>=s.y&&y<=s.y+s.h)return s}return null;
}
function rowGeometry(obj,index){
 const count=Math.max(2,obj.barCount||2),H=Math.max(260,120+count*115),widths=widthsFor(obj),x0=70/900,y0=(45+index*105)/H,w=(760*widths[index])/900,h=72/H;
 return{x0,y0,w,h,H};
}
function endHandleHit(obj,x,y,rect){
 const n=Math.max(2,obj.barCount||2),threshold=14;
 for(let i=0;i<n;i++){
  const g=rowGeometry(obj,i);
  const hx=(obj.x+obj.w*(g.x0+g.w))*rect.width;
  const hy=(obj.y+obj.h*(g.y0+g.h/2))*rect.height;
  if(Math.hypot(x*rect.width-hx,y*rect.height-hy)<=threshold)return i;
 }
 return -1;
}
function drawHandles(){
 if(!selectedId)return;
 const obj=strokes.find(s=>s&&s.smartId===selectedId&&s.smartType==='barModel'&&s.smartBarType==='comparison');if(!obj)return;
 const n=Math.max(2,obj.barCount||2);ctx.save();ctx.fillStyle='#ffffff';ctx.strokeStyle='#2563eb';ctx.lineWidth=2;
 for(let i=0;i<n;i++){
  const g=rowGeometry(obj,i),x=(obj.x+obj.w*(g.x0+g.w))*cssW,y=(obj.y+obj.h*(g.y0+g.h/2))*cssH;
  ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();ctx.stroke();
 }
 ctx.restore();
}
const baseRedraw=redraw;redraw=function(){baseRedraw();drawHandles()};

canvas.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 const p=canvasPoint(e),obj=hitComparison(p.x,p.y);
 if(!obj){selectedId=null;redraw();return}
 selectedId=obj.smartId;const row=endHandleHit(obj,p.x,p.y,p.r);redraw();
 if(row<0)return;
 e.preventDefault();e.stopImmediatePropagation();canvas.setPointerCapture?.(e.pointerId);
 drag={id:obj.smartId,row,before:clone(strokes),pointerId:e.pointerId,moved:false};
},true);
canvas.addEventListener('pointermove',e=>{
 if(!drag)return;const obj=strokes.find(s=>s&&s.smartId===drag.id);if(!obj)return;
 const p=canvasPoint(e),widths=widthsFor(obj),innerStart=obj.x+obj.w*(70/900),innerMax=obj.w*(760/900);
 let frac=(p.x-innerStart)/Math.max(.001,innerMax);frac=clamp(frac,.16,1);
 if(Math.abs(widths[drag.row]-frac)<.001)return;
 widths[drag.row]=frac;obj.barCompareWidths=widths;rebuild(obj);drag.moved=true;suppressClick=true;redraw();syncUi();e.preventDefault();e.stopImmediatePropagation();
},true);
function endDrag(e){if(!drag)return;const obj=strokes.find(s=>s&&s.smartId===drag.id);if(obj&&drag.moved)window.__smartBarLastHistory={before:drag.before,afterId:obj.smartId};try{canvas.releasePointerCapture?.(drag.pointerId)}catch{};drag=null;setTimeout(()=>{suppressClick=false},80);e?.preventDefault?.();e?.stopImmediatePropagation?.()}
canvas.addEventListener('pointerup',endDrag,true);canvas.addEventListener('pointercancel',endDrag,true);
document.addEventListener('click',e=>{if(suppressClick&&e.target===canvas){e.preventDefault();e.stopImmediatePropagation()}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){selectedId=null;drag=null;redraw()}},true);
})();
