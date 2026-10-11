(function(){
'use strict';
if(typeof canvas==='undefined'||typeof strokes==='undefined'||typeof redraw!=='function'||typeof syncUi!=='function')return;

const edition=(new URLSearchParams(location.search).get('edition')||'en').toLowerCase();
const TXT={
 en:{fraction:'Fraction Bar',active:'✨ Smart Math · Fraction Bar · Pen',finish:'✓ Finished fraction?',draw:'Draw the fraction bar, then click “Finished fraction?”.',no:'I could not identify a fraction bar yet.',made:'fraction bar created',colour:'Choose a colour for this part'},
 zh:{fraction:'分数条',active:'✨ 智能数学 · 分数条 · 画笔',finish:'✓ 分数条画完了吗？',draw:'画好分数条后，点击“分数条画完了吗？”。',no:'暂时无法识别分数条。',made:'已创建分数条',colour:'为这一格选择颜色'},
 ms:{fraction:'Bar Pecahan',active:'✨ Matematik Pintar · Bar Pecahan · Pen',finish:'✓ Siap bar pecahan?',draw:'Lukis bar pecahan, kemudian klik “Siap bar pecahan?”.',no:'Bar pecahan belum dapat dikenal pasti.',made:'bar pecahan dicipta',colour:'Pilih warna untuk bahagian ini'},
 ta:{fraction:'பின்னப் பட்டை',active:'✨ நுண்ணறிவு கணிதம் · பின்னப் பட்டை · பேனா',finish:'✓ பின்னப் பட்டை முடிந்ததா?',draw:'பின்னப் பட்டையை வரைந்து முடித்ததும் “முடிந்ததா?” என்பதைக் கிளிக் செய்யவும்.',no:'பின்னப் பட்டையை இன்னும் அடையாளம் காண முடியவில்லை.',made:'பின்னப் பட்டை உருவாக்கப்பட்டது',colour:'இந்தப் பகுதிக்கான நிறத்தைத் தேர்ந்தெடுக்கவும்'}
};
const L=TXT[edition]||TXT.en;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clone=v=>JSON.parse(JSON.stringify(v));
const uid=()=>`smf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const PART_COLOURS=[['#dc2626','Red'],['#2563eb','Blue'],['#facc15','Yellow'],['#15803d','Green'],['#7c3aed','Purple'],['#f97316','Orange'],['#17324d','Navy'],['#ffffff','White']];
let active=false,startIndex=0,doneBtn=null,lastHistory=null,baseLabel='',colourPanel=null;

function notify(msg){if(typeof say==='function')say(msg);else{const t=document.getElementById('toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1600)}}}
function rawInk(s){return !!(s&&Array.isArray(s.points)&&s.points.length&&!s.erase&&!s.smartGenerated&&!s.background)}
function box(s){let minX=1,minY=1,maxX=0,maxY=0;for(const p of s.points||[]){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y)}return{x:minX,y:minY,w:Math.max(.001,maxX-minX),h:Math.max(.001,maxY-minY),cx:(minX+maxX)/2,cy:(minY+maxY)/2}}
function groupBox(arr){let minX=1,minY=1,maxX=0,maxY=0;for(const s of arr){const b=box(s);minX=Math.min(minX,b.x);minY=Math.min(minY,b.y);maxX=Math.max(maxX,b.x+b.w);maxY=Math.max(maxY,b.y+b.h)}return{x:minX,y:minY,w:Math.max(.001,maxX-minX),h:Math.max(.001,maxY-minY),cx:(minX+maxX)/2,cy:(minY+maxY)/2}}
function pathLen(s){let n=0,p=s.points||[];for(let i=1;i<p.length;i++)n+=Math.hypot((p[i].x-p[i-1].x)*cssW,(p[i].y-p[i-1].y)*cssH);return n}
function closure(s){const p=s.points||[];if(p.length<2)return Infinity;return Math.hypot((p[0].x-p[p.length-1].x)*cssW,(p[0].y-p[p.length-1].y)*cssH)}
function smartButton(){return document.getElementById('smartMathBtn')}
function forcePen(){try{tool='pen';syncUi();canvas.style.cursor='crosshair'}catch{}}
function showActive(){const sm=smartButton();if(sm){if(!baseLabel)baseLabel=sm.textContent;sm.textContent=L.active;sm.title=L.active;sm.classList.add('active');sm.classList.remove('soft')}if(doneBtn)doneBtn.style.display='inline-flex'}
function deactivate(){active=false;if(doneBtn)doneBtn.style.display='none';const sm=smartButton();if(sm){sm.textContent=baseLabel||'✨ Smart Math';sm.title=sm.textContent;sm.classList.remove('active');sm.classList.add('soft')}}
function svgData(svg){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
function makeFinishButton(){if(doneBtn)return;const sm=smartButton();if(!sm)return;doneBtn=document.createElement('button');doneBtn.type='button';doneBtn.className='btn soft';doneBtn.textContent=L.finish;doneBtn.style.cssText='display:none;min-height:32px;padding:5px 9px;font-size:11px;border-style:dashed';sm.insertAdjacentElement('afterend',doneBtn);doneBtn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();finishFraction()},true)}

function dedupePositions(items,tol){items.sort((a,b)=>a-b);const out=[];for(const p of items){if(!out.length||Math.abs(p-out[out.length-1])>tol)out.push(p)}return out}

function analyseFraction(group){
 if(!group.length)return null;
 const gb=groupBox(group),gw=gb.w*cssW,gh=gb.h*cssH;
 if(gw<60||gh<18)return null;
 const horizontal=gw>=gh;
 let outer=null,best=-1;
 for(const s of group){
   const b=box(s),pw=b.w*cssW,ph=b.h*cssH,diag=Math.hypot(pw,ph);
   const closed=1-clamp(closure(s)/Math.max(12,diag),0,1);
   const aspect=Math.max(pw/ph,ph/pw);
   const areaScore=(pw*ph)/Math.max(1,gw*gh);
   const score=closed+(aspect>1.35?.3:0)+areaScore*.3;
   if(closed>.30&&areaScore>.35&&score>best){best=score;outer=s}
 }
 const ob=outer?box(outer):gb;
 const bw=ob.w*cssW,bh=ob.h*cssH;
 if(horizontal&&bw<60)return null;
 if(!horizontal&&bh<60)return null;
 const positions=[];
 for(const s of group){
   if(s===outer)continue;
   const b=box(s),pw=b.w*cssW,ph=b.h*cssH;
   const relX=(b.cx-ob.x)/Math.max(.001,ob.w);
   const relY=(b.cy-ob.y)/Math.max(.001,ob.h);
   if(horizontal){
     const verticalEnough=ph>=Math.max(10,bh*.42)&&ph>=pw*.75;
     const inside=relX>.055&&relX<.945;
     const overlaps=b.cy>ob.y-ob.h*.25&&b.cy<ob.y+ob.h*1.25;
     if(verticalEnough&&inside&&overlaps)positions.push(b.cx);
   }else{
     const horizontalEnough=pw>=Math.max(10,bw*.42)&&pw>=ph*.75;
     const inside=relY>.055&&relY<.945;
     const overlaps=b.cx>ob.x-ob.w*.25&&b.cx<ob.x+ob.w*1.25;
     if(horizontalEnough&&inside&&overlaps)positions.push(b.cy);
   }
 }
 const tol=(horizontal?ob.w:ob.h)*.035;
 const unique=dedupePositions(positions,tol);
 const parts=unique.length+1;
 if(parts<2||parts>12)return null;
 return{box:ob,horizontal,parts,group};
}

function buildFractionSrc(n,horizontal,fills){
 const svgW=horizontal?900:260,svgH=horizontal?220:900,els=[];
 const safe=Array.from({length:n},(_,i)=>fills?.[i]||'#ffffff');
 if(horizontal){
   const innerW=svgW-20,partW=innerW/n;
   for(let i=0;i<n;i++)els.push(`<rect x="${10+i*partW}" y="10" width="${partW}" height="${svgH-20}" fill="${safe[i]}"/>`);
 }else{
   const innerH=svgH-20,partH=innerH/n;
   for(let i=0;i<n;i++)els.push(`<rect x="10" y="${10+i*partH}" width="${svgW-20}" height="${partH}" fill="${safe[i]}"/>`);
 }
 els.push(`<rect x="10" y="10" width="${svgW-20}" height="${svgH-20}" rx="2" fill="none" stroke="#17324d" stroke-width="10"/>`);
 for(let i=1;i<n;i++){
   if(horizontal){const x=10+(svgW-20)*i/n;els.push(`<line x1="${x}" y1="10" x2="${x}" y2="${svgH-10}" stroke="#17324d" stroke-width="8"/>`)}
   else{const y=10+(svgH-20)*i/n;els.push(`<line x1="10" y1="${y}" x2="${svgW-10}" y2="${y}" stroke="#17324d" stroke-width="8"/>`)}
 }
 return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">${els.join('')}</svg>`);
}

