window.SolarExpertBundleComposer = {
  choose(rows,tier) {
    const exact=rows.find(r=>r.product.tier===tier);
    if (exact) return exact.product;
    if (tier==='best' && rows[0]) return rows[0].product;
    return null;
  },
  compose(catalog,sizing) {
    if (!window.SolarExpertProductMatcher) return [];
    const batteries=window.SolarExpertProductMatcher.rank(catalog.filter(p=>p.type==='battery'),sizing);
    const inverters=window.SolarExpertProductMatcher.rank(catalog.filter(p=>p.type==='inverter'||p.type==='inverter_hybrid'),sizing);
    const mppts=window.SolarExpertProductMatcher.rank(catalog.filter(p=>p.type==='mppt'),sizing);
    const panel=catalog.find(p=>p.type==='panel');
    const labels={budget:'Budget',best:'Best Value',premium:'Premium'};
    return ['budget','best','premium'].map(tier=>{
      if(!panel) return {tier,label:labels[tier],complete:false,missing:['panel']};
      const battery=this.choose(batteries,tier);
      const inverter=this.choose(inverters,tier);
      if(!battery||!inverter) return {tier,label:labels[tier],complete:false,missing:[!battery?'baterie':null,!inverter?'měnič':null].filter(Boolean)};
      const count=Math.max(1,Math.ceil(sizing.panelWp/panel.rated_wp));
      const panelPlan={product:panel,count,totalWp:count*panel.rated_wp};
      const integrated=inverter.type==='inverter_hybrid'&&inverter.integrated_mppt;
      let mppt=null;
      if(!integrated) {
        mppt=this.choose(mppts,tier);
        if(!mppt) return {tier,label:labels[tier],complete:false,missing:['MPPT']};
        if(panel.voc_v*count>=mppt.max_pv_voc_v) return {tier,label:labels[tier],complete:false,missing:['jiné panelové zapojení kvůli Voc']};
      }
      const totalPrice=(battery.price_czk||0)+(inverter.price_czk||0)+(panel.price_czk||0)*count+(mppt?(mppt.price_czk||0):0);
      return {tier,label:labels[tier],complete:true,status:'preliminarily_compatible',battery,inverter,mppt,integratedMppt:!!integrated,panel:panelPlan,totalPrice};
    });
  }
};
