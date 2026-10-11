(function(){
'use strict';
const smartBtn=document.getElementById('smartMathBtn');
if(!smartBtn)return;
const edition=(new URLSearchParams(location.search).get('edition')||'en').toLowerCase();
const TXT={
 en:{bar:'Bar Model',choose:'Choose bar model',partwhole:'Part–Whole',comparison:'Comparison',equal:'Equal Groups',missing:'Missing Part'},
 zh:{bar:'条形图',choose:'选择条形图类型',partwhole:'部分–整体',comparison:'比较',equal:'等组',missing:'缺失部分'},
 ms:{bar:'Model Bar',choose:'Pilih jenis model bar',partwhole:'Bahagian–Keseluruhan',comparison:'Perbandingan',equal:'Kumpulan Sama',missing:'Bahagian Hilang'},
 ta:{bar:'பார் மாதிரி',choose:'பார் மாதிரி வகையைத் தேர்வு செய்',partwhole:'பகுதி–முழு',comparison:'ஒப்பீடு',equal:'சமக் குழுக்கள்',missing:'காணாத பகுதி'}
};
const L=TXT[edition]||TXT.en;
let submenu=null,barButton=null,originalHandler=null;

function findBarButton(){
 const candidates=[...document.querySelectorAll('body > div button,.btn')];
 return candidates.find(b=>b!==smartBtn&&(b.textContent||'').trim()===L.bar)||null;
}
function notify(msg){
 if(typeof say==='function')say(msg);else{
  const t=document.getElementById('toast');
  if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1400)}
 }
}
function close(){if(submenu)submenu.style.display='none'}
function ensureSubmenu(){
 if(submenu)return submenu;
 submenu=document.createElement('div');submenu.id='smartBarTypeMenu';
 Object.assign(submenu.style,{position:'fixed',zIndex:'10040',display:'none',minWidth:'190px',padding:'7px',background:'#fff',border:'1px solid #d8e1e8',borderRadius:'12px',boxShadow:'0 10px 30px rgba(18,32,46,.22)'});
 const title=document.createElement('div');title.textContent=L.choose;Object.assign(title.style,{font:'900 11px Inter,system-ui,sans-serif',color:'#667085',padding:'4px 7px 6px'});submenu.appendChild(title);
 [['partwhole',L.partwhole],['comparison',L.comparison],['equal',L.equal],['missing',L.missing]].forEach(([key,label])=>{
  const b=document.createElement('button');b.className='btn';b.type='button';b.textContent=label;b.style.cssText='display:block;width:100%;text-align:left;margin:3px 0';
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.__smartBarType=key;close();if(typeof originalHandler==='function')originalHandler.call(barButton,e);setTimeout(()=>{smartBtn.textContent=`✨ ${L.bar} · ${label}`;smartBtn.title=`${L.bar} · ${label}`;notify(`${L.bar}: ${label}`)},0)});
  submenu.appendChild(b);
 });
 document.body.appendChild(submenu);return submenu;
}
function openNear(btn){const m=ensureSubmenu(),r=btn.getBoundingClientRect();m.style.left=Math.max(8,Math.min(innerWidth-205,r.right+6))+'px';m.style.top=Math.max(8,Math.min(innerHeight-230,r.top))+'px';m.style.display='block'}
function hook(){
 barButton=findBarButton();if(!barButton)return false;
 if(barButton.dataset.smartBarSplit==='1')return true;
 originalHandler=barButton.onclick;
 barButton.dataset.smartBarSplit='1';
 barButton.addEventListener('click',e=>{if(e.__smartBarChosen)return;e.preventDefault();e.stopImmediatePropagation();openNear(barButton)},true);
 document.addEventListener('pointerdown',e=>{if(submenu&&submenu.style.display==='block'&&!submenu.contains(e.target)&&e.target!==barButton)close()},true);
 return true;
}
if(!hook()){let tries=0;const id=setInterval(()=>{if(hook()||++tries>40)clearInterval(id)},100)}
})();