function finishFraction(){
 if(!active)return;
 const group=strokes.slice(startIndex).filter(rawInk);
 const f=analyseFraction(group);
 if(!f){notify(L.no);forcePen();showActive();return}
 const before=clone(strokes),set=new Set(group),b=f.box,n=f.parts;
 strokes=strokes.filter(s=>!set.has(s));
 const fills=Array(n).fill('#ffffff');
 const minW=f.horizontal?.10:.055,minH=f.horizontal?.055:.10;
 const obj={type:'image',src:buildFractionSrc(n,f.horizontal,fills),x:clamp(b.x,0,.96),y:clamp(b.y,0,.96),w:clamp(b.w,minW,1-b.x),h:clamp(b.h,minH,1-b.y),smartGenerated:true,smartType:'fractionBar',smartId:uid(),smartOriginal:clone(group),fractionParts:n,fractionHorizontal:f.horizontal,fractionFills:fills};
 strokes.push(obj);lastHistory={before,afterId:obj.smartId};redraw();syncUi();try{tool='select';syncUi()}catch{};deactivate();notify(`${n}-part ${L.made}`)
}

function hitFraction(clientX,clientY){
 const r=canvas.getBoundingClientRect(),x=(clientX-r.left)/Math.max(1,r.width),y=(clientY-r.top)/Math.max(1,r.height);
 for(let i=strokes.length-1;i>=0;i--){const s=strokes[i];if(!s||s.smartType!=='fractionBar'||!s.fractionParts||!s.w||!s.h)continue;if(x<s.x||x>s.x+s.w||y<s.y||y>s.y+s.h)continue;const rel=s.fractionHorizontal?(x-s.x)/s.w:(y-s.y)/s.h;return{obj:s,index:clamp(Math.floor(rel*s.fractionParts),0,s.fractionParts-1)}}
 return null;
}
function closeColourPanel(){if(colourPanel){colourPanel.remove();colourPanel=null}}
function showPartColours(hit,clientX,clientY){
 closeColourPanel();notify(L.colour);
 const panel=document.createElement('div');colourPanel=panel;
 panel.style.cssText='position:fixed;z-index:10000;display:flex;gap:6px;align-items:center;padding:7px;background:white;border:1px solid #cfd9de;border-radius:12px;box-shadow:0 8px 24px rgba(23,50,77,.20);left:'+Math.min(innerWidth-300,Math.max(8,clientX-110))+'px;top:'+Math.min(innerHeight-58,Math.max(8,clientY+12))+'px';
 for(const [hex,name] of PART_COLOURS){const b=document.createElement('button');b.type='button';b.title=name;b.setAttribute('aria-label',name);b.style.cssText=`width:28px;height:28px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 1px #aab7c0;background:${hex};padding:0`;b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const before=clone(strokes);const obj=strokes.find(s=>s.smartId===hit.obj.smartId);if(!obj){closeColourPanel();return}obj.fractionFills=Array.from({length:obj.fractionParts},(_,i)=>obj.fractionFills?.[i]||'#ffffff');obj.fractionFills[hit.index]=hex;obj.src=buildFractionSrc(obj.fractionParts,obj.fractionHorizontal,obj.fractionFills);lastHistory={before,afterId:obj.smartId};closeColourPanel();redraw();syncUi()},true);panel.appendChild(b)}
 document.body.appendChild(panel);
}

