window.solarExpertBuilder=function(){
  return {
    step:1,scenario:'',season:'three',autonomy:1,manualPeak:null,catalog:[],catalogReady:false,bundles:[],result:null,
    appliances:[
      {id:'fridge',name:'Lednice',watts:70,surge:700,hours:10,qty:1,selected:false},
      {id:'lights',name:'LED osvětlení',watts:40,surge:40,hours:5,qty:1,selected:false},
      {id:'laptop',name:'Notebook',watts:65,surge:90,hours:4,qty:1,selected:false},
      {id:'router',name:'Router / Wi-Fi',watts:12,surge:12,hours:24,qty:1,selected:false},
      {id:'tv',name:'Televize',watts:90,surge:120,hours:3,qty:1,selected:false},
      {id:'pump',name:'Vodní čerpadlo',watts:800,surge:2200,hours:0.5,qty:1,selected:false},
      {id:'kettle',name:'Rychlovarná konvice',watts:2000,surge:2000,hours:0.12,qty:1,selected:false},
      {id:'tools',name:'Elektrické nářadí',watts:1000,surge:1800,hours:0.5,qty:1,selected:false}
    ],
    async init(){try{const u=window.SolarExpertConfig?.catalogUrl;if(!u)return;const r=await fetch(u,{credentials:'same-origin'});const d=await r.json();this.catalog=d.products||[];this.catalogReady=true;}catch(_){}},
    get selectedAppliances(){return this.appliances.filter(a=>a.selected);},
    get dailyWh(){return Math.round(this.selectedAppliances.reduce((s,a)=>s+a.watts*a.hours*a.qty,0));},
    get runningWatts(){return Math.round(this.selectedAppliances.reduce((s,a)=>s+a.watts*a.qty,0));},
    get estimatedPeak(){if(!this.selectedAppliances.length)return 0;const b=this.runningWatts;return Math.round(Math.max(b,...this.selectedAppliances.map(a=>b-a.watts*a.qty+a.surge*a.qty)));},
    toggle(id){const a=this.appliances.find(x=>x.id===id);if(a)a.selected=!a.selected;},
    preset(type){this.appliances.forEach(a=>a.selected=false);const ids=type==='chata'?['fridge','lights','laptop','router','pump']:type==='offgrid'?['fridge','lights','laptop','router','tv','pump']:['fridge','lights','router','pump'];ids.forEach(id=>{const a=this.appliances.find(x=>x.id===id);if(a)a.selected=true;});this.scenario=type;this.step=2;},
    calc(){if(!this.selectedAppliances.length)return;const energyWh=this.dailyWh;const psh=this.season==='summer'?4.2:(this.season==='three'?2.8:1.6);const panelWp=Math.ceil((energyWh/(psh*0.76))/50)*50;const peak=Math.max(Number(this.manualPeak)||0,this.estimatedPeak);const voltage=peak<=900?12:(peak<=2200?24:48);const batteryKwh=Math.ceil((((energyWh*this.autonomy)/0.85)/1000)*10)/10;const inverterW=Math.ceil((peak*1.25)/100)*100;const mpptA=Math.max(10,Math.ceil(((panelWp/voltage)*1.25)/5)*5);this.result={energyWh,energyKwh:Math.round((energyWh/1000)*100)/100,peak,panelWp,voltage,batteryKwh,inverterW,mpptA,psh};this.bundles=window.SolarExpertBundleComposer?.compose(this.catalog,this.result)||[];this.step=4;},
    reset(){this.step=1;this.scenario='';this.result=null;this.bundles=[];this.manualPeak=null;this.appliances.forEach(a=>a.selected=false);}
  };
};
