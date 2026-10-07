window.SolarExpertProductMatcher={
  priceFreshnessDays:30,

  verificationState(verifiedAt, nowValue){
    if(!verifiedAt)return 'unknown';
    const verified=new Date(String(verifiedAt)+'T00:00:00Z');
    const now=nowValue?new Date(nowValue):new Date();
    if(Number.isNaN(verified.getTime())||Number.isNaN(now.getTime()))return 'unknown';
    const ageDays=Math.floor((now.getTime()-verified.getTime())/86400000);
    return ageDays>this.priceFreshnessDays?'stale':'fresh';
  },

  explain(product,sizing){
    const reasons=[];let pass=true;
    if(product.type==='battery'){
      if(product.system_voltage_class!==sizing.voltage){pass=false;reasons.push('wrong_system_voltage');}
      if((product.energy_wh||0)<sizing.batteryKwh*1000){pass=false;reasons.push('insufficient_energy');}
      if(!product.max_discharge_a){pass=false;reasons.push('missing_discharge_current_evidence');}
      else if(product.system_voltage_class*product.max_discharge_a<sizing.inverterW){pass=false;reasons.push('insufficient_discharge_power');}
    }
    if(product.type==='inverter'||product.type==='inverter_hybrid'){
      if(product.dc_voltage!==sizing.voltage){pass=false;reasons.push('wrong_dc_voltage');}
      if((product.continuous_w||0)<sizing.inverterW){pass=false;reasons.push('continuous_power_too_low');}
      if((product.peak_w||0)<sizing.peak){pass=false;reasons.push('surge_power_too_low');}
    }
    if(product.type==='mppt'){
      if(!(product.battery_voltages||[]).includes(sizing.voltage)){pass=false;reasons.push('unsupported_battery_voltage');}
      if((product.rated_charge_a||0)<sizing.mpptA){pass=false;reasons.push('charge_current_too_low');}
      const maxPv=Number((product.max_pv_w_by_voltage||{})[String(sizing.voltage)]||0);
      if(maxPv<sizing.panelWp){pass=false;reasons.push('pv_power_too_low');}
    }
    return{pass,reasons};
  },

  availabilityRank(product){
    const offers=Array.isArray(product.offers)?product.offers:[];
    if(offers.length){
      const usable=offers.filter(o=>this.verificationState(o.verified_at)!=='stale');
      if(usable.some(o=>o.availability==='in_stock'))return 2;
      if(usable.some(o=>o.availability==='usually_in_stock'))return 1;
      if(offers.some(o=>o.availability==='in_stock'||o.availability==='usually_in_stock'))return 1;
      return 0;
    }

    const state=this.verificationState(product.verified_at);
    if(state==='stale'){
      return product.availability==='in_stock'||product.availability==='usually_in_stock'?1:0;
    }
    if(product.availability==='in_stock')return 2;
    if(product.availability==='usually_in_stock')return 1;
    return 0;
  },

  effectivePrice(product){
    const offers=Array.isArray(product.offers)?product.offers:[];
    if(offers.length){
      const freshOffers=offers.filter(o=>
        o.availability==='in_stock'&&
        Number(o.price_czk)>0&&
        this.verificationState(o.verified_at)!=='stale'
      );
      if(freshOffers.length)return Math.min(...freshOffers.map(o=>Number(o.price_czk)));

      const hadPricedOffers=offers.some(o=>Number(o.price_czk)>0);
      if(hadPricedOffers)return Number.MAX_SAFE_INTEGER;
    }

    if(this.verificationState(product.verified_at)==='stale')return Number.MAX_SAFE_INTEGER;
    return Number(product.price_czk||Number.MAX_SAFE_INTEGER);
  },

  evidenceQuality(product){
    const offers=Array.isArray(product.offers)?product.offers:[];
    const fresh=offers.filter(o=>this.verificationState(o.verified_at)==='fresh');
    const freshInStock=fresh.filter(o=>o.availability==='in_stock');
    const freshUsually=fresh.filter(o=>o.availability==='usually_in_stock');
    if(freshInStock.length>=2)return{score:100,level:'strong',freshOffers:freshInStock.length};
    if(freshInStock.length===1)return{score:90,level:'verified',freshOffers:1};
    if(freshUsually.length)return{score:75,level:'verified_limited_stock',freshOffers:freshUsually.length};
    if(offers.length)return{score:45,level:'stale_or_unavailable_offer_evidence',freshOffers:0};
    const state=this.verificationState(product.verified_at);
    if(state==='fresh')return{score:80,level:'verified_product_snapshot',freshOffers:0};
    if(state==='stale')return{score:40,level:'stale_product_snapshot',freshOffers:0};
    return{score:25,level:'unknown',freshOffers:0};
  },

  fitMetrics(product,sizing){
    const safeRatio=(actual,required)=>required>0?Number(actual)/Number(required):1;
    if(product.type==='battery'){
      return[
        {key:'energy',ratio:safeRatio(product.energy_wh,Number(sizing.batteryKwh)*1000)},
        {key:'discharge_power',ratio:safeRatio(Number(product.system_voltage_class)*Number(product.max_discharge_a),sizing.inverterW)}
      ];
    }
    if(product.type==='inverter'||product.type==='inverter_hybrid'){
      return[
        {key:'continuous_power',ratio:safeRatio(product.continuous_w,sizing.inverterW)},
        {key:'surge_power',ratio:safeRatio(product.peak_w,sizing.peak)}
      ];
    }
    if(product.type==='mppt'){
      return[
        {key:'charge_current',ratio:safeRatio(product.rated_charge_a,sizing.mpptA)},
        {key:'pv_capacity',ratio:safeRatio(Number((product.max_pv_w_by_voltage||{})[String(sizing.voltage)]||0),sizing.panelWp)}
      ];
    }
    return[];
  },

  rightSizeScore(product,sizing){
    const metrics=this.fitMetrics(product,sizing);
    if(!metrics.length)return 50;
    const excess=metrics.reduce((sum,m)=>sum+Math.min(2,Math.max(0,Number(m.ratio)-1)),0)/metrics.length;
    return Math.max(0,Math.round(100-excess*50));
  },

  decision(product,sizing,minPrice){
    const fitScore=this.rightSizeScore(product,sizing);
    const evidence=this.evidenceQuality(product);
    const price=this.effectivePrice(product);
    const comparablePrice=Number.isFinite(price)&&price>0&&price<Number.MAX_SAFE_INTEGER;
    const priceScore=comparablePrice&&Number.isFinite(minPrice)&&minPrice>0
      ? Math.max(0,Math.min(100,Math.round((minPrice/price)*100)))
      : 0;
    const score=Math.round(fitScore*.80+priceScore*.20);
    const metrics=this.fitMetrics(product,sizing);
    const reasons=metrics.map(m=>({
      code:m.key+'_reserve',
      reserve_pct:Math.max(0,Math.round((Number(m.ratio)-1)*100))
    }));
    reasons.push({code:'evidence_'+evidence.level,fresh_offers:evidence.freshOffers});
    if(comparablePrice)reasons.push({code:price===minPrice?'lowest_verified_price':'verified_price',price_czk:price});
    return{
      score,
      fitScore,
      evidenceScore:evidence.score,
      evidenceLevel:evidence.level,
      availabilityRank:this.availabilityRank(product),
      priceScore,
      priceCzk:comparablePrice?price:null,
      reasons
    };
  },

  rank(products,sizing){
    const rows=products
      .map(product=>({product,fit:this.explain(product,sizing)}))
      .filter(x=>x.fit.pass);
    const prices=rows
      .map(x=>this.effectivePrice(x.product))
      .filter(x=>Number.isFinite(x)&&x>0&&x<Number.MAX_SAFE_INTEGER);
    const minPrice=prices.length?Math.min(...prices):null;
    for(const row of rows)row.decision=this.decision(row.product,sizing,minPrice);
    return rows.sort((a,b)=>{
      if(a.decision.evidenceScore!==b.decision.evidenceScore)return b.decision.evidenceScore-a.decision.evidenceScore;
      if(a.decision.availabilityRank!==b.decision.availabilityRank)return b.decision.availabilityRank-a.decision.availabilityRank;
      if(a.decision.fitScore!==b.decision.fitScore)return b.decision.fitScore-a.decision.fitScore;
      if(a.decision.priceScore!==b.decision.priceScore)return b.decision.priceScore-a.decision.priceScore;
      const pa=this.effectivePrice(a.product),pb=this.effectivePrice(b.product);
      if(pa!==pb)return pa-pb;
      return String(a.product.id||'').localeCompare(String(b.product.id||''));
    });
  }
};
