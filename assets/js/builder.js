window.solarExpertBuilder=function(){return{
  step:1,scenario:'',season:'three',autonomy:1,manualPeak:null,catalog:[],bundleDeals:[],catalogReady:false,catalogLoading:true,catalogError:false,bundles:[],result:null,trackedSteps:[],inputError:'',previewMode:false,
  appliances:[
    {id:'fridge',name:'Lednice',watts:70,surge:700,hours:10,qty:1,selected:false},
    {id:'lights',name:'LED osvětlení',watts:40,surge:40,hours:5,qty:1,selected:false},
    {id:'laptop',name:'Notebook',watts:65,surge:90,hours:4,qty:1,selected:false},
    {id:'router',name:'Router / Wi-Fi',watts:12,surge:12,hours:24,qty:1,selected:false},
    {id:'tv',name:'Televize',watts:90,surge:120,hours:3,qty:1,selected:false},
    {id:'pump',name:'Vodní čerpadlo',watts:800,surge:2200,hours:.5,qty:1,selected:false},
    {id:'kettle',name:'Rychlovarná konvice',watts:2000,surge:2000,hours:.12,qty:1,selected:false},
    {id:'tools',name:'Elektrické nářadí',watts:1000,surge:1800,hours:.5,qty:1,selected:false}
  ],
  async init(){this.catalogLoading=true;this.catalogError=false;try{const r=await fetch(window.SolarExpertConfig.catalogUrl,{credentials:'same-origin'});if(!r.ok)throw new Error('catalog_http_'+r.status);const d=await r.json();this.catalog=d.products||[];this.bundleDeals=d.bundle_deals||[];this.catalogReady=true;if(this.result)this.bundles=window.SolarExpertBundleComposer.compose(this.catalog,this.result,this.bundleDeals);}catch(_){this.catalogReady=false;this.catalogError=true;}finally{this.catalogLoading=false;}},
  get selectedAppliances(){return this.appliances.filter(a=>a.selected);},
  get dailyWh(){return Math.round(this.selectedAppliances.reduce((s,a)=>s+a.watts*a.hours*a.qty,0));},
  get runningWatts(){return Math.round(this.selectedAppliances.reduce((s,a)=>s+a.watts*a.qty,0));},
  get estimatedPeak(){if(!this.selectedAppliances.length)return 0;const b=this.runningWatts;return Math.round(Math.max(b,...this.selectedAppliances.map(a=>b-a.watts*a.qty+a.surge*a.qty)));},
  get completeBundles(){return this.bundles.filter(b=>b&&b.complete);},
  get incompleteBundles(){return this.bundles.filter(b=>b&&!b.complete);},
  get primaryBundle(){return this.completeBundles.find(b=>b.tier==='best')||this.completeBundles[0]||null;},
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
  purchaseBreakdownFor(bundle){
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

    const batteryCount=Number(bundle.batteryQuantity||1);
    if(bundle.bundleDeal){
      const deal=bundle.bundleDeal;
      if(!add('Set baterie + měnič',deal.label||'Baterie + měnič',1,deal.price_czk))return null;
      const extraCount=batteryCount-1;
      if(extraCount>0&&!add('Baterie navíc',bundle.battery?.name,extraCount,matcher.effectivePrice(bundle.battery)))return null;
    }else{
      if(!add('Baterie',bundle.battery?.name,batteryCount,matcher.effectivePrice(bundle.battery)))return null;
      if(!add('Měnič',bundle.inverter?.name,1,matcher.effectivePrice(bundle.inverter)))return null;
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
      const hours=Number(a.hours),qty=Number(a.qty);
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
    this.step=3;
    this.trackStep('step_3');
  },
  selectPresetAppliances(type){
    this.appliances.forEach(a=>a.selected=false);
    const ids=type==='chata'?['fridge','lights','laptop','router']:type==='offgrid'?['fridge','lights','laptop','router','tv']:['fridge','lights','router'];
    ids.forEach(id=>{const a=this.appliances.find(x=>x.id===id);if(a)a.selected=true;});
    this.scenario=type;
  },
  preset(type){
    this.inputError='';
    this.previewMode=false;
    this.selectPresetAppliances(type);
    this.step=2;
    this.trackStep('step_2');
  },
  quickPreview(){
    // A complete example, not a user-tailored sizing result.
    // Do not fabricate step_2 / step_3 progress or emit builder_complete.
    this.inputError='';
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
    const energyWh=this.dailyWh;
    const runningWatts=this.runningWatts;
    const psh=this.season==='summer'?4.2:(this.season==='three'?2.8:1.6);
    const panelWp=Math.ceil((energyWh/(psh*.76))/50)*50;
    const peak=Math.max(Number(this.manualPeak)||0,this.estimatedPeak);
    const inverterW=Math.max(300,Math.ceil((runningWatts*1.2)/100)*100);
    const voltage=this.chooseSystemVoltage(inverterW,peak);
    const batteryKwh=Math.ceil((((energyWh*this.autonomy)/.85)/1000)*10)/10;
    const mpptA=Math.max(10,Math.ceil(((panelWp/voltage)*1.25)/5)*5);
    const riskFlags=[];
    if(this.season==='year')riskFlags.push('Celoroční ostrovní provoz vyžaduje lokalitní PV výpočet a obvykle větší zimní rezervu.');
    if(peak>inverterW*1.8)riskFlags.push('Výrazná rozběhová špička: ověřte surge dobu konkrétního měniče a spotřebiče.');
    if(this.selectedAppliances.some(a=>a.id==='pump'))riskFlags.push('U čerpadla ověřte skutečný rozběhový proud podle konkrétního modelu.');
    this.result={energyWh,energyKwh:Math.round(energyWh/10)/100,runningWatts,peak,panelWp,voltage,batteryKwh,inverterW,mpptA,psh,riskFlags};
    this.bundles=window.SolarExpertBundleComposer.compose(this.catalog,this.result,this.bundleDeals);
    this.step=4;
    this.previewMode=Boolean(previewOnly);
    if(this.previewMode){
      this.trackStep('quick_preview');
    }else{
      this.trackStep('result');
      if(Array.isArray(window.dataLayer))window.dataLayer.push({event:'solar_builder_complete',scenario:this.scenario,voltage,panelWp,batteryKwh,inverterW,peak});
    }
  },
  reset(){this.step=1;this.inputError='';this.previewMode=false;this.result=null;this.bundles=[];this.manualPeak=null;this.appliances.forEach(a=>a.selected=false);}
};};
