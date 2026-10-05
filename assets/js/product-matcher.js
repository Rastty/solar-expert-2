window.SolarExpertProductMatcher={
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
    if(offers.some(o=>o.availability==='in_stock'))return 2;
    if(product.availability==='in_stock')return 2;
    if(offers.some(o=>o.availability==='usually_in_stock')||product.availability==='usually_in_stock')return 1;
    return 0;
  },
  effectivePrice(product){
    const offers=Array.isArray(product.offers)?product.offers.filter(o=>o.availability==='in_stock'&&Number(o.price_czk)>0):[];
    if(offers.length)return Math.min(...offers.map(o=>Number(o.price_czk)));
    return Number(product.price_czk||Number.MAX_SAFE_INTEGER);
  },
  rank(products,sizing){
    return products.map(product=>({product,fit:this.explain(product,sizing)})).filter(x=>x.fit.pass).sort((a,b)=>{
      const sa=this.availabilityRank(a.product),sb=this.availabilityRank(b.product);
      if(sa!==sb)return sb-sa;
      return this.effectivePrice(a.product)-this.effectivePrice(b.product);
    });
  }
};
