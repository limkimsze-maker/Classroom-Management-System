(function(){
'use strict';
if(typeof canvas==='undefined'||typeof strokes==='undefined'||typeof redraw!=='function')return;

let selected=null,drag=null;
const baseRedraw=redraw;
const HANDLE=9;

function fracById(id){return strokes.find(s=>s&&s.smartId===id&&s.smartType==='fractionBar')||null}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/Math.max(1,r.width),y:(e.clientY-r.top)/Math.max(1,r.height),px:e.clientX-r.left,py:e.clientY-r.top,r}}
function hitFraction(p){for(let i=strokes.length-1;i>=0;i--){const s=strokes[i];if(!s||s.smartType!=='fractionBar'||!Number.isFinite(s.x)||!Number.isFinite(s.y)||!Number.isFinite(s.w)||!Number.isFinite(s.h))continue;if(p.x>=s.x&&p.x<=s.x+s.w&&p.y>=s.y&&p.y<=s.y+s.h)return s}return null}
function handles(s){if(!s)return null;return{top:{x:(s.x+s.w/2)*cssW,y:s.y*cssH},bottom:{x:(s.x+s.w/2)*cssW,y:(s.y+s.h)*cssH}}}
function near(p,h){return h&&Math.abs(p.px-h.x)<=18&&Math.abs(p.py-h.y)<=18}

function drawHeightHandles(){
 const s=selected&&fracById(selected);if(!s)return;
 const hs=handles(s);if(!hs)return;
 ctx.save();ctx.strokeStyle='#2563eb';ctx.fillStyle='#2563eb';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.strokeRect(s.x*cssW-3,s.y*cssH-3,s.w*cssW+6,s.h*cssH+6);ctx.setLineDash([]);
 for(const h of [hs.top,hs.bottom]){ctx.fillRect(h.x-HANDLE,h.y-HANDLE,HANDLE*2,HANDLE*2);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(h.x-HANDLE,h.y-HANDLE,HANDLE*2,HANDLE*2)}
 ctx.restore();
}
redraw=function(){baseRedraw();drawHeightHandles()};

canvas.addEventListener('pointerdown',e=>{
 if(e.button!==undefined&&e.button!==0)return;
 const p=point(e),cur=selected&&fracById(selected),hs=handles(cur);
 if(cur&&near(p,hs?.top)){drag={id:cur.smartId,edge:'top',startY:p.y,origY:cur.y,origH:cur.h};try{canvas.setPointerCapture?.(e.pointerId)}catch{};e.preventDefault();e.stopImmediatePropagation();return}
 if(cur&&near(p,hs?.bottom)){drag={id:cur.smartId,edge:'bottom',startY:p.y,origY:cur.y,origH:cur.h};try{canvas.setPointerCapture?.(e.pointerId)}catch{};e.preventDefault();e.stopImmediatePropagation();return}
 const s=hitFraction(p);if(s){selected=s.smartId;redraw()}
},true);

canvas.addEventListener('pointermove',e=>{
 if(!drag)return;const p=point(e),s=fracById(drag.id);if(!s){drag=null;return}
 const minPx=34,minH=minPx/Math.max(1,cssH);
 if(drag.edge==='bottom')s.h=Math.max(minH,Math.min(1-s.y,drag.origH+(p.y-drag.startY)));
 else{const bottom=drag.origY+drag.origH;let newY=Math.max(0,Math.min(bottom-minH,drag.origY+(p.y-drag.startY)));s.y=newY;s.h=Math.max(minH,bottom-newY)}
 redraw();e.preventDefault();e.stopImmediatePropagation();
},true);

canvas.addEventListener('pointerup',e=>{if(!drag)return;drag=null;try{canvas.releasePointerCapture?.(e.pointerId)}catch{};redraw();if(typeof syncUi==='function')syncUi();e.preventDefault();e.stopImmediatePropagation()},true);

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&selected){selected=null;redraw()}},true);
})();
