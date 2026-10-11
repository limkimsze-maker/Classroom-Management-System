(function(){
'use strict';
if(typeof canvas==='undefined'||typeof strokes==='undefined'||typeof redraw!=='function'||typeof syncUi!=='function')return;
const edition=(new URLSearchParams(location.search).get('edition')||'en').toLowerCase();
const TXT={
 en:{title:'Bracket label',placeholder:'Type label',apply:'Apply',del:'Delete bracket'},
 zh:{title:'括号标签',placeholder:'输入标签',apply:'应用',del:'删除括号'},
 ms:{title:'Label kurungan',placeholder:'Taip label',apply:'Guna',del:'Padam kurungan'},
 ta:{title:'அடைப்புக்குறி பெயர்',placeholder:'பெயரை உள்ளிடவும்',apply:'பயன்படுத்து',del:'அடைப்புக்குறியை நீக்கு'}
};
const L=TXT[edition]||TXT.en;
const clone=v=>JSON.parse(JSON.stringify(v));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let panel=null,hot=[];
function closePanel(){if(panel){panel.remove();panel=null}}
function ensureState(obj){
 if(!obj.barBracketState||typeof obj.barBracketState!=='object')obj.barBracketState={};
 const st=obj.barBracketState,n=Math.max(2,obj.barCount||2);
 if(obj.smartBarType==='partwhole'||obj.smartBarType==='equal'){
  if(!st.whole)st.whole={visible:true,label:''};
  for(let i=0;i<n;i++)if(!st['p'+i])st['p'+i]={visible:true,label:''};
 }else if(obj.smartBarType==='comparison'){
  for(let i=0;i<n;i++)if(!st['c'+i])st['c'+i]={visible:true,label:''};
 }
 return st;
}
function cutsFor(obj){const n=Math.max(2,obj.barCount||2);if(obj.smartBarType==='equal')return Array.from({length:n-1},(_,i)=>(i+1)/n);if(Array.isArray(obj.barCuts)&&obj.barCuts.length===n-1)return obj.barCuts.slice().sort((a,b)=>a-b);return Array.from({length:n-1},(_,i)=>(i+1)/n)}
function compWidths(obj){const n=Math.max(2,obj.barCount||2);if(Array.isArray(obj.barCompareWidths)&&obj.barCompareWidths.length===n)return obj.barCompareWidths.map(v=>clamp(Number(v)||.5,.16,1));return Array.from({length:n},(_,i)=>clamp(1-i*.11,.16,1))}
function lineBracket(x1,x2,y,dir,label,id,obj){
 const arm=9,ctx2=ctx;
 ctx2.save();ctx2.strokeStyle='#17324d';ctx2.fillStyle='#17324d';ctx2.lineWidth=2.2;ctx2.beginPath();ctx2.moveTo(x1,y);ctx2.lineTo(x2,y);ctx2.moveTo(x1,y);ctx2.lineTo(x1,y+dir*arm);ctx2.moveTo(x2,y);ctx2.lineTo(x2,y+dir*arm);ctx2.stroke();
 const tx=(x1+x2)/2,ty=y-dir*5;ctx2.font='700 14px Arial,sans-serif';ctx2.textAlign='center';ctx2.textBaseline=dir<0?'bottom':'top';if(label)ctx2.fillText(label,tx,ty);ctx2.restore();
 hot.push({obj,id,x1:Math.min(x1,x2)-8,x2:Math.max(x1,x2)+8,y1:y-18,y2:y+18});
}
function drawPartOrEqual(obj){
 const st=ensureState(obj),n=Math.max(2,obj.barCount||2),cuts=cutsFor(obj),bounds=[0,...cuts,1];
 const left=(obj.x+obj.w*(60/900))*cssW,right=(obj.x+obj.w*(840/900))*cssW,top=(obj.y+obj.h*(90/300))*cssH,bottom=(obj.y+obj.h*(210/300))*cssH;
 if(st.whole?.visible)lineBracket(left,right,bottom+24,1,st.whole.label||'','whole',obj);
 for(let i=0;i<n;i++){
  const x1=left+(right-left)*bounds[i],x2=left+(right-left)*bounds[i+1];
  const b=st['p'+i];if(b?.visible)lineBracket(x1,x2,top-22,-1,b.label||'','p'+i,obj);
 }
}
function drawComparison(obj){
 const st=ensureState(obj),n=Math.max(2,obj.barCount||2),widths=compWidths(obj),H=Math.max(260,120+n*115);
 for(let i=0;i<n;i++){
  const x1=(obj.x+obj.w*(70/900))*cssW,x2=(obj.x+obj.w*((70+760*widths[i])/900))*cssW;
  const top=(obj.y+obj.h*((45+i*105)/H))*cssH;
  const b=st['c'+i];if(b?.visible)lineBracket(x1,x2,top-18,-1,b.label||'','c'+i,obj);
 }
}
function drawAll(){
 hot=[];
 for(const obj of strokes){
  if(!obj||obj.smartType!=='barModel'||!obj.w||!obj.h)continue;
  if(obj.smartBarType==='partwhole'||obj.smartBarType==='equal')drawPartOrEqual(obj);
  else if(obj.smartBarType==='comparison')drawComparison(obj);
 }
}
const priorRedraw=redraw;redraw=function(){priorRedraw();drawAll()};
function hitBracket(clientX,clientY){
 const r=canvas.getBoundingClientRect(),x=(clientX-r.left)*(cssW/Math.max(1,r.width)),y=(clientY-r.top)*(cssH/Math.max(1,r.height));
 for(let i=hot.length-1;i>=0;i--){const h=hot[i];if(x>=h.x1&&x<=h.x2&&y>=h.y1&&y<=h.y2)return h}return null;
}
function showPanel(h,clientX,clientY){
 closePanel();const obj=strokes.find(s=>s&&s.smartId===h.obj.smartId);if(!obj)return;const st=ensureState(obj),entry=st[h.id];if(!entry)return;
 panel=document.createElement('div');panel.style.cssText='position:fixed;z-index:10080;width:260px;padding:10px;background:#fff;border:1px solid #cfd9de;border-radius:13px;box-shadow:0 10px 28px rgba(23,50,77,.22);left:'+Math.min(innerWidth-268,Math.max(8,clientX-120))+'px;top:'+Math.min(innerHeight-120,Math.max(8,clientY+12))+'px';
 const title=document.createElement('div');title.textContent=L.title;title.style.cssText='font:800 11px Inter,system-ui,sans-serif;color:#667085;margin-bottom:7px';
 const input=document.createElement('input');input.type='text';input.maxLength=30;input.placeholder=L.placeholder;input.value=entry.label||'';input.style.cssText='width:100%;border:1px solid #cfd9de;border-radius:9px;padding:7px 8px;font-size:12px;font-weight:700;color:#17324d;margin-bottom:7px';
 const row=document.createElement('div');row.style.cssText='display:flex;gap:6px';
 const apply=document.createElement('button');apply.type='button';apply.className='btn soft';apply.textContent=L.apply;apply.style.cssText='min-height:32px;padding:5px 8px;font-size:11px;flex:1';
 const del=document.createElement('button');del.type='button';del.className='btn danger';del.textContent=L.del;del.style.cssText='min-height:32px;padding:5px 8px;font-size:11px;flex:1';
 const commit=()=>{const o=strokes.find(s=>s&&s.smartId===h.obj.smartId);if(!o)return;window.__smartBarLastHistory={before:clone(strokes),afterId:o.smartId};const s=ensureState(o);s[h.id].label=input.value.trim();redraw();syncUi();closePanel()};
 apply.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();commit()},true);
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();commit()}else if(e.key==='Escape'){e.preventDefault();closePanel()}},true);
 del.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const o=strokes.find(s=>s&&s.smartId===h.obj.smartId);if(!o)return;window.__smartBarLastHistory={before:clone(strokes),afterId:o.smartId};const s=ensureState(o);s[h.id].visible=false;redraw();syncUi();closePanel()},true);
 row.append(apply,del);panel.append(title,input,row);document.body.appendChild(panel);setTimeout(()=>input.focus(),0);
}
canvas.addEventListener('click',e=>{const h=hitBracket(e.clientX,e.clientY);if(!h)return;e.preventDefault();e.stopImmediatePropagation();showPanel(h,e.clientX,e.clientY)},true);
document.addEventListener('pointerdown',e=>{if(panel&&!panel.contains(e.target)&&e.target!==canvas)closePanel()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePanel()},true);
setTimeout(()=>{try{redraw()}catch{}},0);
})();
