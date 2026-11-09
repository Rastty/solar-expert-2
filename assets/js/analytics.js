(function(){
  'use strict';

  const config=window.SolarExpertAnalyticsConfig||{};
  const endpoint=config.endpoint||'';
  const allowedEvents=new Set([
    'tool_view','tool_start','tool_exposure','tool_activation','builder_step','solar_builder_complete','selector_engaged',
    'quote_checker_complete','offer_exposure','bundle_deal_exposure','affiliate_click','bundle_deal_click','lead_click',
    'tool_referral_click'
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

  const toolPaths=new Map([
    ['/solarni-sestava-na-chatu','builder'],
    ['/quote-checker','quote'],
    ['/vyber-baterii','battery'],
    ['/mppt-kalkulacka','mppt'],
    ['/vyber-menice','inverter']
  ]);

  function toolFromLink(link){
    if(!link||!link.href) return '';
    try{
      const url=new URL(link.href,window.location.href);
      if(url.origin!==window.location.origin) return '';
      const path=(url.pathname||'/').replace(/\/+$/,'')||'/';
      if(path==='/'&&url.hash==='#builder') return 'builder';
      return toolPaths.get(path)||'';
    }catch(_){
      return '';
    }
  }

  function initToolReferralTracking(){
    document.addEventListener('click',(event)=>{
      const link=event.target&&event.target.closest?event.target.closest('a[href]'):null;
      const tool=toolFromLink(link);
      if(!tool) return;
      window.SolarExpertAnalytics.track('tool_referral_click',{tool});
    },{passive:true});
  }

  function initToolTracking(){
    for(const [tool,selector] of tools){
      const root=document.querySelector(selector);
      if(!root) continue;

      // Legacy page-presence metric kept for continuity. New decisions use
      // exposure -> activation, both introduced together in v2.
      window.SolarExpertAnalytics.track('tool_view',{tool});

      let started=false;
      let exposed=false;
      let exposureTimer=null;
      let observer=null;

      const expose=()=>{
        if(exposed) return;
        exposed=true;
        if(exposureTimer){clearTimeout(exposureTimer);exposureTimer=null;}
        if(observer) observer.disconnect();
        window.SolarExpertAnalytics.track('tool_exposure',{tool});
      };

      const start=()=>{
        // Interaction itself proves meaningful exposure, including browsers
        // without IntersectionObserver.
        expose();
        if(started) return;
        started=true;
        window.SolarExpertAnalytics.track('tool_start',{tool});
        window.SolarExpertAnalytics.track('tool_activation',{tool});
      };

      if('IntersectionObserver' in window){
        observer=new IntersectionObserver((entries)=>{
          const visible=entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=0.15);
          if(visible){
            if(!exposed&&!exposureTimer) exposureTimer=setTimeout(expose,600);
          }else if(exposureTimer){
            clearTimeout(exposureTimer);
            exposureTimer=null;
          }
        },{threshold:[0,0.15,0.5]});
        observer.observe(root);
      }

      // The homepage's explicit sample-preview CTA lives outside the Builder
      // DOM root. Route its activation through the exact same once-only
      // exposure/start counters to avoid losing or double-counting previews.
      if(tool==='builder') root.addEventListener('solar-expert-builder-activated',start);
      root.addEventListener('pointerdown',start,{once:true,passive:true});
      root.addEventListener('keydown',start,{once:true});
      root.addEventListener('change',start,{once:true});
    }
  }

  function initOfferExposureTracking(){
    const exposedKeys=new Set();
    const observed=new WeakSet();
    const timers=new WeakMap();
    let observer=null;

    const details=link=>{
      if(!link) return null;
      const productId=link.getAttribute('data-se-product-id')||'';
      const dealId=link.getAttribute('data-se-deal-id')||'';
      const merchant=link.getAttribute('data-se-merchant')||'';
      const placement=link.getAttribute('data-se-placement')||'';
      if(!merchant||!placement) return null;
      if(productId) return {event:'offer_exposure',productId,merchant,placement};
      // Deal CTA is separate from its components: keep denominator and
      // merchant identity independent from ordinary product-offer CTR.
      // A '#'-only fallback is not a usable buyer-facing merchant link.
      if(dealId && link.getAttribute('href') && link.getAttribute('href')!=='#')
        return {event:'bundle_deal_exposure',dealId,merchant,placement};
      return null;
    };

    const expose=link=>{
      const detail=details(link);
      if(!detail) return;
      const {event,...fields}=detail;
      const key=event+'|'+(fields.productId||fields.dealId)+'|'+fields.merchant+'|'+fields.placement;
      if(exposedKeys.has(key)) return;
      exposedKeys.add(key);
      const timer=timers.get(link);
      if(timer){clearTimeout(timer);timers.delete(link);}
      if(observer) observer.unobserve(link);
      window.SolarExpertAnalytics.track(event,fields);
    };

    if('IntersectionObserver' in window){
      observer=new IntersectionObserver((entries)=>{
        for(const entry of entries){
          const link=entry.target;
          if(entry.isIntersecting&&entry.intersectionRatio>=0.5){
            if(!timers.has(link)) timers.set(link,setTimeout(()=>expose(link),600));
          }else{
            const timer=timers.get(link);
            if(timer){clearTimeout(timer);timers.delete(link);}
          }
        }
      },{threshold:[0,0.5,1]});
    }

    const observeLink=link=>{
      if(!link||observed.has(link)||!details(link)) return;
      observed.add(link);
      if(observer) observer.observe(link);
    };

    const scan=root=>{
      if(!root||!root.querySelectorAll) return;
      const offerSelector='.se-offer[data-se-product-id][data-se-merchant][data-se-placement], a[data-se-deal-id][data-se-merchant][data-se-placement]';
      if(root.matches&&root.matches(offerSelector)) observeLink(root);
      root.querySelectorAll(offerSelector).forEach(observeLink);
    };

    scan(document);
    if('MutationObserver' in window&&document.body){
      const mutationObserver=new MutationObserver(records=>{
        for(const record of records){
          if(record.type==='attributes') observeLink(record.target);
          else record.addedNodes.forEach(node=>{if(node.nodeType===1) scan(node);});
        }
      });
      mutationObserver.observe(document.body,{
        childList:true,
        subtree:true,
        attributes:true,
        attributeFilter:['data-se-product-id','data-se-deal-id','data-se-merchant','data-se-placement','href']
      });
    }

    document.addEventListener('click',(event)=>{
      const link=event.target&&event.target.closest?event.target.closest('.se-offer[data-se-product-id][data-se-merchant][data-se-placement], a[data-se-deal-id][data-se-merchant][data-se-placement]'):null;
      if(link) expose(link);
    },{capture:true,passive:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{initToolReferralTracking();initToolTracking();initOfferExposureTracking();},{once:true});
  }else{
    initToolReferralTracking();
    initToolTracking();
    initOfferExposureTracking();
  }
})();