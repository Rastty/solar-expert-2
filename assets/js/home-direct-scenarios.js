/* Home-only explicit first-step shortcut. Preserve native presets and analytics. */
(function(){
 'use strict';
 function mount(){
  if(window.location.pathname!=='/')return;
  const root=document.querySelector('#builder[x-data="solarExpertBuilder()"]');
  const hero=document.querySelector('.se-hero-actions');
  const alpine=window.Alpine;
  if(!root||!hero||!alpine||typeof alpine.$data!=='function'||hero.querySelector('[data-se-home-scenarios="v1"]'))return;
  const old=Array.from(hero.querySelectorAll('a[href="#builder"]')).filter(a=>!a.hasAttribute('data-se-home-demo')&&a.textContent.includes('Spočítat vlastní sestavu'));
  const s=alpine.$data(root);
  if(old.length!==1||!s||typeof s.preset!=='function'||typeof alpine.effect!=='function')return;
  const group=document.createElement('div');
  group.setAttribute('data-se-home-scenarios','v1');
  group.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center;width:100%';
  const label=document.createElement('strong');
  label.textContent='Nebo rovnou vyberte vlastní scénář:';
  label.style.width='100%';
  group.append(label);
  const buttons=[];
  for(const [id,title] of [['chata','Chata'],['offgrid','Ostrovní systém'],['backup','Záloha při výpadku']]){
   const b=document.createElement('button');b.type='button';b.className='se-btn';
   b.textContent=title+' →';b.setAttribute('data-se-home-scenario',id);b.setAttribute('aria-controls','builder');
   b.addEventListener('click',e=>{
    if(!e.isTrusted||s.step!==1)return;
    // The existing first-party activation listener deduplicates exposure/start.
    root.dispatchEvent(new CustomEvent('solar-expert-builder-activated'));
    s.preset(id);
    if(s.step!==2)return;
    const reveal=()=>{
     root.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
     const h=root.querySelector('h2');
     if(h){if(!h.hasAttribute('tabindex'))h.setAttribute('tabindex','-1');h.focus({preventScroll:true});}
    };
    if(typeof alpine.nextTick==='function')alpine.nextTick(reveal);else Promise.resolve().then(reveal);
   });
   buttons.push(b);group.append(b);
  }
  // Existing generic link stays available after an in-progress calculation,
  // so scrolling back to an edited form never resets entered values.
  old[0].before(group);
  alpine.effect(()=>{
   const first=s.step===1;
   group.hidden=!first;group.style.display=first?'flex':'none';
   old[0].hidden=first;old[0].style.display=first?'none':'';
   buttons.forEach(b=>b.disabled=!first);
  });
 }
 document.addEventListener('alpine:initialized',mount,{once:true});
 if(document.readyState!=='loading'&&window.Alpine)mount();
})();
