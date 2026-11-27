/* Source-backed alternatives for the exact 24V high-power model only.
 * Never add to native matches, change electrical engine or invent quotes.
 */
(function(){
  'use strict';
  const epever='https://www.vselektro.eu/lifepo4-baterie-24v-100ah-epever-lfp2-56kwh25-6v-p65l2ev50/';
  const manual='https://www.epever.com/wp-content/uploads/2024/10/LFP2.56KWH25.6V-P65L2EV50-Manual-EN-V1.1.pdf';
  const pq='https://www.ipowerqueen.de/en/products/power-queen-24v-200ah-lifepo4-solar-battery-with-200a-bms';
  // 20.8V minimum, 90% assumed inverter efficiency, 20% current reserve.
  function bank(watts){return Math.ceil(watts/(20.8*0.9)*1.2/50);}
  function link(label,url){const a=document.createElement('a');a.textContent=label;a.href=url;a.rel='noopener noreferrer';return a;}
  function mount(){
    const root=document.querySelector('[x-data="solarExpertBatterySelector()"]');
    const a=window.Alpine;
    if(!root||!a||typeof a.$data!=='function'||typeof a.effect!=='function')return;
    if(root.querySelector('[data-se-24v-high-current="v1"]'))return;
    const s=a.$data(root);
    if(!s||!Array.isArray(s.matches))return;
    const el=document.createElement('aside');el.className='se-note';
    el.setAttribute('data-se-24v-high-current','v1');el.hidden=true;
    const title=document.createElement('strong');title.textContent='24 V: další možnosti k individuálnímu ověření';
    const intro=document.createElement('p');intro.textContent='V našem katalogu není pro tento model výsledek. Níže jsou možnosti mimo automatický výběr, nikoli schválené sestavy. Nejsou ověřeny aktuální cena, sklad ani kompatibilita konkrétního měniče.';
    const one=document.createElement('p');one.textContent='Power Queen 24 V / 200 Ah (5,12 kWh): výrobce uvádí trvalý výstup 5 120 W a BMS 200 A. Před nákupem potvrďte přesnou verzi, trvalý proud při minimálním napětí, teplotě a rozběhu. Není určena k motorovým startům; zátěž potvrďte s výrobcem.';
    const pl=link('Ověřit model přímo u Power Queen →',pq);
    const two=document.createElement('p');two.setAttribute('data-se-epever-bank','v1');
    const how=document.createElement('p');how.textContent='EPEVER LFP2.56KWH25.6V-P65L2EV50: manuál V1.1 uvádí 50 A trvale, 150 A jen 30 min, max. 4 shodné moduly paralelně. Výpočet počítá při 20,8 V, účinnosti 90 % a 20% proudové rezervě. Vyšší kapacita nemusí být ekonomická. Skutečné sdílení proudu, jištění, kabely, nabíjení a rozběh musí potvrdit odborník. Nejde o návod k zapojení.';
    const em=link('Technický manuál výrobce V1.1',manual);
    const offer=link('Ověřit cenu a počet kusů u VSelektro →',epever);
    const disclaimer=document.createElement('p');disclaimer.className='se-muted';
    disclaimer.textContent='Přímý odkaz na prodejce. Cenu, sklad, dopravu a podmínky ověřte před objednávkou.';
    // Only use the preconfigured existing approved eHub base if the adapter
    // returns the exact merchant product destination. Never guess identifiers.
    try{
      const aff=window.SolarExpertAffiliate;
      const href=aff?.merchantDeepLink?.('vselektro-eu',epever);
      if(href){
        const u=new URL(href);
        if(u.protocol==='https:'&&u.hostname==='ehub.cz'&&!u.username&&!u.password&&!u.port&&!u.hash&&
           u.pathname==='/system/scripts/click.php'&&u.searchParams.getAll('a_aid').length===1&&u.searchParams.getAll('a_bid').length===1&&
           u.searchParams.get('a_aid')&&u.searchParams.get('a_bid')&&u.searchParams.getAll('desturl').length===1&&u.searchParams.get('desturl')===epever){
          offer.href=u.href;offer.rel='sponsored nofollow noopener noreferrer';
          disclaimer.textContent='Odkaz VSelektro je partnerský; můžeme získat provizi. Cenu, počet kusů a podmínky ověřte u prodejce.';
        }
      }
    }catch(_){}
    el.append(title,intro,one,pl,two,how,em,document.createElement('br'),offer,disclaimer);
    root.append(el);
    a.effect(()=>{
      const w=Number(s.inverterW);
      const visible=Number(s.voltage)===24&&[2000,3000].includes(w)&&Number(s.dailyKwh)===w/1000&&Number(s.autonomy)===1&&
        (!('supplyMode' in s)||s.supplyMode==='ac')&&!s.catalogLoading&&!s.catalogError&&Array.isArray(s.catalog)&&s.catalog.length>0&&Array.isArray(s.matches)&&s.matches.length===0;
      el.hidden=!visible;
      if(visible){const n=bank(w);two.textContent='EPEVER: orientačně '+n+' shodné 100Ah moduly (celkem '+(n*2.56).toLocaleString('cs-CZ',{maximumFractionDigits:2})+' kWh nominálně).';}
    });
  }
  document.addEventListener('alpine:initialized',mount,{once:true});
  if(document.readyState!=='loading'&&window.Alpine)mount();
})();
