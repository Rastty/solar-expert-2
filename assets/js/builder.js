window.solarExpertBuilder=function(){return{
  step:1,scenario:'',season:'three',autonomy:1,manualPeak:null,catalog:[],bundleDeals:[],catalogReady:false,catalogLoading:true,catalogError:false,bundles:[],result:null,trackedSteps:[],inputError:'',previewMode:false,articleExample:false,articleExampleDefaults:null,articleExampleApplied:false,copyStatus:'',showCopyFallback:false,
  // Match the AC Battery Selector's documented model. These are sizing
  // assumptions, not certified efficiency or usable capacity of a SKU.
  batteryUsableFraction:0.80,inverterEfficiency:0.90,
  appliances:[
    {id:'fridge',name:'Lednice',watts:70,surge:700,hours:10,qty:1,selected:false},
    {id:'lights',name:'LED osvětlení',watts:40,surge:40,hours:5,qty:1,selected:false},
    {id:'laptop',name:'Notebook',watts:65,surge:90,hours:4,qty:1,selected:false},
    {id:'router',name:'Router / Wi-Fi',watts:12,surge:12,hours:24,qty:1,selected:false},
    {id:'tv',name:'Televize',watts:90,surge:120,hours:3,qty:1,selected:false},
    // Editorial example for continuous 230 V pond filtration. DC pumps use
    // different wiring and must not inherit this inverter-based calculation.
    {id:'pondpump',name:'Jezírková filtrace 230 V (model)',watts:35,surge:105,hours:24,qty:1,selected:false},
    {id:'pump',name:'Vodní čerpadlo',watts:800,surge:2200,hours:.5,qty:1,selected:false},
    {id:'kettle',name:'Rychlovarná konvice',watts:2000,surge:2000,hours:.12,qty:1,selected:false},
    {id:'tools',name:'Elektrické nářadí',watts:1000,surge:1800,hours:.5,qty:1,selected:false}
  ],
  async init(){this.catalogLoading=true;this.catalogError=false;this.applyInboundArticleExample();try{const r=await fetch(window.SolarExpertConfig.catalogUrl,{credentials:'same-origin'});if(!r.ok)throw new Error('catalog_http_'+r.status);const d=await r.json();this.catalog=d.products||[];this.bundleDeals=d.bundle_deals||[];this.catalogReady=true;if(this.result)this.refreshBundles();}catch(_){this.catalogReady=false;this.catalogError=true;}finally{this.catalogLoading=false;}},
  get selectedAppliances(){return this.appliances.filter(a=>a.selected);},
  get dailyWh(){return Math.round(this.selectedAppliances.reduce((s,a)=>s+a.watts*a.hours*a.qty,0));},
  get runningWatts(){return Math.round(this.selectedAppliances.reduce((s,a)=>s+a.watts*a.qty,0));},
  get estimatedPeak(){if(!this.selectedAppliances.length)return 0;const b=this.runningWatts;return Math.round(Math.max(b,...this.selectedAppliances.map(a=>b-a.watts*a.qty+Math.max(a.surge,a.watts)*a.qty)));},
  // A component-count-complete hybrid set is NOT purchase-ready without a
  // source-proven absolute PV Isc ceiling for the installed inverter revision.
  // The technical model may exist for diagnostics but never reaches offers,
  // checkout links, price comparisons or the default shopping list.
  get completeBundles(){return this.bundles.filter(b=>b&&b.complete&&
    (!b.integratedMppt||b.pvIscVerified===true));},
  get incompleteBundles(){return this.bundles.filter(b=>b&&(!b.complete||
    (b.integratedMppt&&b.pvIscVerified!==true)));},
  get primaryBundle(){
    const complete=this.completeBundles;
    const best=complete.find(b=>b.tier==='best')||null;
    // A quoted, reconciled bill should never be hidden behind an unpriced
    // Best Value technical fallback. This changes only the primary buyer
    // summary/checklist, not the engineering compatibility or tier ranking.
    if(best && this.purchaseBreakdownFor(best))return best;
    return complete.find(b=>this.purchaseBreakdownFor(b))||best||complete[0]||null;
  },
  pctReserve(actual,target){if(!Number(target))return 0;return Math.round(((Number(actual)-Number(target))/Number(target))*100);},
  comparisonFor(bundle){
    if(!bundle||!bundle.complete||!this.result)return null;
    const batteryQuantity=Number(bundle.batteryQuantity||1);
    const batteryKwh=Number(bundle.batteryBank?.totalEnergyWh||((bundle.battery?.energy_wh||0)*batteryQuantity))/1000;
    const inverterW=Number(bundle.inverter?.continuous_w||0);
    const surgeW=Number(bundle.inverter?.peak_w||0);
    const panelWp=Number(bundle.panel?.totalWp||0);
    const reasons=[
      'Baterie: '+batteryQuantity+'× '+bundle.battery?.name+' = '+batteryKwh.toFixed(2)+' kWh ('+this.pctReserve(batteryKwh,this.result.batteryKwh)+' % proti cíli)',
      'Měnič: '+inverterW+' W trvale ('+this.pctReserve(inverterW,this.result.inverterW)+' % rezerva)',
      'Špička: '+surgeW+' W ('+this.pctReserve(surgeW,this.result.peak)+' % rezerva)',
      'FV pole: '+panelWp+' Wp ('+this.pctReserve(panelWp,this.result.panelWp)+' % proti cíli)',
      bundle.integratedMppt?'MPPT je ověřený jako součást měniče':'Samostatný MPPT prošel výkonovým i napěťovým oknem'
    ];
    return {batteryKwh,batteryQuantity,inverterW,surgeW,panelWp,reasons};
  },
  // A retailer set already contains ONE battery and ONE inverter.
  // Use the same component counts for the shopping list and visible CTA
  // groups, so readers never get told to buy those components twice.
  purchaseQuantitiesFor(bundle){
    const count=Number(bundle?.batteryQuantity||1);
    if(!bundle||!bundle.complete||!Number.isSafeInteger(count)||count<1){
      return {set:0,battery:0,inverter:0};
    }
    const usesSet=Boolean(bundle.bundleDeal);
    return {set:usesSet?1:0,battery:count-(usesSet?1:0),inverter:usesSet?0:1};
  },
  purchaseBreakdownFor(bundle){
    if(bundle?.integratedMppt&&bundle.pvIscVerified!==true)return null;
    if(!bundle||!bundle.complete||!bundle.priceComplete||
       !Number.isFinite(Number(bundle.totalPrice))||Number(bundle.totalPrice)<=0)return null;
    const matcher=window.SolarExpertProductMatcher;
    if(!matcher)return null;

    const rows=[];
    const add=(label,name,quantity,unitPrice)=>{
      const qty=Number(quantity),price=Number(unitPrice);
      if(!Number.isInteger(qty)||qty<1||!Number.isFinite(price)||price<=0||
         price>=Number.MAX_SAFE_INTEGER)return false;
      rows.push({label,name:String(name||label),quantity:qty,unitPrice:price,subtotal:qty*price});
      return true;
    };

    const quantities=this.purchaseQuantitiesFor(bundle);
    if(bundle.bundleDeal){
      const deal=bundle.bundleDeal;
      if(!add('Set baterie + měnič',deal.label||'Baterie + měnič',quantities.set,deal.price_czk))return null;
      if(quantities.battery>0&&!add('Baterie navíc',bundle.battery?.name,quantities.battery,matcher.effectivePrice(bundle.battery)))return null;
    }else{
      if(!add('Baterie',bundle.battery?.name,quantities.battery,matcher.effectivePrice(bundle.battery)))return null;
      if(!add('Měnič',bundle.inverter?.name,quantities.inverter,matcher.effectivePrice(bundle.inverter)))return null;
    }
    if(!add('Solární panely',bundle.panel?.product?.name,bundle.panel?.count,matcher.effectivePrice(bundle.panel?.product)))return null;
    if(!bundle.integratedMppt&&
       !add('MPPT regulátor',bundle.mppt?.name,1,matcher.effectivePrice(bundle.mppt)))return null;

    const subtotal=rows.reduce((sum,item)=>sum+item.subtotal,0);
    // Refuse a misleading breakdown if an upstream bundle rule has changed:
    // the same price must agree with the technical composer's displayed total.
    if(!Number.isFinite(subtotal)||Math.abs(subtotal-Number(bundle.totalPrice))>0.01)return null;
    return {rows,total:subtotal};
  },
  get primaryShoppingList(){return this.purchaseBreakdownFor(this.primaryBundle);},
  // Put a real merchant destination beside each priced shopping-list line.
  // Only bind a link when that EXACT source-backed unit price is in stock and
  // the shop destination is actionable; never silently switch seller/price.
  get primaryPurchaseRows(){
    const bill=this.primaryShoppingList;
    const bundle=this.primaryBundle;
    const affiliate=window.SolarExpertAffiliate;
    const matcher=window.SolarExpertProductMatcher;
    if(!bill||!bundle)return [];
    const components={
      'Baterie':{product:bundle.battery,placement:'builder-primary-battery'},
      'Baterie navíc':{product:bundle.battery,placement:'builder-primary-extra-battery'},
      'Měnič':{product:bundle.inverter,placement:'builder-primary-inverter'},
      'Solární panely':{product:bundle.panel?.product,placement:'builder-primary-panel'},
      'MPPT regulátor':{product:bundle.mppt,placement:'builder-primary-mppt'},
      'Set baterie + měnič':{deal:bundle.bundleDeal,placement:'builder-primary-set'}
    };
    return bill.rows.map(row=>{
      const component=components[row.label]||{};
      const offer=null;
      if(!affiliate||!matcher||(!component.product&&!component.deal))return {...row,...component,offer};
      const candidates=component.deal
        ? affiliate.bundleDealOffers(component.deal)
        : affiliate.offers(component.product);
      const exact=candidates.find(o=>o?.availability==='in_stock' &&
        Number(o.price_czk)===Number(row.unitPrice) &&
        matcher.hasSellerSource(o.raw) && affiliate.isActionableMerchantHref(o.href))||null;
      return {...row,...component,offer:exact};
    });
  },
  // A copyable bill is a set of actual merchant product destinations, NOT a
  // prefilled basket. Fail closed if even one quoted line lacks its exact
  // seller/source-backed, in-stock destination; never share a partial order.
  get canCopyPrimaryPurchaseList(){
    const rows=this.primaryPurchaseRows;
    const affiliate=window.SolarExpertAffiliate;
    return Boolean(this.primaryShoppingList && affiliate && rows.length &&
      rows.every(row=>row.offer && affiliate.isActionableMerchantHref(row.offer.href)));
  },
  get primaryPurchaseText(){
    if(!this.canCopyPrimaryPurchaseList)return '';
    const bill=this.primaryShoppingList;
    const rows=this.primaryPurchaseRows;
    const lines=['Solar Expert – nákupní seznam hlavních komponent',
      'Varianta: '+(this.primaryBundle?.label||'doporučená sestava'),''];
    for(const row of rows){
      lines.push(row.quantity+'× '+row.name+' ('+row.label+')');
      lines.push('Orientačně '+row.subtotal.toLocaleString('cs-CZ')+' Kč celkem, '+
        row.unitPrice.toLocaleString('cs-CZ')+' Kč/ks · '+(row.offer.merchant?.label||row.offer.merchantId));
      lines.push(row.offer.href,'');
    }
    lines.push('Součet hlavních komponent: '+bill.total.toLocaleString('cs-CZ')+' Kč','',
      'Každou položku objednejte zvlášť a nastavte uvedený počet kusů.','Cenu, sklad i dostupný počet znovu ověřte přímo u prodejce.',
      'Cena nezahrnuje kabely, jištění, konstrukci, montáž ani revizi.',
      'Návrh je orientační; kompatibilitu a elektrickou bezpečnost ověřte před nákupem.',
      'Některé odkazy mohou být partnerské (affiliate).');
    return lines.join('\n');
  },
  async copyPrimaryPurchaseList(){
    const content=this.primaryPurchaseText;
    if(!content){this.copyStatus='Nákupní seznam zatím nemá odkazy na všechny ověřené položky.';return false;}
    try{
      if(typeof navigator==='undefined'||!navigator.clipboard?.writeText)throw new Error('clipboard_unavailable');
      await navigator.clipboard.writeText(content);
      this.showCopyFallback=false;
      this.copyStatus='Nákupní seznam s počty kusů a odkazy byl zkopírován.';
      return true;
    }catch(_){
      this.showCopyFallback=true;
      this.copyStatus='Automatické kopírování se nepovedlo. Označte a zkopírujte text níže.';
      return false;
    }
  },
  // Lower checkout friction only when the SAME verified shop has every
  // distinct component in stock. This is a list of individual product
  // destinations, NOT a shared cart, an affiliate redirect or a bundled SKU.
  singleShopFor(bundle){
    const bill=this.purchaseBreakdownFor(bundle);
    const affiliate=window.SolarExpertAffiliate;
    const matcher=window.SolarExpertProductMatcher;
    if(!bill||!affiliate||!matcher||bundle.bundleDeal)return null;
    const quantities=this.purchaseQuantitiesFor(bundle);
    const components=[
      {label:'Baterie',product:bundle.battery,quantity:quantities.battery},
      {label:'Měnič',product:bundle.inverter,quantity:quantities.inverter},
      {label:'Solární panely',product:bundle.panel?.product,quantity:bundle.panel?.count},
      ...(!bundle.integratedMppt?[{label:'MPPT regulátor',product:bundle.mppt,quantity:1}]:[])
    ];
    if(components.some(row=>!row.product||!Number.isSafeInteger(Number(row.quantity))||Number(row.quantity)<1))return null;
    const verified=components.map(row=>({
      ...row,
      offers:affiliate.offers(row.product).filter(o=>o&&o.availability==='in_stock'&&
        Number.isFinite(Number(o.price_czk))&&Number(o.price_czk)>0&&
        matcher.hasSellerSource(o.raw)&&affiliate.isActionableMerchantHref(o.href))
    }));
    const merchantIds=[...new Set(verified.flatMap(row=>row.offers.map(o=>o.merchantId)))];
    const candidates=[];
    for(const merchantId of merchantIds){
      const rows=[];
      for(const row of verified){
        const offer=row.offers.find(o=>o.merchantId===merchantId);
        if(!offer){rows.length=0;break;}
        rows.push({label:row.label,product:row.product,quantity:Number(row.quantity),offer,
          subtotal:Number(row.quantity)*Number(offer.price_czk)});
      }
      if(rows.length!==components.length)continue;
      const total=rows.reduce((sum,row)=>sum+row.subtotal,0);
      if(!Number.isFinite(total)||total<=0)continue;
      candidates.push({merchantId,merchantLabel:rows[0].offer.merchant?.label||merchantId,
        total,delta:Math.round(total-bill.total),rows});
    }
    // If a single shop already offers the exact lowest per-item total, the
    // main price is itself the simpler option; don't add duplicate CTAs.
    if(candidates.some(row=>Math.abs(row.total-bill.total)<=0.01))return null;
    candidates.sort((a,b)=>a.total-b.total||a.merchantId.localeCompare(b.merchantId));
    const best=candidates[0];
    // Never promote a costly convenience variant. At most 3% or 1000 CZK
    // above the reproducible lowest mixed-merchant sum, whichever is less.
    const maxExtra=Math.min(1000,Math.round(bill.total*.03));
    return best&&best.delta>0&&best.delta<=maxExtra?best:null;
  },
  get primarySingleShop(){return this.singleShopFor(this.primaryBundle);},
  // Explain a genuine capacity shortfall without offering an undersized
  // battery, treating an on-request SKU as stocked, or inventing a bank.
  // The same documented parallel-unit ceilings drive the composer.
  get batteryCapacityGap(){
    const matcher=window.SolarExpertProductMatcher;
    const requiredWh=Math.round(Number(this.result?.batteryKwh)*1000);
    const voltage=Number(this.result?.voltage);
    if(!this.catalogReady||!this.result||this.completeBundles.length||!matcher||
       !Number.isFinite(requiredWh)||requiredWh<=0||!Number.isFinite(voltage)||voltage<=0)return null;
    const available=this.catalog.filter(p=>p&&p.type==='battery'&&
      Number(p.system_voltage_class)===voltage&&Number(p.energy_wh)>0&&
      Number(p.max_discharge_a)>0&&matcher.availabilityRank(p)===2);
    if(!available.length)return null;
    const maxEnergyWh=Math.max(...available.map(p=>{
      const documented=Number(p.parallel_max_units||1);
      const units=Number.isSafeInteger(documented)&&documented>0?documented:1;
      return Number(p.energy_wh)*units;
    }));
    if(!Number.isFinite(maxEnergyWh)||maxEnergyWh>=requiredWh)return null;
    return {voltage,requiredKwh:requiredWh/1000,availableKwh:maxEnergyWh/1000,
      missingWh:requiredWh-maxEnergyWh};
  },
  checklistFor(bundle){
    if(!bundle||!bundle.complete)return [];
    const rows=[
      {group:'included',status:'included',label:'Solární panely',note:bundle.panel?.count+'× '+bundle.panel?.product?.name},
      {group:'included',status:'included',label:'Baterie',note:(bundle.batteryQuantity||1)+'× '+bundle.battery?.name},
      {group:'included',status:'included',label:'Měnič',note:bundle.inverter?.name},
      {group:'included',status:'included',label:'MPPT regulátor',note:bundle.integratedMppt?'integrovaný v měniči':bundle.mppt?.name},
      {group:'extra',status:'size',label:'DC jištění baterie + odpojovač',note:'Dimenzovat podle proudu měniče, kabelu a BMS.'},
      {group:'extra',status:'size',label:'Kabely, oka a konektory',note:'Průřez a délku zvolit podle proudu a úbytku napětí.'},
      {group:'extra',status:'site',label:'Konstrukce pro panely',note:'Podle střechy, zemní konstrukce nebo jiného umístění.'},
      {group:'extra',status:'site',label:'PV/DC ochrany a přepěťová ochrana',note:'Rozsah závisí na zapojení, délce vedení a místě instalace.'},
      {group:'extra',status:'site',label:'Uzemnění a pospojování',note:'Ověřit podle konkrétní instalace a použitých komponent.'},
      {group:'extra',status:'verify',label:'230V zapojení a revize',note:'Pevnou AC instalaci musí posoudit a provést odpovídající odborník.'}
    ];
    if(Number(bundle.batteryQuantity||1)>1){
      rows.push({group:'extra',status:'verify',label:'Paralelní bateriový bank',note:'Ověřit shodný model a stav baterií, symetrickou kabeláž / sběrnici, jištění každé větve a nastavení master/slave podle výrobce.'});
    }
    if(Array.isArray(bundle.battery?.communications)&&bundle.battery.communications.length){
      rows.push({group:'extra',status:'verify',label:'BMS komunikační kabel / nastavení',note:'Ověřit podporovaný protokol mezi baterií a měničem.'});
    }
    return rows;
  },
  toggle(id){const a=this.appliances.find(x=>x.id===id);if(a)a.selected=!a.selected;},
  trackStep(status){
    if(!status||this.trackedSteps.includes(status))return;
    this.trackedSteps.push(status);
    if(Array.isArray(window.dataLayer))window.dataLayer.push({event:'builder_step',status,scenario:this.scenario});
  },
  validateSelections(){
    if(!this.selectedAppliances.length)return 'Vyberte alespoň jeden spotřebič.';
    for(const a of this.selectedAppliances){
      const hours=Number(a.hours),qty=Number(a.qty),watts=Number(a.watts);
      if(!Number.isInteger(watts)||watts<1||watts>10000){
        return a.name+': zadejte příkon od 1 do 10 000 W. U lednice zkontrolujte cyklování kompresoru; nejde o trvalý odběr 24 hodin.';
      }
      if(!Number.isFinite(hours)||hours<=0||hours>24){
        return a.name+': zadejte dobu provozu větší než 0 a nejvýše 24 hodin denně. Pokud spotřebič nepoužíváte, odškrtněte jej.';
      }
      if(!Number.isInteger(qty)||qty<1||qty>10){
        return a.name+': počet musí být celé číslo od 1 do 10.';
      }
    }
    if(!Number.isFinite(this.dailyWh)||this.dailyWh<=0){
      return 'Denní spotřeba musí být kladné konečné číslo.';
    }
    return '';
  },
  advanceToUsage(){
    this.inputError=this.validateSelections();
    if(this.inputError)return;
    // The article link merely prefilled the second step. Count step_2
    // only after this explicit continue click, not on page load.
    if(this.articleExample)this.trackStep('step_2');
    this.step=3;
    this.trackStep('step_3');
  },
  selectPresetAppliances(type){
    this.appliances.forEach(a=>a.selected=false);
    const ids=type==='chata'?['fridge','lights','laptop','router']:type==='offgrid'?['fridge','lights','laptop','router','tv']:type==='pond'?['pondpump']:['fridge','lights','router'];
    ids.forEach(id=>{const a=this.appliances.find(x=>x.id===id);if(a)a.selected=true;});
    this.scenario=type;
  },
  // One editor-approved token from the fridge buyer guide. No URL numbers
  // are ever interpreted as power, hours, prices or a merchant preference.
  // A landing page view is NOT a user activation or completed Builder run.
  applyInboundArticleExample(){
    if(this.articleExampleApplied)return false;
    this.articleExampleApplied=true;
    const params=new URLSearchParams(window.location?.search || '');
    if(params.get('scenario')!=='fridge230')return false;
    this.selectPresetAppliances('chata');
    const models=[['fridge',65,10],['lights',20,5],['laptop',50,2]];
    this.articleExampleDefaults=models.map(([id])=>{
      const a=this.appliances.find(x=>x.id===id);
      return {id,watts:a.watts,hours:a.hours,qty:a.qty};
    });
    this.appliances.forEach(a=>a.selected=models.some(([id])=>id===a.id));
    for(const [id,watts,hours] of models){
      const a=this.appliances.find(x=>x.id===id);
      a.watts=watts;
      a.hours=hours;
      a.qty=1;
    }
    this.articleExample=true;
    this.step=2;
    this.season='three';
    this.autonomy=1;
    this.manualPeak=null;
    this.previewMode=false;
    return true;
  },
  restoreArticleExample(){
    if(this.articleExample&&this.articleExampleDefaults){
      for(const row of this.articleExampleDefaults){
        const a=this.appliances.find(x=>x.id===row.id);
        if(a){a.watts=row.watts;a.hours=row.hours;a.qty=row.qty;}
      }
    }
    this.articleExample=false;
    this.articleExampleDefaults=null;
  },
  preset(type){
    this.inputError='';
    this.copyStatus='';this.showCopyFallback=false;
    this.previewMode=false;
    this.restoreArticleExample();
    this.selectPresetAppliances(type);
    this.step=2;
    this.trackStep('step_2');
  },
  quickPreview(){
    // A complete example, not a user-tailored sizing result.
    // Do not fabricate step_2 / step_3 progress or emit builder_complete.
    this.inputError='';
    this.copyStatus='';this.showCopyFallback=false;
    this.restoreArticleExample();
    this.selectPresetAppliances('chata');
    this.season='three';
    this.autonomy=1;
    this.manualPeak=null;
    this.calc(true);
  },
  editPreview(){
    this.previewMode=false;
    this.step=2;
    this.trackStep('step_2');
  },
  chooseSystemVoltage(inverterW,peak){
    if(inverterW<=1000 && peak<=2000) return 12;
    if(inverterW<=2500 && peak<=4000) return 24;
    return 48;
  },
  suggestedMpptA(panelWp,voltage){
    return Math.max(10,Math.ceil(((panelWp/voltage)*1.25)/5)*5);
  },
  hasReconciledBuyerOffer(bundles){
    // A quoted integrated hybrid without the absolute PV Isc evidence does
    // not qualify, even if someone later mistakenly sets priceComplete.
    return bundles.some(b=>b&&b.complete&&this.purchaseBreakdownFor(b));
  },
  trackBuyerOfferGap(){
    // A complete technical calculation without a complete, source-priced,
    // individually actionable shopping list is a real buyer-journey gap.
    // An unpublished example preview or an unloaded catalog is not one.
    if(!this.catalogReady||!this.result||!Array.isArray(window.dataLayer)||
       !window.SolarExpertAffiliate||!window.SolarExpertProductMatcher)return;
    const status=!this.completeBundles.length?'no_complete_bundle':
      (!this.canCopyPrimaryPurchaseList?'no_complete_shopping_list':'');
    if(!status)return;
    if(!this.offerGapsSeen)this.offerGapsSeen=new Set();
    if(this.offerGapsSeen.has(status))return;
    this.offerGapsSeen.add(status);
    window.dataLayer.push({event:'buyer_offer_gap',tool:'builder',status,matchCount:this.completeBundles.length});
  },
  refreshBundles(){
    if(!this.result)return;
    const composer=window.SolarExpertBundleComposer;
    const originalVoltage=Number(this.result.nominalVoltage||this.result.voltage);
    // Rebuild from the engineering-first voltage every time fresh catalog
    // evidence arrives. Never let an earlier alternative become the new
    // hidden minimum when the nominal variant later gets a valid quote.
    const nominal={...this.result,nominalVoltage:originalVoltage,voltage:originalVoltage,
      mpptA:this.suggestedMpptA(this.result.panelWp,originalVoltage),voltageAlternativeFrom:null};
    let picked=nominal;
    let bundles=composer.compose(this.catalog,nominal,this.bundleDeals);
    // No new SKU, fake battery parallelism, stale quote, price guess or
    // relaxed electrical gates. Try an existing higher-voltage whole system
    // only if the default is not purchase-actionable, and only with a
    // reconciled quoted bill for the same requested loads and autonomy.
    if(this.catalog.length && !this.hasReconciledBuyerOffer(bundles)){
      for(const voltage of [24,48]){
        if(voltage<=originalVoltage)continue;
        const alternative={...nominal,voltage,
          mpptA:this.suggestedMpptA(nominal.panelWp,voltage),
          voltageAlternativeFrom:originalVoltage};
        const alternateBundles=composer.compose(this.catalog,alternative,this.bundleDeals);
        if(!this.hasReconciledBuyerOffer(alternateBundles))continue;
        picked=alternative;
        bundles=alternateBundles;
        break;
      }
    }
    this.result=picked;
    this.bundles=bundles;
  },
  calc(previewOnly=false){
    this.inputError=this.validateSelections();
    if(this.inputError){this.step=2;return;}
    if(this.manualPeak!==null&&this.manualPeak!==''&&
       (!Number.isFinite(Number(this.manualPeak))||Number(this.manualPeak)<0)){
      this.inputError='Známé maximum musí být kladné číslo nebo nula. Jinak pole nechte prázdné.';
      return;
    }
    if(!['summer','three','year'].includes(this.season)||
       ![0.5,1,2].includes(Number(this.autonomy))){
      this.inputError='Zvolte platnou sezónu a rezervu baterie.';
      return;
    }
    this.inputError='';
    this.copyStatus='';this.showCopyFallback=false;
    const energyWh=this.dailyWh;
    const runningWatts=this.runningWatts;
    const psh=this.season==='summer'?4.2:(this.season==='three'?2.8:1.6);
    const panelWp=Math.ceil((energyWh/(psh*.76))/50)*50;
    const peak=Math.max(Number(this.manualPeak)||0,this.estimatedPeak);
    const inverterW=Math.max(300,Math.ceil((runningWatts*1.2)/100)*100);
    const voltage=this.chooseSystemVoltage(inverterW,peak);
    // The appliances are modeled as 230V AC loads. Allow for BOTH battery
    // usable fraction and inverter losses; do not apply either factor twice.
    const batteryKwh=Math.ceil((energyWh*this.autonomy/
      (this.batteryUsableFraction*this.inverterEfficiency)/1000)*10)/10;
    // BMS discharge is DC-side. Keep inverterW as AC output for inverter
    // fit, display and analytics; the battery bank needs the higher DC draw.
    const batteryDcW=Math.ceil(inverterW/this.inverterEfficiency);
    const mpptA=this.suggestedMpptA(panelWp,voltage);
    const riskFlags=[];
    if(this.season==='year')riskFlags.push('Celoroční ostrovní provoz vyžaduje lokalitní PV výpočet a obvykle větší zimní rezervu.');
    if(peak>inverterW*1.8)riskFlags.push('Výrazná rozběhová špička: ověřte surge dobu konkrétního měniče a spotřebiče.');
    if(this.selectedAppliances.some(a=>a.id==='pump'||a.id==='pondpump'))riskFlags.push('U čerpadla ověřte skutečný rozběhový proud podle konkrétního modelu.');
    if(this.selectedAppliances.some(a=>a.id==='pondpump'))riskFlags.push('Model jezírkové filtrace předpokládá čerpadlo 230 V s měničem. Pro 12/24 V DC čerpadlo je nutný samostatný návrh zapojení a ochranných prvků. Elektrická zařízení u vody musí posoudit kvalifikovaný odborník.');
    // mpptA is a +25% planning suggestion, not a verified manufacturer PV
    // input limit or an explicit minimum battery charging current.
    this.result={energyWh,energyKwh:Math.round(energyWh/10)/100,runningWatts,peak,panelWp,voltage,nominalVoltage:voltage,batteryKwh,batteryDcW,inverterW,mpptA,mpptAIsAdvisory:true,psh,riskFlags};
    this.refreshBundles();
    this.step=4;
    this.previewMode=Boolean(previewOnly);
    if(this.previewMode){
      this.trackStep('quick_preview');
    }else{
      this.trackStep('result');
      if(Array.isArray(window.dataLayer))window.dataLayer.push({event:'solar_builder_complete',scenario:this.scenario,voltage:this.result.voltage,panelWp,batteryKwh,inverterW,peak});
      this.trackBuyerOfferGap();
    }
  },
  reset(){this.restoreArticleExample();this.step=1;this.inputError='';this.copyStatus='';this.showCopyFallback=false;this.previewMode=false;this.result=null;this.bundles=[];this.manualPeak=null;this.appliances.forEach(a=>a.selected=false);}
};};
