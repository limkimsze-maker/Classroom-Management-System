(function(){
'use strict';
if(typeof canvas==='undefined'||typeof strokes==='undefined'||typeof redraw!=='function')return;
const clone=v=>JSON.parse(JSON.stringify(v));
let picked=[],marquee=null,drag=null,baseRedraw=redraw;
function p(e){const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}}
function bounds(s){
 if(!s||s.erase||s.background)return null;
 if((s.type==='text'||s.type==='image')&&Number.isFinite(s.x)&&Number.isFinite(s.y)&&Number.isFinite(s.w)&&Number.isFinite(s.h))return{x:s.x,y:s.y,w:s.w,h:s.h};
 if(Array.isArray(s.points)&&s.points.length){let x1=1,y1=1,x2=0,y2=0;for(const q of s.points){x1=Math.min(x1,q.x);y1=Math.min(y1,q.y);x2=Math.max(x2,q.x);y2=Math.max(y2,q.y)}return{x:x1,y:y1,w:Math.max(.001,x2-x1),h:Math.max(.001,y2-y1)}}
 return null;
}
function inside(pt,b,pad=.006){return b&&pt.x>=b.x-pad&&pt.x<=b.x+b.w+pad&&pt.y>=b.y-pad&&pt.y<=b.y+b.h+pad}
function topHit(pt){for(let i=strokes.length-1;i>=0;i--){const b=bounds(strokes[i]);if(inside(pt,b))return strokes[i]}return null}
function rect(a,b){return{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)}}
function intersects(a,b){return a&&b&&a.x<=b.x+b.w&&a.x+a.w>=b.x&&a.y<=b.y+b.h&&a.y+a.h>=b.y}
function snap(items){return items.map(s=>({s,x:s.x,y:s.y,points:Array.isArray(s.points)?clone(s.points):null}))}
function move(items,dx,dy){for(const it of items){const s=it.s;if(s.locked)continue;if(it.points){s.points=it.points.map(q=>({x:Math.max(0,Math.min(1,q.x+dx)),y:Math.max(0,Math.min(1,q.y+dy))}))}else{if(Number.isFinite(it.x))s.x=Math.max(0,Math.min(1-(s.w||0),it.x+dx));if(Number.isFinite(it.y))s.y=Math.max(0,Math.min(1-(s.h||0),it.y+dy))}}}
function drawOverlay(){ctx.save();if(marquee){const r=rect(marquee.a,marquee.b);ctx.fillStyle='rgba(37,99,235,.08)';ctx.strokeStyle='#2563eb';ctx.lineWidth=1.5;ctx.setLineDash([6,4]);ctx.fillRect(r.x*cssW,r.y*cssH,r.w*cssW,r.h*cssH);ctx.strokeRect(r.x*cssW,r.y*cssH,r.w*cssW,r.h*cssH)}if(picked.length){ctx.strokeStyle='#2563eb';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);for(const s of picked){if(!strokes.includes(s))continue;const b=bounds(s);if(b)ctx.strokeRect(b.x*cssW-4,b.y*cssH-4,b.w*cssW+8,b.h*cssH+8)}}ctx.restore()}
redraw=function(){baseRedraw();drawOverlay()};
function clearIfNotSelect(){if(typeof tool==='string'&&tool!=='select'&&(picked.length||marquee||drag)){picked=[];marquee=null;drag=null;redraw()}}
document.addEventListener('click',e=>{if(e.target?.closest?.('#selectBtn'))setTimeout(()=>{canvas.style.cursor='crosshair'},0);else if(e.target?.closest?.('button')&&e.target.id!=='selectBtn')clearIfNotSelect()},false);
window.addEventListener('pointerdown',e=>{
 if(e.target!==canvas||tool!=='select'||e.button!==0||!picked.length)return;
 const pt=p(e);if(!picked.some(s=>inside(pt,bounds(s))))return;
 drag={start:pt,items:snap(picked)};try{canvas.setPointerCapture?.(e.pointerId)}catch{};e.preventDefault();e.stopImmediatePropagation();canvas.style.cursor='grabbing';
},true);
window.addEventListener('pointerdown',e=>{
 if(e.target!==canvas||tool!=='select'||e.button!==0||drag)return;
 const pt=p(e);if(topHit(pt)){picked=[];return}
 picked=[];marquee={a:pt,b:pt};redraw();try{canvas.setPointerCapture?.(e.pointerId)}catch{};e.preventDefault();canvas.style.cursor='crosshair';
},false);
window.addEventListener('pointermove',e=>{if(e.target!==canvas)return;if(drag){const pt=p(e);move(drag.items,pt.x-drag.start.x,pt.y-drag.start.y);redraw();e.preventDefault();e.stopImmediatePropagation();return}if(marquee){marquee.b=p(e);redraw();e.preventDefault();e.stopImmediatePropagation()}},true);
window.addEventListener('pointerup',e=>{if(e.target!==canvas)return;if(drag){drag=null;try{canvas.releasePointerCapture?.(e.pointerId)}catch{};redraw();canvas.style.cursor='grab';e.preventDefault();e.stopImmediatePropagation();return}if(marquee){marquee.b=p(e);const r=rect(marquee.a,marquee.b),px=Math.hypot(r.w*cssW,r.h*cssH);picked=px<8?[]:strokes.filter(s=>intersects(bounds(s),r));marquee=null;try{canvas.releasePointerCapture?.(e.pointerId)}catch{};redraw();canvas.style.cursor=picked.length?'grab':'crosshair';e.preventDefault();e.stopImmediatePropagation()}},true);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&(picked.length||marquee||drag)){picked=[];marquee=null;drag=null;redraw()}},true);
})();
