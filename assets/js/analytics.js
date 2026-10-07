(function(){
  'use strict';

  const config=window.SolarExpertAnalyticsConfig||{};
  const endpoint=config.endpoint||'';
  const allowedEvents=new Set([
    'tool_view','tool_start','solar_builder_complete','selector_engaged',
    'quote_checker_complete','affiliate_click','bundle_deal_click','lead_click'
  ]);
  const allowedFields=new Set([
    'tool','selector','status','merchant','placement','scenario',
    'productId','leadId','dealId','monetized','matchCount','page'
  ]);

  function currentPageKey(){
    const path=(window.location&&window.location.pathname)||'/';
    const trimmed=path.replace(/^\/+|\/+$/g,'');
    return (trimmed||'home').replace(/\/+/g,'--').slice(0,80);
  }

  function cleanPayload(event,detail){
    const payload={event};
    if(!detail||typeof detail!=='object') return payload;
    for(const [key,value] of Object.entries(detail)){
      if(!allowedFields.has(key)) continue;
      if(typeof value==='boolean') payload[key]=value;
      else if(typeof value==='number'&&Number.isFinite(value)) payload[key]=Math.max(0,Math.min(1000,Math.round(value)));
      else if(typeof value==='string'&&value) payload[key]=value.slice(0,80);
    }
    return payload;
  }

  function post(payload){
    if(!endpoint||!allowedEvents.has(payload.event)) return;
    try{
      fetch(endpoint,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload),
        credentials:'same-origin',
        keepalive:true
      }).catch(()=>{});
    }catch(_){}
  }

  const layer=Array.isArray(window.dataLayer)?window.dataLayer:[];
  const nativePush=layer.push.bind(layer);
  layer.push=function(...items){
    const result=nativePush(...items);
    for(const item of items){
      if(item&&typeof item==='object'&&allowedEvents.has(item.event)){
        post(cleanPayload(item.event,{...item,page:currentPageKey()}));
      }
    }
    return result;
  };
  window.dataLayer=layer;

  window.SolarExpertAnalytics={
    track(event,detail){
      if(!allowedEvents.has(event)) return;
      window.dataLayer.push({event,...(detail||{})});
    }
  };

  const tools=[
    ['builder','#builder'],
    ['quote','[x-data="solarExpertQuoteChecker()"]'],
    ['battery','[x-data="solarExpertBatterySelector()"]'],
    ['mppt','[x-data="solarExpertMpptSelector()"]'],
    ['inverter','[x-data="solarExpertInverterSelector()"]']
  ];

  function initToolTracking(){
    for(const [tool,selector] of tools){
      const root=document.querySelector(selector);
      if(!root) continue;
      window.SolarExpertAnalytics.track('tool_view',{tool});
      let started=false;
      const start=()=>{
        if(started) return;
        started=true;
        window.SolarExpertAnalytics.track('tool_start',{tool});
      };
      root.addEventListener('pointerdown',start,{once:true,passive:true});
      root.addEventListener('keydown',start,{once:true});
      root.addEventListener('change',start,{once:true});
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initToolTracking,{once:true});
  }else{
    initToolTracking();
  }
})();