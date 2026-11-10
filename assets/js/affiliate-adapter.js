window.SolarExpertAffiliate = {
  merchants: {
    'battery-cz': {label:'Battery.cz', approved:true, operatorId:'efteria-cz'},
    'solar-import-cz': {label:'Solar-Import.cz', approved:true, operatorId:'efteria-cz'},
    'ampul-eu': {label:'Ampul.eu', approved:true},
    'eon-cz': {label:'E.ON.cz', approved:true},
    'vselektro-eu': {label:'VSelektro.eu', approved:true, operatorId:'vs-elektro-plus-cz'}
  },

  // Merchant storefronts are not necessarily independent sellers.
  // Verified 2026-10-12 against both shops' own obchodní podmínky:
  // Battery.cz and Solar-Import.cz are operated by Efteria, spol. s r.o.
  // Keep two real checkout URLs, but avoid claiming two independent dealers.
  sharedOperatorNotice(product) {
    const merchantIds=[...new Set(this.rawOffers(product).map(o=>o.merchant))];
    if (merchantIds.length<2) return '';
    if (merchantIds.includes('battery-cz') && merchantIds.includes('solar-import-cz')) {
      return 'Battery.cz a Solar-Import.cz provozuje stejná společnost Efteria, spol. s r.o. Porovnáváme dvě nabídky jejích webů, ne dva nezávislé prodejce.';
    }
    return '';
  },

  // Show the independently owned third shop as a genuine alternative,
  // not as another storefront of the same seller. This is informational:
  // it never changes price order, fit decisions, stock or affiliate ranking.
  isIndependentAlternative(product, merchantId) {
    if (!product || !merchantId) return false;
    const offers=this.rawOffers(product);
    if (!offers.some(o=>o.merchant===merchantId)) return false;
    const ownOperator=this.merchants[merchantId]?.operatorId||merchantId;
    const counts=new Map();
    for (const offer of offers) {
      const operator=this.merchants[offer.merchant]?.operatorId||offer.merchant;
      counts.set(operator,(counts.get(operator)||0)+1);
    }
    return [...counts].some(([operator,count])=>operator!==ownOperator&&count>=2);
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

  // A tracked merchant CTA MUST navigate to a real external web page.
  // Never treat "#" or javascript:, data:, mailto: or same-site routes as
  // an outbound buyer click. Preserve legitimate direct and partner URLs.
  isActionableMerchantHref(href) {
    if(typeof href!=='string'||!href.trim())return false;
    try {
      const u=new URL(href);
      if((u.protocol!=='https:'&&u.protocol!=='http:')||!u.hostname)return false;
      const ownOrigin=window.location?.origin || 'https://solar-expert.cz';
      return u.origin!==ownOrigin;
    } catch (_) { return false; }
  },

  // Affiliate redirects can remain valid outbound routes even if the seller's
  // dated product listing is missing. Such routes are NOT proof of a price or
  // stock claim. Legacy products with no explicit offers retain their own
  // independent snapshot compatibility contract.
  hasQuoteEvidence(offer, explicitOffers) {
    if (!explicitOffers) return true;
    const matcher=window.SolarExpertProductMatcher;
    return Boolean(matcher && typeof matcher.hasSellerSource==='function' && matcher.hasSellerSource(offer));
  },

  // A verified seller must lead the visible offer shortlist, including when
  // a cheaper, affiliate-mapped, unverified destination is still clickable.
  prioritizeActionableOffers(offers) {
    const rank=o=>o.availability==='in_stock'?2:o.availability==='usually_in_stock'?1:0;
    return offers.sort((a,b)=>{
      const availability=rank(b)-rank(a);
      if(availability)return availability;
      const ap=Number(a.price_czk),bp=Number(b.price_czk);
      const aPriced=a.price_czk!==null&&Number.isFinite(ap)&&ap>0;
      const bPriced=b.price_czk!==null&&Number.isFinite(bp)&&bp>0;
      if(aPriced!==bPriced)return bPriced?1:-1;
      if(aPriced&&ap!==bp)return ap-bp;
      return 0;
    });
  },

  selectMerchantLink(candidates) {
    for(const candidate of candidates){
      if(this.isActionableMerchantHref(candidate?.href))
        return {href:candidate.href,monetized:Boolean(candidate.monetized)};
    }
    return {href:'#',monetized:false};
  },

  merchantDeepLink(merchantId, targetUrl) {
    const base = this.baseMap()[merchantId];
    if (!this.isActionableMerchantHref(base)||!this.isActionableMerchantHref(targetUrl))return null;
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
          affiliate_url: product.affiliate_url,
          verified_at: product.verified_at
        }];

    return offers
      .filter(o => o && o.merchant)
      .sort((a,b) => {
        // Display independently current retailer quotes first. A cheaper
        // unverified/expired snapshot must never become the default merchant.
        const matcher=window.SolarExpertProductMatcher;
        const aFresh=matcher && matcher.verificationState(a.verified_at)==='fresh' ? 1 : 0;
        const bFresh=matcher && matcher.verificationState(b.verified_at)==='fresh' ? 1 : 0;
        if(aFresh!==bFresh)return bFresh-aFresh;
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
    // An explicit alternate merchant may not inherit the primary shop's
    // product URL: this would send an affiliate customer to the wrong store.
    const explicitOffers=Array.isArray(product.offers)&&product.offers.length>0;
    const sourceBacked=this.hasQuoteEvidence(offer,explicitOffers);
    // Never send a shopper to retailer B while displaying retailer A.
    // Exact pre-approved affiliate mappings remain eligible independently.
    const target=explicitOffers
      ? (sourceBacked?offer.source_url:null)
      : (offer.source_url||(offer.merchant===product.merchant?product.source_url:null));
    const generated = this.merchantDeepLink(offer.merchant, target);
    const link = this.selectMerchantLink([
      {href:mapped,monetized:true},
      {href:offer.affiliate_url,monetized:true},
      {href:generated,monetized:true},
      {href:target,monetized:false}
    ]);
    const verifiedAt = offer.verified_at || null; // Exact merchant evidence only; never borrow another shop's date.
    const freshness = window.SolarExpertProductMatcher
      ? window.SolarExpertProductMatcher.verificationState(verifiedAt)
      : 'unknown';
    const quoteFreshness=sourceBacked?freshness:'unknown';
    const price=Number(offer.price_czk);
    const rawPrice=Number.isFinite(price)&&price>0?price:null;

    return {
      href: link.href,
      monetized: link.monetized,
      merchant: this.merchants[offer.merchant] || {label:offer.merchant, approved:false},
      merchantId: offer.merchant,
      price_czk: quoteFreshness === 'fresh' ? rawPrice : null,
      // A dated row without its own source listing cannot prove seller stock.
      availability: quoteFreshness === 'fresh' ? (offer.availability || 'unverified') : 'unverified',
      verified_at: verifiedAt,
      price_freshness: quoteFreshness,
      raw: offer
    };
  },

  offers(product) {
    // Invalid targets are not shopping options and must not become tracked
    // impressions/clicks or occupy the visible 2-offer shortlist.
    const resolved = this.prioritizeActionableOffers(
      this.rawOffers(product).map(offer => this.resolveOffer(product, offer))
        .filter(o=>this.isActionableMerchantHref(o.href))
    );
    const freshInStockPrices = resolved
      .filter(o => o.availability === 'in_stock' && Number.isFinite(Number(o.price_czk)) && Number(o.price_czk) > 0)
      .map(o => Number(o.price_czk));
    if (freshInStockPrices.length < 2) return resolved.map(o=>({...o,is_best_price:false,savings_vs_next_czk:null}));

    const minPrice = Math.min(...freshInStockPrices);
    const higherPrices = freshInStockPrices.filter(price => price > minPrice);
    if (!higherPrices.length) return resolved.map(o=>({...o,is_best_price:false,savings_vs_next_czk:null}));
    const nextPrice = Math.min(...higherPrices);

    return resolved.map(o => ({
      ...o,
      is_best_price: o.availability === 'in_stock' && Number(o.price_czk) === minPrice,
      savings_vs_next_czk: o.availability === 'in_stock' && Number(o.price_czk) === minPrice
        ? Math.max(0, Math.round(nextPrice - minPrice))
        : null
    }));
  },

  resolve(product) {
    return this.offers(product)[0] || {href:'#', monetized:false, merchant:null, price_czk:null, raw:null};
  },

  rawBundleDealOffers(deal) {
    if (!deal) return [];
    const offers = Array.isArray(deal.offers) && deal.offers.length
      ? deal.offers
      : [{
          merchant: deal.merchant,
          price_czk: deal.price_czk,
          availability: deal.availability,
          source_url: deal.source_url,
          verified_at: deal.verified_at
        }];
    return offers
      .filter(o => o && o.merchant)
      .sort((a,b) => {
        // Display independently current retailer quotes first. A cheaper
        // unverified/expired snapshot must never become the default merchant.
        const matcher=window.SolarExpertProductMatcher;
        const aFresh=matcher && matcher.verificationState(a.verified_at)==='fresh' ? 1 : 0;
        const bFresh=matcher && matcher.verificationState(b.verified_at)==='fresh' ? 1 : 0;
        if(aFresh!==bFresh)return bFresh-aFresh;
        const aStock = a.availability === 'in_stock' ? 1 : 0;
        const bStock = b.availability === 'in_stock' ? 1 : 0;
        if (aStock !== bStock) return bStock - aStock;
        const ap = Number(a.price_czk || Number.MAX_SAFE_INTEGER);
        const bp = Number(b.price_czk || Number.MAX_SAFE_INTEGER);
        return ap - bp;
      });
  },

  resolveBundleDealOffer(deal, offer) {
    if (!deal || !offer) return {href:'#', monetized:false, merchant:null, merchantId:null, price_czk:null, raw:null};
    const explicitOffers=Array.isArray(deal.offers)&&deal.offers.length>0;
    const sourceBacked=this.hasQuoteEvidence(offer,explicitOffers);
    const target=explicitOffers
      ? (sourceBacked?offer.source_url:null)
      : (offer.source_url||(offer.merchant===deal.merchant?deal.source_url:null));
    const generated = this.merchantDeepLink(offer.merchant, target);
    const link = this.selectMerchantLink([
      {href:generated,monetized:true},
      {href:target,monetized:false}
    ]);
    const verifiedAt = offer.verified_at || null; // Exact merchant evidence only; never borrow another shop's date.
    const freshness = window.SolarExpertProductMatcher
      ? window.SolarExpertProductMatcher.verificationState(verifiedAt)
      : 'unknown';
    const quoteFreshness=sourceBacked?freshness:'unknown';
    // A bundle's overall saving is computed for its cheapest verified
    // merchant. Each other merchant needs its OWN price-specific saving.
    // Never inherit a saving from a missing/stale/ineligible selected offer.
    const selected = deal.effective_offer;
    const bestPrice=Number(deal.price_czk);
    const matcher=window.SolarExpertProductMatcher;
    const eligibleBest=selected && selected.availability==='in_stock' &&
      matcher && matcher.verificationState(selected.verified_at)==='fresh' &&
      Number(selected.price_czk)===bestPrice && Number.isFinite(bestPrice) && bestPrice>0;
    const currentPrice=quoteFreshness==='fresh' && offer.availability==='in_stock' &&
      Number.isFinite(Number(offer.price_czk)) && Number(offer.price_czk)>0
      ? Number(offer.price_czk):null;
    const savingForSeller=baselineSaving=>{
      const original=Number(baselineSaving);
      if (!eligibleBest || currentPrice===null || !Number.isFinite(original) || original<=0) return null;
      const actualSaving=Math.round(bestPrice+original-currentPrice);
      return actualSaving>0?actualSaving:null;
    };
    return {
      href: link.href,
      monetized: link.monetized,
      merchant: this.merchants[offer.merchant] || {label:offer.merchant, approved:false},
      merchantId: offer.merchant || null,
      price_czk: quoteFreshness === 'fresh' ? (Number(offer.price_czk || 0) || null) : null,
      // A parent deal listing cannot prove this row's price or stock.
      availability: quoteFreshness === 'fresh' ? (offer.availability || 'unverified') : 'unverified',
      verified_at: verifiedAt,
      price_freshness: quoteFreshness,
      savings_czk: savingForSeller(deal.savings_czk),
      bank_savings_czk: savingForSeller(deal.bankSavingsCzk ?? deal.savings_czk),
      extra_battery_units: Number(deal.extraBatteryUnits || 0),
      raw: offer
    };
  },

  bundleDealOffers(deal) {
    const resolved = this.prioritizeActionableOffers(
      this.rawBundleDealOffers(deal).map(offer => this.resolveBundleDealOffer(deal, offer))
        .filter(o=>this.isActionableMerchantHref(o.href))
    );
    const freshInStockPrices = resolved
      .filter(o => o.availability === 'in_stock' && Number.isFinite(Number(o.price_czk)) && Number(o.price_czk) > 0)
      .map(o => Number(o.price_czk));
    if (freshInStockPrices.length < 2) return resolved.map(o=>({...o,is_best_price:false,savings_vs_next_czk:null}));
    const minPrice = Math.min(...freshInStockPrices);
    const higherPrices = freshInStockPrices.filter(price => price > minPrice);
    if (!higherPrices.length) return resolved.map(o=>({...o,is_best_price:false,savings_vs_next_czk:null}));
    const nextPrice = Math.min(...higherPrices);
    return resolved.map(o => ({
      ...o,
      is_best_price: o.availability === 'in_stock' && Number(o.price_czk) === minPrice,
      savings_vs_next_czk: o.availability === 'in_stock' && Number(o.price_czk) === minPrice
        ? Math.max(0, Math.round(nextPrice - minPrice))
        : null
    }));
  },

  resolveBundleDeal(deal) {
    return this.bundleDealOffers(deal)[0] || {href:'#', monetized:false, merchant:null, merchantId:null, price_czk:null, raw:null};
  },

  trackBundleDealOffer(deal, offer, placement) {
    const resolved = this.resolveBundleDealOffer(deal, offer);
    if(!this.isActionableMerchantHref(resolved.href))return resolved;
    const detail = {
      dealId: deal?.id || null,
      merchant: resolved.merchantId,
      placement: placement || 'builder-bundle-deal',
      monetized: resolved.monetized,
      hrefType: resolved.monetized ? 'affiliate' : 'source',
      priceCzk: resolved.price_czk,
      savingsCzk: resolved.savings_czk,
      bankSavingsCzk: resolved.bank_savings_czk,
      extraBatteryUnits: resolved.extra_battery_units
    };
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({event:'bundle_deal_click', ...detail});
    }
    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('solar-expert-bundle-deal-click', {detail}));
    }
    return resolved;
  },

  trackBundleDeal(deal, placement) {
    const offer = this.bundleDealOffers(deal)[0]?.raw;
    return offer ? this.trackBundleDealOffer(deal, offer, placement) : this.resolveBundleDeal(deal);
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
    if(!this.isActionableMerchantHref(resolved.href))return resolved;
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
    const offer = this.offers(product)[0]?.raw;
    return offer ? this.trackOffer(product, offer, placement) : this.resolve(product);
  }
};
