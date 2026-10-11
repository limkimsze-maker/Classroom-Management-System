(function(){
'use strict';
if(typeof canvas==='undefined'||typeof strokes==='undefined'||typeof redraw!=='function'||typeof syncUi!=='function')return;
const smartBtn=document.getElementById('smartMathBtn');
if(!smartBtn)return;
const edition=(new URLSearchParams(location.search).get('edition')||'en').toLowerCase();
const TXT={
 en:{bar:'Bar Model',choose:'Choose bar model',partwhole:'Part–Whole',comparison:'Comparison',equal:'Equal Groups',missing:'Missing Part',finish:'✓ Finished bar model?',draw:'Draw the bar model, then click “Finished bar model?”.',no:'I could not identify the bar model yet.',made:'bar model created'},
 zh:{bar:'条形图',choose:'选择条形图类型',partwhole:'部分–整体',comparison:'比较',equal:'等组',missing:'缺失部分',finish:'✓ 条形图画完了吗？',draw:'画好条形图后，点击“条形图画完了吗？”。',no:'暂时无法识别条形图。',made:'已创建条形图'},
 ms:{bar:'Model Bar',choose:'Pilih jenis model bar',partwhole:'Bahagian–Keseluruhan',comparison:'Perbandingan',equal:'Kumpulan Sama',missing:'Bahagian Hilang',finish:'✓ Siap model bar?',draw:'Lukis model bar, kemudian klik “Siap model bar?”.',no:'Model bar belum dapat dikenal pasti.',made:'model bar dicipta'},
 ta:{bar:'பார் மாதிரி',choose:'பார் மாதிரி வகையைத் தேர்வு செய்',partwhole:'பகுதி–முழு',comparison:'ஒப்பீடு',equal:'சமக் குழுக்கள்',missing:'காணாத பகுதி',finish:'✓ பார் மாதிரி முடிந்ததா?',draw:'பார் மாதிரியை வரைந்து முடித்ததும் “முடிந்ததா?” என்பதைக் கிளிக் செய்யவும்.',no:'பார் மாதிரியை இன்னும் அடையாளம் காண முடியவில்லை.',made:'பார் மாதிரி உருவாக்கப்பட்டது'}
};
const L=TXT[edition]||TXT.en;
const LABEL={partwhole:L.partwhole,comparison:L.comparison,equal:L.equal,missing:L.missing};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clone=v=>JSON.parse(JSON.stringify(v));
const uid=()=>`smb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
let submenu=null,barButton=null,active=false,startIndex=0,barType='',doneBtn=null,baseLabel='';

function rawInk(s){return !!(s&&Array.isArray(s.points)&&s.points.length&&!s.erase&&!s.smartGenerated&&!s.background)}
function box(s){let minX=1,minY=1,maxX=0,maxY=0;for(const p of s.points||[]){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y)}return{x:minX,y:minY,w:Math.max(.001,maxX-minX),h:Math.max(.001,maxY-minY),cx:(minX+maxX)/2,cy:(minY+maxY)/2}}
function groupBox(arr){let minX=1,minY=1,maxX=0,maxY=0;for(const s of arr){const b=box(s);minX=Math.min(minX,b.x);minY=Math.min(minY,b.y);maxX=Math.max(maxX,b.x+b.w);maxY=Math.max(maxY,b.y+b.h)}return{x:minX,y:minY,w:Math.max(.001,maxX-minX),h:Math.max(.001,maxY-minY),cx:(minX+maxX)/2,cy:(minY+maxY)/2}}
function notify(msg){if(typeof say==='function')say(msg);else{const t=document.getElementById('toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1500)}}}
function forcePen(){try{tool='pen';syncUi();canvas.style.cursor='crosshair'}catch{}}
function svgData(svg){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
function findBarButton(){const candidates=[...document.querySelectorAll('body > div button,.btn')];return candidates.find(b=>b!==smartBtn&&(b.textContent||'').trim()===L.bar)||null}
function close(){if(submenu)submenu.style.display='none'}
function showActive(){if(!baseLabel)baseLabel=smartBtn.textContent;smartBtn.textContent=`✨ ${L.bar} · ${LABEL[barType]} · Pen`;smartBtn.title=smartBtn.textContent;smartBtn.classList.add('active');smartBtn.classList.remove('soft');if(doneBtn)doneBtn.style.display='inline-flex'}
function deactivate(){active=false;if(doneBtn)doneBtn.style.display='none';smartBtn.textContent=baseLabel||'✨ Smart Math';smartBtn.title=smartBtn.textContent;smartBtn.classList.remove('active');smartBtn.classList.add('soft')}
function makeFinishButton(){if(doneBtn)return;doneBtn=document.createElement('button');doneBtn.type='button';doneBtn.className='btn soft';doneBtn.textContent=L.finish;doneBtn.style.cssText='display:none;min-height:32px;padding:5px 9px;font-size:11px;border-style:dashed';smartBtn.insertAdjacentElement('afterend',doneBtn);doneBtn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();finishBar()},true)}

function dedupe(vals,tol){vals.sort((a,b)=>a-b);const out=[];for(const v of vals)if(!out.length||Math.abs(v-out[out.length-1])>tol)out.push(v);return out}
function inferParts(group,gb,maxParts){
 const xs=[];for(const s of group){const b=box(s),pw=b.w*cssW,ph=b.h*cssH;const rx=(b.cx-gb.x)/Math.max(.001,gb.w),ry=(b.cy-gb.y)/Math.max(.001,gb.h);if(ph>=Math.max(10,gb.h*cssH*.38)&&ph>=pw*.72&&rx>.055&&rx<.945&&ry>-.25&&ry<1.25)xs.push(b.cx)}
 return clamp(dedupe(xs,gb.w*.035).length+1,2,maxParts);
}
function inferComparisonRows(group,gb){
 let ys=[];for(const s of group){const b=box(s),pw=b.w*cssW,ph=b.h*cssH;if(pw>=70&&pw>=ph*1.7)ys.push(b.cy)}
 ys=dedupe(ys,Math.max(.025,gb.h*.12));
 if(ys.length<2){const all=group.map(s=>box(s).cy);ys=dedupe(all,Math.max(.04,gb.h*.18))}
 return clamp(ys.length,2,5);
}
function buildModel(type,count){
 const W=900,H=type==='comparison'?Math.max(260,120+count*115):300,els=[];
 const stroke='#17324d',fill='#ffffff';
 if(type==='comparison'){
  const maxW=760;for(let i=0;i<count;i++){const w=maxW*(1-i*.11);els.push(`<rect x="70" y="${45+i*105}" width="${w}" height="72" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="8"/>`)}
 }else{
  const x=60,y=90,w=780,h=120,part=w/count;
  els.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="8"/>`);
  for(let i=1;i<count;i++)els.push(`<line x1="${x+i*part}" y1="${y}" x2="${x+i*part}" y2="${y+h}" stroke="${stroke}" stroke-width="7"/>`);
  if(type==='missing')els.push(`<text x="${x+w-part/2}" y="${y+h/2+18}" text-anchor="middle" font-family="Arial,sans-serif" font-size="56" font-weight="700" fill="${stroke}">?</text>`);
 }
 return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${els.join('')}</svg>`)
}
function analyse(group){if(!group.length)return null;const gb=groupBox(group),gw=gb.w*cssW,gh=gb.h*cssH;if(gw<70||gh<18)return null;if(barType==='comparison'){const count=inferComparisonRows(group,gb);if(count<2)return null;return{box:gb,count}}const max=barType==='equal'?12:8;const count=inferParts(group,gb,max);return{box:gb,count}}
function finishBar(){
 if(!active||!barType)return;
 const group=strokes.slice(startIndex).filter(rawInk),a=analyse(group);if(!a){notify(L.no);forcePen();showActive();return}
 const before=clone(strokes),set=new Set(group);strokes=strokes.filter(s=>!set.has(s));
 const b=a.box,obj={type:'image',src:buildModel(barType,a.count),x:clamp(b.x,0,.94),y:clamp(b.y,0,.94),w:clamp(b.w,.12,1-b.x),h:clamp(Math.max(b.h,barType==='comparison'?.12:.08),.08,1-b.y),smartGenerated:true,smartType:'barModel',smartBarType:barType,smartId:uid(),barCount:a.count,smartOriginal:clone(group)};
 strokes.push(obj);window.__smartBarLastHistory={before,afterId:obj.smartId};redraw();syncUi();try{tool='select';syncUi()}catch{};const label=LABEL[barType];deactivate();notify(`${label} ${L.made}`)
}
function begin(type){barType=type;window.__smartBarType=type;active=true;startIndex=strokes.length;close();showActive();forcePen();notify(L.draw)}
function ensureSubmenu(){
 if(submenu)return submenu;submenu=document.createElement('div');submenu.id='smartBarTypeMenu';Object.assign(submenu.style,{position:'fixed',zIndex:'10040',display:'none',minWidth:'190px',padding:'7px',background:'#fff',border:'1px solid #d8e1e8',borderRadius:'12px',boxShadow:'0 10px 30px rgba(18,32,46,.22)'});
 const title=document.createElement('div');title.textContent=L.choose;Object.assign(title.style,{font:'900 11px Inter,system-ui,sans-serif',color:'#667085',padding:'4px 7px 6px'});submenu.appendChild(title);
 [['partwhole',L.partwhole],['comparison',L.comparison],['equal',L.equal],['missing',L.missing]].forEach(([key,label])=>{const b=document.createElement('button');b.className='btn';b.type='button';b.textContent=label;b.style.cssText='display:block;width:100%;text-align:left;margin:3px 0';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();begin(key)});submenu.appendChild(b)});
 document.body.appendChild(submenu);return submenu
}
function openNear(btn){const m=ensureSubmenu(),r=btn.getBoundingClientRect();m.style.left=Math.max(8,Math.min(innerWidth-205,r.right+6))+'px';m.style.top=Math.max(8,Math.min(innerHeight-230,r.top))+'px';m.style.display='block'}
function hook(){barButton=findBarButton();if(!barButton)return false;if(barButton.dataset.smartBarSplit==='2')return true;barButton.dataset.smartBarSplit='2';barButton.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openNear(barButton)},true);return true}
makeFinishButton();if(!hook()){let tries=0;const id=setInterval(()=>{if(hook()||++tries>40)clearInterval(id)},100)}
document.addEventListener('pointerdown',e=>{if(submenu&&submenu.style.display==='block'&&!submenu.contains(e.target)&&e.target!==barButton)close()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();if(active)deactivate()}},true);
})();
