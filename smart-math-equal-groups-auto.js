(function(){
'use strict';
if(typeof canvas==='undefined'||typeof strokes==='undefined'||typeof redraw!=='function'||typeof syncUi!=='function')return;
const edition=(new URLSearchParams(location.search).get('edition')||'en').toLowerCase();
const TXT={
 en:{equal:'Equal Groups',title:'Create Equal Groups',total:'Total',each:'In each group',preview:'groups',create:'Create model',cancel:'Cancel',bad:'Enter a total and an amount in each group. The total must make a whole number of equal groups.',made:'Equal Groups model created'},
 zh:{equal:'等组',title:'建立等组模型',total:'总数',each:'每组数量',preview:'组',create:'建立模型',cancel:'取消',bad:'请输入总数和每组数量。总数必须能组成整数个等组。',made:'已建立等组模型'},
 ms:{equal:'Kumpulan Sama',title:'Bina Kumpulan Sama',total:'Jumlah',each:'Dalam setiap kumpulan',preview:'kumpulan',create:'Bina model',cancel:'Batal',bad:'Masukkan jumlah dan nilai setiap kumpulan. Jumlah mesti menghasilkan bilangan kumpulan yang bulat.',made:'Model Kumpulan Sama dicipta'},
 ta:{equal:'சமக் குழுக்கள்',title:'சமக் குழுக்களை உருவாக்கு',total:'மொத்தம்',each:'ஒவ்வொரு குழுவிலும்',preview:'குழுக்கள்',create:'மாதிரியை உருவாக்கு',cancel:'ரத்து செய்',bad:'மொத்தத்தையும் ஒவ்வொரு குழுவிலுள்ள அளவையும் உள்ளிடவும். மொத்தம் முழு எண்ணிக்கையிலான சமக் குழுக்களாக இருக்க வேண்டும்.',made:'சமக் குழு மாதிரி உருவாக்கப்பட்டது'}
};
const L=TXT[edition]||TXT.en;
const clone=v=>JSON.parse(JSON.stringify(v));
const uid=()=>`smeg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
let panel=null;
function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&apos;'}[c]))}
function svgData(svg){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
function notify(msg){if(typeof say==='function')say(msg);else{const t=document.getElementById('toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1500)}}}
function numeric(v){const m=String(v||'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):NaN}
function close(){if(panel){panel.remove();panel=null}}
function bracket(x1,x2,y,dir,label){
 const arm=14,mid=(x1+x2)/2,tip=y+dir*10,endY=y-dir*arm;
 return `<path d="M ${x1} ${endY} Q ${x1} ${y} ${x1+10} ${y} L ${mid-14} ${y} Q ${mid} ${y} ${mid} ${tip} Q ${mid} ${y} ${mid+14} ${y} L ${x2-10} ${y} Q ${x2} ${y} ${x2} ${endY}" fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${label?`<text x="${mid}" y="${dir<0?y-20:y+42}" text-anchor="middle" font-family="Arial,sans-serif" font-size="34" font-weight="700" fill="#111827">${esc(label)}</text>`:''}`}
function build(totalLabel,eachLabel,count){
 const W=1000,H=360,stroke='#111827',fill='#8db8dc';
 const x=120,y=135,h=86,unit=118;
 const parts=[];
 parts.push(bracket(x,880,95,-1,totalLabel));
 if(count===2){
  const w=380;
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`);
  parts.push(`<rect x="${x+w}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`);
  parts.push(bracket(x,x+w,244,1,eachLabel));
  parts.push(bracket(x+w,x+2*w,244,1,eachLabel));
 }else{
  const leftW=unit,rightW=unit,midX=x+leftW,midW=760-leftW-rightW;
  parts.push(`<rect x="${x}" y="${y}" width="${leftW}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`);
  parts.push(`<line x1="${midX}" y1="${y}" x2="${midX+midW}" y2="${y}" stroke="${stroke}" stroke-width="4" stroke-dasharray="14 12"/>`);
  parts.push(`<line x1="${midX}" y1="${y+h}" x2="${midX+midW}" y2="${y+h}" stroke="${stroke}" stroke-width="4" stroke-dasharray="14 12"/>`);
  parts.push(`<rect x="${midX+midW}" y="${y}" width="${rightW}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`);
  parts.push(bracket(x,x+leftW,244,1,eachLabel));
  parts.push(bracket(midX+midW,midX+midW+rightW,244,1,eachLabel));
  parts.push(`<text x="500" y="185" text-anchor="middle" font-family="Arial,sans-serif" font-size="23" font-weight="700" fill="#667085">${count} ${esc(L.preview)}</text>`);
 }
 return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg>`);
}
function make(totalLabel,eachLabel,count){
 const before=clone(strokes);
 const obj={type:'image',src:build(totalLabel,eachLabel,count),x:.16,y:.18,w:.68,h:.42,smartGenerated:true,smartType:'barModel',smartBarType:'equalauto',smartId:uid(),equalTotalLabel:totalLabel,equalEachLabel:eachLabel,equalGroupCount:count,smartOriginal:[]};
 strokes.push(obj);window.__smartBarLastHistory={before,afterId:obj.smartId};redraw();syncUi();try{tool='select';syncUi()}catch{};notify(L.made)
}
function openPanel(){
 close();panel=document.createElement('div');
 panel.style.cssText='position:fixed;z-index:10120;width:min(360px,calc(100vw - 20px));padding:14px;background:#fff;border:1px solid #cfd9de;border-radius:15px;box-shadow:0 14px 36px rgba(23,50,77,.24);left:50%;top:50%;transform:translate(-50%,-50%)';
 const title=document.createElement('div');title.textContent=L.title;title.style.cssText='font:900 16px Inter,system-ui,sans-serif;color:#17324d;margin-bottom:11px';
 const mk=(label,ph)=>{const wrap=document.createElement('label');wrap.style.cssText='display:block;margin:8px 0;font:800 11px Inter,system-ui,sans-serif;color:#667085';wrap.textContent=label;const input=document.createElement('input');input.type='text';input.placeholder=ph;input.style.cssText='display:block;width:100%;margin-top:5px;border:1px solid #cfd9de;border-radius:10px;padding:9px 10px;font-size:15px;font-weight:800;color:#17324d';wrap.appendChild(input);return{wrap,input}};
 const t=mk(L.total,'72'),e=mk(L.each,'8');
 const hint=document.createElement('div');hint.style.cssText='min-height:21px;margin:7px 0 10px;font:800 12px Inter,system-ui,sans-serif;color:#0f766e';
 const row=document.createElement('div');row.style.cssText='display:flex;gap:7px';
 const create=document.createElement('button');create.type='button';create.className='btn soft';create.textContent=L.create;create.style.cssText='flex:1';
 const cancel=document.createElement('button');cancel.type='button';cancel.className='btn';cancel.textContent=L.cancel;cancel.style.cssText='flex:0 0 auto';
 function calc(){const a=numeric(t.input.value),b=numeric(e.input.value),q=a/b;if(Number.isFinite(q)&&b>0&&q>=2&&q<=30&&Math.abs(q-Math.round(q))<1e-8){hint.textContent=`${Math.round(q)} ${L.preview}`;return Math.round(q)}hint.textContent='';return null}
 t.input.addEventListener('input',calc);e.input.addEventListener('input',calc);
 create.addEventListener('click',ev=>{ev.preventDefault();const n=calc();if(!n){notify(L.bad);return}const total=t.input.value.trim(),each=e.input.value.trim();close();make(total,each,n)},true);
 cancel.addEventListener('click',ev=>{ev.preventDefault();close()},true);
 row.append(create,cancel);panel.append(title,t.wrap,e.wrap,hint,row);document.body.appendChild(panel);setTimeout(()=>t.input.focus(),0)
}
function hook(){
 const m=document.getElementById('smartBarTypeMenu');if(!m)return;
 const b=[...m.querySelectorAll('button')].find(x=>(x.textContent||'').trim()===L.equal);if(!b||b.dataset.equalAuto==='1')return;
 b.dataset.equalAuto='1';b.addEventListener('click',ev=>{ev.preventDefault();ev.stopImmediatePropagation();m.style.display='none';openPanel()},true)
}
new MutationObserver(hook).observe(document.body,{childList:true,subtree:true});hook();
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()},true);
})();
