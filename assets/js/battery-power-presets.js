/* Explicit editable high-power battery examples. No automatic prefill, network or engine change. */
(function () {
  'use strict';
  function mount() {
    const root=document.querySelector('[x-data="solarExpertBatterySelector()"]');
    const alpine=window.Alpine;
    if(!root||!alpine||typeof alpine.$data!=='function')return;
    if(root.querySelector('[data-se-power-presets="v1"]'))return;
    const state=alpine.$data(root);
    if(!state||typeof state.run!=='function'||
      !['voltage','dailyKwh','autonomy','inverterW'].every(k=>k in state))return;
    const section=document.createElement('section');
    section.className='se-note';
    section.setAttribute('data-se-power-presets','v1');
    const heading=document.createElement('strong');
    heading.textContent='Baterie pro měnič 2 000 nebo 3 000 W: rychlé modely';
    const intro=document.createElement('p');
    intro.textContent='Model 1 hodiny plného výkonu za den, 1 den rezervy, spotřebiče na 230 V. Nejde o schválenou sestavu. Zvolte výhradně napětí svého měniče, upravte skutečnou spotřebu a připočtěte jeho klidový odběr. Ověřte také rozběh, BMS, jištění a kabeláž.';
    const buttons=document.createElement('div');
    buttons.className='se-actions';
    const status=document.createElement('p');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    for(const voltage of [24,48]){
      for(const watts of [2000,3000]){
        const b=document.createElement('button');
        b.type='button';
        b.className='se-btn';
        b.textContent=voltage+' V · '+(watts/1000)+' kW / 1 h';
        b.setAttribute('data-se-power-preset',voltage+'-'+watts);
        const ready=()=>!state.catalogLoading&&!state.catalogError&&Array.isArray(state.catalog)&&state.catalog.length>0;
        b.disabled=!ready();
        if(typeof alpine.effect==='function')alpine.effect(()=>{b.disabled=!ready();});
        b.addEventListener('click',()=>{
          if(!ready())return;
          // All four values are fixed editorial examples, not untrusted URL inputs.
          Object.assign(state,{voltage,dailyKwh:watts/1000,autonomy:1,inverterW:watts});
          if('supplyMode' in state)state.supplyMode='ac';
          if('articleExample' in state)state.articleExample=false;
          if('articleExampleKind' in state)state.articleExampleKind='';
          if('pendingExample' in state)state.pendingExample=false;
          if('activeScenario' in state)state.activeScenario='inverter-'+watts+'-'+voltage+'v-1h';
          // Real user-selected model; native matcher and native engagement path.
          state.run(true);
          status.textContent='Model '+voltage+' V / '+watts+' W byl vybrán. Upravte hodnoty podle své instalace.';
        });
        buttons.append(b);
      }
    }
    const refs=document.createElement('p');
    const a=document.createElement('a');a.href='/jakou-baterii-k-menici-2000w/';a.textContent='Výpočet pro 2000 W';
    const c=document.createElement('a');c.href='/jakou-baterii-k-menici-3000w/';c.textContent='Výpočet pro 3000 W';
    refs.append(a,document.createTextNode(' · '),c);
    section.append(heading,intro,buttons,status,refs);
    root.insertBefore(section,root.firstChild);
  }
  document.addEventListener('alpine:initialized',mount,{once:true});
  if(document.readyState!=='loading'&&window.Alpine)mount();
})();