makeFinishButton();

document.addEventListener('click',e=>{
 const b=e.target?.closest?.('button');if(!b)return;const label=b.textContent.trim();
 if(label===L.fraction){const sm=smartButton();if(!sm)return;e.preventDefault();e.stopImmediatePropagation();if(!baseLabel)baseLabel=sm.textContent;active=true;startIndex=strokes.length;showActive();forcePen();notify(L.draw);return}
 if(active&&['Auto Detect','Counters','Bar Model','Number Line','Equation','3D Solid','Smart Math Off','自动识别','计数片','条形图','数轴','算式','3D 立体图形','关闭智能数学','Kesan Auto','Pembilang','Model Bar','Garis Nombor','Persamaan','Pepejal 3D','Matematik Pintar Mati','தானாக கண்டறி','எண்ணிகள்','பார் மாதிரி','எண் கோடு','சமன்பாடு','3D திண்மம்','நுண்ணறிவு கணிதம் நிறுத்து'].includes(label)){deactivate()}
},true);

canvas.addEventListener('click',e=>{const hit=hitFraction(e.clientX,e.clientY);if(!hit){closeColourPanel();return}e.preventDefault();e.stopImmediatePropagation();showPartColours(hit,e.clientX,e.clientY)},true);
document.addEventListener('pointerdown',e=>{if(colourPanel&&!colourPanel.contains(e.target)&&e.target!==canvas)closeColourPanel()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeColourPanel();if(active)deactivate()}},true);
undoBtn.addEventListener('click',e=>{if(!lastHistory)return;const present=strokes.some(s=>s.smartId===lastHistory.afterId);if(!present)return;e.preventDefault();e.stopImmediatePropagation();strokes=clone(lastHistory.before);lastHistory=null;closeColourPanel();redraw();syncUi();notify('Smart Math fraction undone')},true);
})();
