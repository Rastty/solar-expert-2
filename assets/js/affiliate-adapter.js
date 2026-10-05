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

  baseMap() {
    const config = window.SolarExpertConfig || {};
    const bases = config.affiliateBases || {};
    return typeof bases === 'object' && bases ? bases : {};
  },

  merchantDeepLink(merchantId, targetUrl) {
    const base = this.baseMap()[merchantId];
    if (!base || !targetUrl) return null;
    try {
      const u = new URL(base, window.location?.origin || 'https://solar-expert.cz');
      u.searchParams.delete('desturl');
      u.searchParams.set('desturl', targetUrl);
      return u.toString();
    } catch (_) {
      return null;
    }
  },

  rawOffers(product) {
    if (!product) return [];
    const offers = Array.isArray(product.offers) && product.offers.length
      ? product.offers
      : [{
          merchant: product.merchant,
          price_czk: product.price_czk,
          availability: product.availability,
          source_url: product.source_url,
          affiliate_url: product.affiliate_url
        }];

    return offers
      .filter(o => o && o.merchant)
      .sort((a,b) => {
        const aStock = a.availability === 'in_stock' ? 1 : 0;
        const bStock = b.availability === 'in_stock' ? 1 : 0;
        if (aStock !== bStock) return bStock - aStock;
        const ap = Number(a.price_czk || Number.MAX_SAFE_INTEGER);
        const bp = Number(b.price_czk || Number.MAX_SAFE_INTEGER);
        return ap - bp;
      });
  },

  resolveOffer(product, offer) {
    if (!product || !offer) return {href:'#', monetized:false, merchant:null, price_czk:null, raw:null};

    const map = this.map();
    const products = map.products || {};
    const exactKey = product.id + '@' + offer.merchant;
    const exactMapped = products[exactKey];
    const legacyMapped = offer.merchant === product.merchant ? products[product.id] : null;
    const mapped = exactMapped || legacyMapped;
    const target = offer.source_url || product.source_url || null;
    const generated = this.merchantDeepLink(offer.merchant, target);
    const href = mapped || offer.affiliate_url || generated || target || '#';

    return {
      href,
      monetized: Boolean(mapped || offer.affiliate_url || generated),
      merchant: this.merchants[offer.merchant] || {label:offer.merchant, approved:false},
      merchantId: offer.merchant,
      price_czk: Number(offer.price_czk || 0) || null,
      availability: offer.availability || product.availability || null,
      raw: offer
    };
  },

  offers(product) {
    return this.rawOffers(product).map(offer => this.resolveOffer(product, offer));
  },

  resolve(product) {
    return this.offers(product)[0] || {href:'#', monetized:false, merchant:null, price_czk:null, raw:null};
  },

  resolveBundleDeal(deal) {
    if (!deal) return {href:'#', monetized:false, merchant:null, merchantId:null, price_czk:null};
    const generated = this.merchantDeepLink(deal.merchant, deal.source_url);
    return {
      href: generated || deal.source_url || '#',
      monetized: Boolean(generated),
      merchant: this.merchants[deal.merchant] || {label:deal.merchant, approved:false},
      merchantId: deal.merchant || null,
      price_czk: Number(deal.price_czk || 0) || null,
      savings_czk: Number(deal.savings_czk || 0) || null,
      raw: deal
    };
  },

  trackBundleDeal(deal, placement) {
    const resolved = this.resolveBundleDeal(deal);
    const detail = {
      dealId: deal?.id || null,
      merchant: resolved.merchantId,
      placement: placement || 'builder-bundle-deal',
      monetized: resolved.monetized,
      hrefType: resolved.monetized ? 'affiliate' : 'source',
      priceCzk: resolved.price_czk,
      savingsCzk: resolved.savings_czk
    };
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({event:'bundle_deal_click', ...detail});
    }
    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('solar-expert-bundle-deal-click', {detail}));
    }
    return resolved;
  },

  resolveLead(id, fallback) {
    const map = this.map();
    const leads = map.leads || {};
    const mapped = leads[id] || null;
    const merchantId = id && id.startsWith('eon-') ? 'eon-cz' : null;
    const generated = merchantId ? this.merchantDeepLink(merchantId, fallback) : null;
    return {
      href: mapped || generated || fallback || '#',
      monetized: Boolean(mapped || generated),
      leadId: id || null,
      merchantId
    };
  },

  trackLead(id, placement, fallback) {
    const resolved = this.resolveLead(id, fallback);
    const detail = {
      leadId: id || null,
      merchant: id && id.startsWith('eon-') ? 'eon-cz' : null,
      placement: placement || 'lead_cta',
      monetized: resolved.monetized,
      hrefType: resolved.monetized ? 'affiliate' : 'source'
    };
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({event:'lead_click', ...detail});
    }
    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('solar-expert-lead-click', {detail}));
    }
    return resolved;
  },

  trackOffer(product, offer, placement) {
    const resolved = this.resolveOffer(product, offer);
    const detail = {
      productId: product?.id || null,
      merchant: resolved.merchantId || offer?.merchant || null,
      placement: placement || 'unknown',
      monetized: resolved.monetized,
      hrefType: resolved.monetized ? 'affiliate' : 'source',
      priceCzk: resolved.price_czk
    };

    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({event:'affiliate_click', ...detail});
    }

    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('solar-expert-outbound-click', {detail}));
    }
    return resolved;
  },

  track(product, placement) {
    const offer = this.rawOffers(product)[0];
    return offer ? this.trackOffer(product, offer, placement) : this.resolve(product);
  }
};
