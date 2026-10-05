window.SolarExpertAffiliate = {
  merchants: {
    'battery-cz': {label:'Battery.cz', approved:true},
    'solar-import-cz': {label:'Solar-Import.cz', approved:true},
    'ampul-eu': {label:'Ampul.eu', approved:true},
    'eon-cz': {label:'E.ON.cz', approved:true},
    'vselektro-eu': {label:'VS Elektro', approved:false}
  },

  map() {
    const config = window.SolarExpertConfig || {};
    const map = config.affiliateMap || {};
    return typeof map === 'object' && map ? map : {};
  },

  resolve(product) {
    if (!product) return {href:'#', monetized:false, merchant:null};

    const map = this.map();
    const products = map.products || {};
    const mapped = products[product.id];
    const href = mapped || product.affiliate_url || product.source_url || '#';

    return {
      href,
      monetized: Boolean(mapped || product.affiliate_url),
      merchant: this.merchants[product.merchant] || {label:product.merchant, approved:false}
    };
  },

  resolveLead(id, fallback) {
    const map = this.map();
    const leads = map.leads || {};
    return leads[id] || fallback || '#';
  },

  track(product, placement) {
    const resolved = this.resolve(product);
    const detail = {
      productId: product?.id || null,
      merchant: product?.merchant || null,
      placement: placement || 'unknown',
      monetized: resolved.monetized,
      hrefType: resolved.monetized ? 'affiliate' : 'source'
    };

    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({event:'affiliate_click', ...detail});
    }

    window.dispatchEvent(new CustomEvent('solar-expert-outbound-click', {detail}));
    return resolved;
  }
};
