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
  voltage:24,dailyKwh:1.5,autonomy:1,inverterW:1200,catalog:[],matches:[],engagementTracked:false,catalogLoading:true,catalogError:false,
  get requiredBatteryKwh(){return Math.ceil(((Number(this.dailyKwh)*Number(this.autonomy))/.85)*10)/10;},
  get requiredDischargeA(){return Math.max(1,Math.ceil(Number(this.inverterW)/Math.max(1,Number(this.voltage))));},
  async init(){
    this.catalogLoading=true;this.catalogError=false;
    try{this.catalog=await seCatalog();this.run(false);}
    catch(_){this.catalog=[];this.matches=[];this.catalogError=true;}
    finally{this.catalogLoading=false;}
  },
  run(track=true){
    if(!this.catalog.length){this.matches=[];return;}
    const batteryKwh=this.requiredBatteryKwh;
    const s={voltage:Number(this.voltage),batteryKwh,inverterW:Number(this.inverterW)};
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
    if(track) seTrackSelectorOnce(this,'battery',{voltage:s.voltage,batteryKwh,inverterW:s.inverterW});
  }
};};

window.solarExpertMpptSelector=function(){return{
  voltage:24,panelWp:760,panelVoc:25.5,panelVmp:21.8,seriesCount:2,coldFactor:1.12,catalog:[],matches:[],engagementTracked:false,catalogLoading:true,catalogError:false,
  get coldStringVoc(){return Number(this.panelVoc)*Number(this.seriesCount)*Number(this.coldFactor);},
  get stringVmp(){return Number(this.panelVmp)*Number(this.seriesCount);},
  get requiredChargeA(){const voltage=Math.max(1,Number(this.voltage));return Math.max(10,Math.ceil(((Number(this.panelWp)/voltage)*1.25)/5)*5);},
  get inputValid(){return Number(this.panelWp)>0&&Number(this.panelVoc)>0&&Number(this.panelVmp)>0&&Number(this.panelVoc)>Number(this.panelVmp)&&Number(this.seriesCount)>=1;},
  async init(){
    this.catalogLoading=true;this.catalogError=false;
    try{this.catalog=await seCatalog();this.run(false);}
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
        return this.coldStringVoc < maxVoc*.98 && this.stringVmp >= minVmp;
      })
      .slice(0,5);
    if(track) seTrackSelectorOnce(this,'mppt',{voltage,panelWp,requiredChargeA:mpptA,seriesCount:Number(this.seriesCount),stringVmp:this.stringVmp,coldStringVoc:this.coldStringVoc});
  }
};};

window.solarExpertInverterSelector=function(){return{
  voltage:48,continuousW:2000,peakW:4000,catalog:[],matches:[],engagementTracked:false,catalogLoading:true,catalogError:false,
  get inputValid(){return Number(this.voltage)>0&&Number(this.continuousW)>0&&Number(this.peakW)>=Number(this.continuousW);},
  get requiredDcA(){return Math.max(1,Math.ceil(Number(this.continuousW)/Math.max(1,Number(this.voltage))));},
  get peakDcA(){return Math.max(1,Math.ceil(Number(this.peakW)/Math.max(1,Number(this.voltage))));},
  async init(){
    this.catalogLoading=true;this.catalogError=false;
    try{this.catalog=await seCatalog();this.run(false);}
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
