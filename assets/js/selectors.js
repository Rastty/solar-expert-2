async function seCatalog(){const r=await fetch(window.SolarExpertConfig.catalogUrl,{credentials:'same-origin'});if(!r.ok)throw new Error('catalog_http_'+r.status);return(await r.json()).products||[];}

function seTrackSelectorOnce(ctx,selector,detail){
  if(!ctx || ctx.engagementTracked) return;
  ctx.engagementTracked=true;
  const payload={event:'selector_engaged',selector,matchCount:Array.isArray(ctx.matches)?ctx.matches.length:0,...detail};
  if(Array.isArray(window.dataLayer)) window.dataLayer.push(payload);
  if(typeof window.dispatchEvent==='function' && typeof CustomEvent!=='undefined'){
    window.dispatchEvent(new CustomEvent('solar-expert-selector-engaged',{detail:payload}));
  }
}

window.solarExpertBatterySelector=function(){return{
  voltage:24,dailyKwh:1.5,autonomy:1,inverterW:1200,supplyMode:'ac',catalog:[],matches:[],engagementTracked:false,catalogLoading:true,catalogError:false,pendingExample:false,articleExample:false,articleExampleKind:'',activeScenario:'',
  // AC: 80% usable LiFePO4 nominal energy and 90% inverter efficiency
  // for BOTH daily energy and continuous BMS current. DC: input energy
  // already includes DC-DC/PoE losses; do NOT impose a fictitious 230V
  // inverter inefficiency a second time. The hardware DC converter/PoE
  // matching, cable protection and low-temperature charge limits are
  // external safety checks, not automatically certified by this selector.
  usableFraction:0.80,inverterEfficiency:0.90,
  get inputValid(){
    return [12,24,48].includes(Number(this.voltage)) &&
      ['ac','dc'].includes(this.supplyMode) &&
      [this.dailyKwh,this.autonomy,this.inverterW].every(x=>Number.isFinite(Number(x))&&Number(x)>0);
  },
  get outputEfficiency(){return this.supplyMode==='dc'?1:this.inverterEfficiency;},
  get requiredBatteryKwh(){return Math.ceil(((Number(this.dailyKwh)*Number(this.autonomy))/(this.usableFraction*this.outputEfficiency))*10)/10;},
  get requiredBatteryDcW(){return Math.ceil(Number(this.inverterW)/this.outputEfficiency);},
  get requiredDischargeA(){return Math.max(1,Math.ceil(this.requiredBatteryDcW/Math.max(1,Number(this.voltage))));},
  // Only a bounded allow-list of three trusted editorial scenario tokens.
  // Numeric voltage, daily energy, battery limits and merchant values
  // in query parameters are never read. Page load is NOT engagement.
  editorialExamples:{
    panel400:{voltage:24,dailyKwh:0.7,autonomy:1,inverterW:800,supplyMode:'ac'},
    camera24h:{voltage:12,dailyKwh:0.461,autonomy:2,inverterW:20,supplyMode:'dc'},
    // Starlink Mini: illustrative 30W average × 24h = 720Wh;
    // +15% demand uncertainty allowance -> 828Wh/day INCLUDING modeled
    // DC power-path losses. 60W is a BMS peak-design screen, NOT an
    // independently verified constant consumption or device certificate.
    starlinkmini:{voltage:12,dailyKwh:0.828,autonomy:2,inverterW:60,supplyMode:'dc'}
  },
  applyArticleExampleFromUrl(){
    const search=window.location&&typeof window.location.search==='string'
      ?window.location.search:'';
    const scenario=new URLSearchParams(search).get('scenario');
    if(!Object.prototype.hasOwnProperty.call(this.editorialExamples,scenario))return;
    Object.assign(this,this.editorialExamples[scenario]);
    this.articleExample=true;
    this.articleExampleKind=scenario;
    this.activeScenario=scenario;
  },
  applyExample(kind){
    const examples={
      panel400:this.editorialExamples.panel400,
      cottage:{voltage:24,dailyKwh:1,autonomy:1,inverterW:1000,supplyMode:'ac'},
      backup:{voltage:48,dailyKwh:3,autonomy:1,inverterW:2000,supplyMode:'ac'},
      // Router 10W + IP camera 6W run 24h = 384Wh/day. The editorial
      // 20% DC/PoE supply-loss allowance yields 461Wh/day. 20W DC draw
      // is a conservative continuous illustrative, not a device certificate.
      camera24h:this.editorialExamples.camera24h,
      starlinkmini:this.editorialExamples.starlinkmini
    };
    const selection=examples[kind];
    if(!selection)return;
    Object.assign(this,selection);
    this.articleExample=false;
    this.articleExampleKind='';
    this.activeScenario=kind;
    if(this.catalogLoading||!this.catalog.length){this.pendingExample=true;return;}
    this.run(true);
  },
  async init(){
    this.applyArticleExampleFromUrl();
    this.catalogLoading=true;this.catalogError=false;
    try{this.catalog=await seCatalog();this.run(this.pendingExample);this.pendingExample=false;}
    catch(_){this.catalog=[];this.matches=[];this.catalogError=true;}
    finally{this.catalogLoading=false;}
  },
  run(track=true){
    if(!this.inputValid||!this.catalog.length){this.matches=[];return;}
    const batteryKwh=this.requiredBatteryKwh;
    // Both bank composer and single-product fallback expect sizing.inverterW
    // as the MINIMUM required battery DC discharge capability (despite
    // legacy property name). Keep identical electrical pass/fail filters.
    const dcW=this.requiredBatteryDcW;
    const s={voltage:Number(this.voltage),batteryKwh,inverterW:dcW};
    const batteries=this.catalog.filter(p=>p.type==='battery');
    this.matches=window.SolarExpertBundleComposer
      ? window.SolarExpertBundleComposer.batteryBankCandidatesAll(batteries,s).slice(0,5)
      : window.SolarExpertProductMatcher.rank(batteries,s).map(r=>({
          product:r.product,
          quantity:1,
          totalEnergyWh:Number(r.product.energy_wh||0),
          totalDischargeA:Number(r.product.max_discharge_a||0),
          dischargePowerW:Number(r.product.system_voltage_class||0)*Number(r.product.max_discharge_a||0),
          unitPrice:window.SolarExpertProductMatcher.effectivePrice(r.product),
          totalPrice:window.SolarExpertProductMatcher.effectivePrice(r.product)
        })).slice(0,5);
    if(track) seTrackSelectorOnce(this,'battery',{voltage:s.voltage,batteryKwh,inverterW:Number(this.inverterW),...(this.activeScenario?{scenario:this.activeScenario}:{})});
  }
};};

