(function(){
'use strict';
if(typeof canvas==='undefined'||typeof strokes==='undefined'||typeof redraw!=='function'||typeof syncUi!=='function')return;
const edition=(new URLSearchParams(location.search).get('edition')||'en').toLowerCase();
const TXT={
 en:{choose:'Choose a colour for this model part'},
 zh:{choose:'为这个条形图部分选择颜色'},
 ms:{choose:'Pilih warna untuk bahagian model ini'},
 ta:{choose:'இந்த மாதிரி பகுதியுக்கான நிறத்தைத் தேர்வு செய்'}
};
const L=TXT[edition]||TXT.en;
const COLOURS=[['#dc2626','Red'],['#2563eb','Blue'],['#facc15','Yellow'],['#15803d','Green'],['#7c3aed','Purple'],['#f97316','Orange'],['#dbeafe','Light Blue'],['#ffffff','White']];
let panel=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clone=v=>JSON.parse(JSON.stringify(v));
function svgData(svg){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
function notify(msg){if(typeof say==='function')say(msg);else{const t=document.getElementById('toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1400)}}}
function closePanel(){if(panel){panel.remove();panel=null}}
function cutsFor(obj){return Array.isArray(obj.barCuts)&&obj.barCuts.length===obj.barCount-1?obj.barCuts:Array.from({length:obj.barCount-1},(_,i)=>(i+1)/obj.barCount)}
function build(obj){
 const type=obj.smartBarType,count=obj.barCount||2,stroke='#17324d';
 const fills=Array.from({length:count},(_,i)=>obj.barFills?.[i]||'#ffffff');
 if(type==='comparison'){
  const W=900,H=Math.max(260,120+count*115),els=[],maxW=760;
  for(let i=0;i<count;i++){
   const w=maxW*(1-i*.11);
   els.push(`<rect x="70" y="${45+i*105}" width="${w}" height="72" rx="2" fill="${fills[i]}" stroke="${stroke}" stroke-width="8"/>`);
  }
  return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${els.join('')}</svg>`);
 }
 const W=900,H=300,x=60,y=90,w=780,h=120,els=[];
 const positions=type==='equal'?Array.from({length:count-1},(_,i)=>(i+1)/count):cutsFor(obj);
 const bounds=[0,...positions,1];
 for(let i=0;i<count;i++){
  const left=x+w*bounds[i],right=x+w*bounds[i+1];
  els.push(`<rect x="${left}" y="${y}" width="${right-left}" height="${h}" fill="${fills[i]}"/>`);
 }
 els.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="none" stroke="${stroke}" stroke-width="8"/>`);
 for(const r of positions){const px=x+w*r;els.push(`<line x1="${px}" y1="${y}" x2="${px}" y2="${y+h}" stroke="${stroke}" stroke-width="7"/>`)}
 if(type==='missing'){
  const i=Math.max(0,bounds.length-2),mid=(bounds[i]+bounds[i+1])/2;
  els.push(`<text x="${x+w*mid}" y="${y+h/2+18}" text-anchor="middle" font-family="Arial,sans-serif" font-size="56" font-weight="700" fill="${stroke}">?</text>`);
 }
 return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${els.join('')}</svg>`);
}
function hit(clientX,clientY){
 const r=canvas.getBoundingClientRect(),x=(clientX-r.left)/Math.max(1,r.width),y=(clientY-r.top)/Math.max(1,r.height);
 for(let i=strokes.length-1;i>=0;i--){
  const s=strokes[i];
  if(!s||s.smartType!=='barModel'||s.smartBarType==='partwhole'||!s.w||!s.h||!s.barCount)continue;
  if(x<s.x||x>s.x+s.w||y<s.y||y>s.y+s.h)continue;
  const rx=(x-s.x)/s.w,ry=(y-s.y)/s.h;
  if(s.smartBarType==='comparison'){
   const H=Math.max(260,120+s.barCount*115),px=rx*900,py=ry*H,maxW=760;
   for(let j=0;j<s.barCount;j++){
    const top=45+j*105,bottom=top+72,w=maxW*(1-j*.11);
    if(py>=top-10&&py<=bottom+10&&px>=55&&px<=70+w+15)return{obj:s,index:j};
   }
   const approx=clamp(Math.floor((py-25)/105),0,s.barCount-1);return{obj:s,index:approx};
  }
  const bounds=[0,...cutsFor(s),1];
  for(let j=0;j<s.barCount;j++)if(rx>=bounds[j]&&rx<=bounds[j+1])return{obj:s,index:j};
 }
 return null;
}
function show(hit,clientX,clientY){
 closePanel();notify(L.choose);
 panel=document.createElement('div');
 panel.style.cssText='position:fixed;z-index:10060;display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:8px;background:#fff;border:1px solid #cfd9de;border-radius:12px;box-shadow:0 8px 24px rgba(23,50,77,.20);left:'+Math.min(innerWidth-300,Math.max(8,clientX-110))+'px;top:'+Math.min(innerHeight-58,Math.max(8,clientY+12))+'px';
 for(const [hex,name] of COLOURS){
  const b=document.createElement('button');b.type='button';b.title=name;b.setAttribute('aria-label',name);b.style.cssText=`width:28px;height:28px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 1px #aab7c0;background:${hex};padding:0`;
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const obj=strokes.find(s=>s.smartId===hit.obj.smartId);if(!obj){closePanel();return}window.__smartBarLastHistory={before:clone(strokes),afterId:obj.smartId};obj.barFills=Array.from({length:obj.barCount},(_,i)=>obj.barFills?.[i]||'#ffffff');obj.barFills[hit.index]=hex;obj.src=build(obj);closePanel();redraw();syncUi()},true);
  panel.appendChild(b);
 }
 document.body.appendChild(panel);
}
canvas.addEventListener('click',e=>{const h=hit(e.clientX,e.clientY);if(!h){closePanel();return}e.preventDefault();e.stopImmediatePropagation();show(h,e.clientX,e.clientY)},true);
document.addEventListener('pointerdown',e=>{if(panel&&!panel.contains(e.target)&&e.target!==canvas)closePanel()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePanel()},true);
})();
