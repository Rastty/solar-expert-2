/* Exact 24V inverter gap: candidate only, never modifies catalog or ranking. */
(function(){
'use strict';
const merchant='https://www.vselektro.eu/menic-napeti-carspa-p3000-24v-230v-3000w-sinus-usb/';
const maker='https://carspa.cc/p3000-3000-watt-pure-sine-wave-car-power-inverter-with-usb-port/';
function exactAffiliate(href){
 try{const u=new URL(href);return u.protocol==='https:'&&u.hostname==='ehub.cz'&&!u.username&&!u.password&&!u.port&&!u.hash&&u.pathname==='/system/scripts/click.php'&&u.searchParams.getAll('a_aid').length===1&&u.searchParams.getAll('a_bid').length===1&&!!u.searchParams.get('a_aid')&&!!u.searchParams.get('a_bid')&&u.searchParams.getAll('desturl').length===1&&u.searchParams.get('desturl')===merchant;}catch(_){return false;}
}
function mount(){
 const root=document.querySelector('[x-data="solarExpertInverterSelector()"]'),a=window.Alpine;
 if(!root||!a||typeof a.$data!=='function'||typeof a.effect!=='function'||root.querySelector('[data-se-inverter-24v-candidate]'))return;
 const s=a.$data(root);if(!s||typeof s.run!=='function')return;
 const presetAnchor=Array.from(root.querySelectorAll('button')).find(b=>String(b.getAttribute('@click')).includes("applyExample('cottage')"));
 if(!presetAnchor)return;
 const b=document.createElement('button');b.type='button';b.className='se-btn';b.setAttribute('data-se-inverter-24v-example','v1');b.textContent='24 V · 2,5 kW / 3 kW →';
 presetAnchor.parentElement.append(b);
 b.addEventListener('click',e=>{if(!e.isTrusted||s.catalogLoading||s.catalogError||!s.catalog?.length)return;Object.assign(s,{voltage:24,continuousW:2500,peakW:3000});s.run(true);});
 const el=document.createElement('section');el.className='se-note';el.setAttribute('data-se-inverter-24v-candidate','v1');el.hidden=true;el.style.display='none';
 function add(tag,txt){const n=document.createElement(tag);n.textContent=txt;el.append(n);return n;}
 add('h3','24V měnič nad 2 kW: další model k prověření');
 add('p','CarSpa P3000U-24 (čistý sinus, 24 V DC / 230 V AC). Výrobce pro řadu P3000 uvádí 3 000 W jmenovitě a 6 000 W špičkově; prodejce uvádí stejné hodnoty pro tuto 24V variantu. Délka špičky a výkon při konkrétní teplotě nejsou ověřeny. Nejde o potvrzení kompatibility ani o doporučení pro trvalý provoz na hranici výkonu.');
 add('p','Před objednáním ověřte přesné provedení, dobu rozběhové špičky, teplotní omezení, povolené DC napětí a potřebnou baterii, jištění a kabeláž s odborníkem. U 3 kW je nominální proud při 24 V a 90% účinnosti orientačně 139 A; při poklesu napětí může být vyšší.');
 const link=document.createElement('a');link.textContent='Ověřit model, cenu a dostupnost u VSelektro →';link.href=merchant;link.target='_blank';link.rel='noopener noreferrer nofollow';link.className='se-btn';el.append(link);
 const note=add('p','Přímý odkaz na prodejce. Aktuální cena a skladovost nejsou ověřeny.');
 try{const h=window.SolarExpertAffiliate?.merchantDeepLink?.('vselektro-eu',merchant);if(h&&exactAffiliate(h)){link.href=h;link.rel='sponsored nofollow noopener noreferrer';note.textContent='Partnerský odkaz: můžeme získat provizi. Aktuální cena a skladovost nejsou ověřeny.';}}catch(_){}
 link.classList.add('se-offer');link.setAttribute('data-se-product-id','candidate-carspa-p3000u-24');link.setAttribute('data-se-merchant','vselektro-eu');link.setAttribute('data-se-placement','inverter-24v-candidate');
 function record(e){if(!e.isTrusted||e.defaultPrevented||el.hidden||((e.type==='auxclick')?e.button!==1:e.button!==0))return;const monetized=exactAffiliate(link.href);if(!monetized&&link.href!==merchant)return;try{window.SolarExpertAnalytics?.track?.('affiliate_click',{productId:'candidate-carspa-p3000u-24',merchant:'vselektro-eu',placement:'inverter-24v-candidate',monetized});}catch(_){}}
 link.addEventListener('click',record);link.addEventListener('auxclick',record);
 const refs=add('p','');const m=document.createElement('a');m.href=maker;m.textContent='Specifikace výrobce';m.rel='noopener';m.target='_blank';refs.append(m,document.createTextNode(' · '));const guide=document.createElement('a');guide.href='/jakou-baterii-k-menici-3000w/';guide.textContent='Jak dimenzovat baterii k 3 000 W';refs.append(guide);
 root.append(el);
 a.effect(()=>{const ready=!s.catalogLoading&&!s.catalogError&&Array.isArray(s.catalog)&&s.catalog.length>0;
 b.disabled=!ready;const w=Number(s.continuousW),p=Number(s.peakW);
 const show=ready&&s.inputValid&&Number(s.voltage)===24&&w>2000&&w<=3000&&p>=w&&p<=6000&&Array.isArray(s.matches)&&s.matches.length===0;
 el.hidden=!show;el.style.display=show?'':'none';
 });
}
document.addEventListener('alpine:initialized',mount,{once:true});if(document.readyState!=='loading'&&window.Alpine)mount();
})();
