async function seCatalog(){const r=await fetch(window.SolarExpertConfig.catalogUrl,{credentials:'same-origin'});return(await r.json()).products||[];}

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
  voltage:24,dailyKwh:1.5,autonomy:1,inverterW:1200,catalog:[],matches:[],engagementTracked:false,
  async init(){this.catalog=await seCatalog();this.run(false);},
  run(track=true){
    const batteryKwh=Math.ceil(((Number(this.dailyKwh)*Number(this.autonomy))/.85)*10)/10;
    const s={voltage:Number(this.voltage),batteryKwh,inverterW:Number(this.inverterW)};
    this.matches=window.SolarExpertProductMatcher.rank(this.catalog.filter(p=>p.type==='battery'),s).slice(0,5);
    if(track) seTrackSelectorOnce(this,'battery',{voltage:s.voltage,batteryKwh,inverterW:s.inverterW});
  }
};};

window.solarExpertMpptSelector=function(){return{
  voltage:24,panelWp:760,panelVoc:25.5,panelVmp:21.8,seriesCount:2,coldFactor:1.12,catalog:[],matches:[],engagementTracked:false,
  async init(){this.catalog=await seCatalog();this.run(false);},
  get coldStringVoc(){return Number(this.panelVoc)*Number(this.seriesCount)*Number(this.coldFactor);},
  get stringVmp(){return Number(this.panelVmp)*Number(this.seriesCount);},
  run(track=true){
    const voltage=Number(this.voltage),panelWp=Number(this.panelWp);
    const mpptA=Math.max(10,Math.ceil(((panelWp/voltage)*1.25)/5)*5);
    const s={voltage,panelWp,mpptA};
    this.matches=window.SolarExpertProductMatcher.rank(this.catalog.filter(p=>p.type==='mppt'),s)
      .filter(x=>{
        const p=x.product;
        const maxVoc=Number(p.max_pv_voc_v||0);
        const minVmp=Number((p.min_pv_start_v_by_voltage||{})[String(voltage)]||0);
        return this.coldStringVoc < maxVoc*.98 && this.stringVmp >= minVmp;
      })
      .slice(0,5);
    if(track) seTrackSelectorOnce(this,'mppt',{voltage,panelWp,seriesCount:Number(this.seriesCount),stringVmp:this.stringVmp,coldStringVoc:this.coldStringVoc});
  }
};};

window.solarExpertInverterSelector=function(){return{
  voltage:48,continuousW:2000,peakW:4000,catalog:[],matches:[],engagementTracked:false,
  async init(){this.catalog=await seCatalog();this.run(false);},
  run(track=true){
    const s={voltage:Number(this.voltage),inverterW:Number(this.continuousW),peak:Number(this.peakW)};
    this.matches=window.SolarExpertProductMatcher.rank(this.catalog.filter(p=>p.type==='inverter'||p.type==='inverter_hybrid'),s).slice(0,5);
    if(track) seTrackSelectorOnce(this,'inverter',{voltage:s.voltage,continuousW:s.inverterW,peakW:s.peak});
  }
};};