window.solarExpertMpptSelector=function(){return{
  voltage:24,panelUnitWp:190,panelVoc:25.5,panelVmp:21.8,panelIsc:9.17,seriesCount:2,parallelCount:2,coldFactor:1.12,catalog:[],matches:[],engagementTracked:false,catalogLoading:true,catalogError:false,pendingExample:false,articleExample:false,
  // Derived array power: changing topology cannot preserve a falsely low Wp total.
  get panelWp(){return Number(this.panelUnitWp)*Number(this.seriesCount)*Number(this.parallelCount);},
  get coldStringVoc(){return Number(this.panelVoc)*Number(this.seriesCount)*Number(this.coldFactor);},
  get stringVmp(){return Number(this.panelVmp)*Number(this.seriesCount);},
  get arrayIsc(){return Number(this.panelIsc)*Number(this.parallelCount);},
  get requiredChargeA(){const voltage=Math.max(1,Number(this.voltage));return Math.max(10,Math.ceil(((Number(this.panelWp)/voltage)*1.25)/5)*5);},
  get inputValid(){
    const numeric=[this.panelUnitWp,this.panelWp,this.panelVoc,this.panelVmp,this.panelIsc,this.seriesCount,this.parallelCount];
    return numeric.every(value=>Number.isFinite(Number(value))) &&
      [12,24,48].includes(Number(this.voltage)) &&
      Number(this.panelUnitWp)>0 && Number(this.panelUnitWp)<=15000 &&
      Number(this.panelWp)>0 && Number(this.panelWp)<=15000 &&
      Number(this.panelVoc)>0 && Number(this.panelVoc)<=600 &&
      Number(this.panelVmp)>0 && Number(this.panelVmp)<Number(this.panelVoc) &&
      Number(this.panelIsc)>0 && Number(this.panelIsc)<=250 &&
      Number.isInteger(Number(this.seriesCount)) && Number(this.seriesCount)>=1 && Number(this.seriesCount)<=20 &&
      Number.isInteger(Number(this.parallelCount)) && Number(this.parallelCount)>=1 && Number(this.parallelCount)<=20;
  },
  applyArticleExampleFromUrl(){
    // Immutable, illustrative 400 W / 24 V example ONLY; arbitrary URL
    // parameters may not change any electrical input or select a merchant.
    const search=window.location&&typeof window.location.search==='string'?window.location.search:'';
    if(new URLSearchParams(search).get('scenario')!=='mppt400')return;
    Object.assign(this,{voltage:24,panelUnitWp:400,panelVoc:49,panelVmp:40,panelIsc:11,seriesCount:1,parallelCount:1});
    this.articleExample=true;
  },
  applyExample(kind){
    // Illustrative datasheet-like electrical inputs, not manufacturer data for a particular module.
    const examples={
      single400:{voltage:24,panelUnitWp:400,panelVoc:49,panelVmp:40,panelIsc:11,seriesCount:1,parallelCount:1},
      pair190:{voltage:12,panelUnitWp:190,panelVoc:25.5,panelVmp:21.8,panelIsc:9.17,seriesCount:2,parallelCount:1}
    };
    const selection=examples[kind];
    if(!selection)return;
    Object.assign(this,selection);
    this.articleExample=false;
    if(this.catalogLoading||!this.catalog.length){this.pendingExample=true;return;}
    this.run(true);
  },
  async init(){
    this.applyArticleExampleFromUrl();
    this.catalogLoading=true;this.catalogError=false;
    try{this.catalog=await seCatalog();this.run(this.pendingExample);this.pendingExample=false;}
    catch(_){this.catalog=[];this.matches=[];this.catalogError=true;}
    finally{this.catalogLoading=false;}
  },
  run(track=true){
    if(!this.catalog.length||!this.inputValid){this.matches=[];return;}
    const voltage=Number(this.voltage),panelWp=Number(this.panelWp),mpptA=this.requiredChargeA;
    const s={voltage,panelWp,mpptA};
    this.matches=window.SolarExpertProductMatcher.rank(this.catalog.filter(p=>p.type==='mppt'),s)
      .filter(x=>{
        const p=x.product;
        const maxVoc=Number(p.max_pv_voc_v||0);
        const minVmp=Number((p.min_pv_start_v_by_voltage||{})[String(voltage)]||0);
        const maxIsc=Number(p.max_pv_isc_a||0);
        // Series increases voltage, PARALLEL strings increase short-circuit
        // current. Never recommend a controller without audited Isc limit.
        // Preserve existing 2% guard margin from the full-system Builder.
        return maxIsc>0 && this.arrayIsc<=maxIsc*.98 &&
          this.coldStringVoc<maxVoc*.98 && this.stringVmp>=minVmp;
      })
      .slice(0,5);
    if(track) seTrackSelectorOnce(this,'mppt',{voltage,panelWp,requiredChargeA:mpptA,seriesCount:Number(this.seriesCount),parallelCount:Number(this.parallelCount),arrayIsc:this.arrayIsc,stringVmp:this.stringVmp,coldStringVoc:this.coldStringVoc});
  }
};};

window.solarExpertInverterSelector=function(){return{
  voltage:48,continuousW:2000,peakW:4000,catalog:[],matches:[],engagementTracked:false,catalogLoading:true,catalogError:false,pendingExample:false,
  get inputValid(){return Number(this.voltage)>0&&Number(this.continuousW)>0&&Number(this.peakW)>=Number(this.continuousW);},
  get requiredDcA(){return Math.max(1,Math.ceil(Number(this.continuousW)/Math.max(1,Number(this.voltage))));},
  get peakDcA(){return Math.max(1,Math.ceil(Number(this.peakW)/Math.max(1,Number(this.voltage))));},
  applyExample(kind){
    const examples={
      cottage:{voltage:24,continuousW:1000,peakW:2000},
      backup:{voltage:48,continuousW:2000,peakW:4000}
    };
    const selection=examples[kind];
    if(!selection)return;
    Object.assign(this,selection);
    if(this.catalogLoading||!this.catalog.length){this.pendingExample=true;return;}
    this.run(true);
  },
  async init(){
    this.catalogLoading=true;this.catalogError=false;
    try{this.catalog=await seCatalog();this.run(this.pendingExample);this.pendingExample=false;}
    catch(_){this.catalog=[];this.matches=[];this.catalogError=true;}
    finally{this.catalogLoading=false;}
  },
  run(track=true){
    if(!this.catalog.length||!this.inputValid){this.matches=[];return;}
    const s={voltage:Number(this.voltage),inverterW:Number(this.continuousW),peak:Number(this.peakW)};
    this.matches=window.SolarExpertProductMatcher.rank(this.catalog.filter(p=>p.type==='inverter'||p.type==='inverter_hybrid'),s).slice(0,5);
    if(track) seTrackSelectorOnce(this,'inverter',{voltage:s.voltage,continuousW:s.inverterW,peakW:s.peak,requiredDcA:this.requiredDcA,peakDcA:this.peakDcA});
  }
};};
