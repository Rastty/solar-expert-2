window.SolarExpertBundleComposer = {
  tierProducts(rows, tier) {
    const exact = rows.filter(r => r.product.tier === tier).map(r => r.product);
    if (exact.length) return exact;
    if (tier === 'best') return rows.map(r => r.product);
    return [];
  },

  batteryInverterCompatible(battery, inverter) {
    const chemistry = String((battery && battery.chemistry) || '').toLowerCase();
    if (
      inverter &&
      inverter.lifepo4_charge_supported === false &&
      chemistry.includes('lifepo4')
    ) {
      return false;
    }
    return true;
  },

  batteryBankCandidatesAll(products, sizing) {
    const matcher = window.SolarExpertProductMatcher;
    const all = [];

    for (const product of products) {
      if (!product || product.type !== 'battery') continue;
      if (Number(product.system_voltage_class) !== Number(sizing.voltage)) continue;
      if (!product.max_discharge_a || !product.energy_wh) continue;
      if (matcher && matcher.availabilityRank(product) <= 0) continue;

      const maxUnits = Math.max(1, Number(product.parallel_max_units || 1));
      const unitPrice = matcher ? matcher.effectivePrice(product) : Number(product.price_czk || Number.MAX_SAFE_INTEGER);

      for (let quantity = 1; quantity <= maxUnits; quantity++) {
        const totalEnergyWh = Number(product.energy_wh) * quantity;
        const totalDischargeA = Number(product.max_discharge_a) * quantity;
        const dischargePowerW = Number(product.system_voltage_class) * totalDischargeA;

        if (totalEnergyWh < Number(sizing.batteryKwh) * 1000) continue;
        if (dischargePowerW < Number(sizing.inverterW)) continue;

        all.push({
          product,
          quantity,
          totalEnergyWh,
          totalDischargeA,
          dischargePowerW,
          unitPrice,
          totalPrice: unitPrice * quantity
        });
        break;
      }
    }

    return all.sort((a,b) => {
      if (a.totalPrice !== b.totalPrice) return a.totalPrice - b.totalPrice;
      return a.quantity - b.quantity;
    });
  },

  batteryBankCandidates(products, sizing, tier) {
    const all = this.batteryBankCandidatesAll(products, sizing);
    const exact = all.filter(x => x.product.tier === tier);
    return exact.length ? exact : (tier === 'best' ? all : []);
  },

  controllerLimits(controller, sizing, integrated) {
    if (integrated) {
      const i = controller.integrated_mppt || {};
      // Integrated PV input current is not BATTERY charging current.
      // SPF 6000 ES Plus has TWO independent trackers and ONE input string
      // per tracker: never sum both 16A inputs into a mythical 32A port.
      const trackerCount=Number(i.pv_tracker_count || 0);
      const stringsPerTracker=Number(i.pv_strings_per_tracker || 0);
      const operatingA=Number(i.pv_input_operating_a_per_tracker || 0);
      const perTrackerWp=Number(i.pv_w_max_per_tracker || 0);
      if (i.evidence_complete_for_bundle === false || !i.pv_w_max || !i.pv_voc_max ||
          !Number.isInteger(trackerCount) || trackerCount<1 ||
          !Number.isInteger(stringsPerTracker) || stringsPerTracker<1 ||
          !(operatingA>0) || !(perTrackerWp>0) ||
          !i.pv_operating_current_source_url) return null;
      const verifiedAbsoluteIsc=Number(i.pv_isc_absolute_limit_a || 0);
      const pvIscVerified=i.pv_isc_absolute_status === 'verified' && verifiedAbsoluteIsc>0;
      return {
        maxWp: Number(i.pv_w_max),
        maxVoc: Number(i.pv_voc_max),
        minVmp: Number(i.mppt_v_min || i.pv_v_min || 0),
        maxVmp: Number(i.mppt_v_max || Infinity),
        maxIsc: pvIscVerified ? verifiedAbsoluteIsc : null,
        pvIscVerified,
        trackerCount,
        stringsPerTracker,
        perTrackerWp,
        operatingA
      };
    }

    const maxWp = Number((controller.max_pv_w_by_voltage || {})[String(sizing.voltage)] || 0);
    const minVmp = Number((controller.min_pv_start_v_by_voltage || {})[String(sizing.voltage)] || 0);
    // Independent MPPT may only be matched with manufacturer-documented
    // short-circuit input current. Unknown limit is not a verified fit.
    if (!maxWp || !controller.max_pv_voc_v || !(Number(controller.max_pv_isc_a)>0)) return null;

    return {
      maxWp,
      maxVoc: Number(controller.max_pv_voc_v),
      minVmp,
      maxVmp: Infinity,
      maxIsc: Number(controller.max_pv_isc_a || 0) || null
    };
  },

  findPanelPlan(panels, sizing, controller, integrated, tier) {
    const limits = this.controllerLimits(controller, sizing, integrated);
    if (!limits) return null;

    const candidates = [];

    const matcher = window.SolarExpertProductMatcher;

    for (const panel of panels) {
      if (!panel.rated_wp || !panel.voc_v || !panel.vmp_v) continue;
      if (matcher && matcher.availabilityRank(panel) <= 0) continue;

      const coldFactor = Number(panel.cold_voc_factor || 1.12);
      const coldVocPerPanel = Number(panel.voc_v) * coldFactor;
      const minSeries = Math.max(1, Math.ceil(limits.minVmp / Number(panel.vmp_v)));
      const maxSeriesByVoc = Math.floor((limits.maxVoc * 0.98) / coldVocPerPanel);
      const maxSeriesByVmp = Number.isFinite(limits.maxVmp)
        ? Math.floor(limits.maxVmp / Number(panel.vmp_v))
        : Number.MAX_SAFE_INTEGER;
      const maxSeries = Math.min(maxSeriesByVoc, maxSeriesByVmp);

      if (maxSeries < minSeries || maxSeries < 1) continue;

      const requiredCount = Math.max(1, Math.ceil(Number(sizing.panelWp) / Number(panel.rated_wp)));

      for (let series = minSeries; series <= maxSeries; series++) {
        const parallel = Math.max(1, Math.ceil(requiredCount / series));
        const count = series * parallel;
        const totalWp = count * Number(panel.rated_wp);

        if (totalWp < Number(sizing.panelWp) || totalWp > limits.maxWp) continue;

        // A missing panel Isc is not a safe current match. Standalone
        // regulators require BOTH verified panel Isc and controller max Isc.
        // Integrated inverter input limits are tracked separately: do not
        // reinterpret its MPPT battery charge current as PV input Isc.
        if (!integrated && !(Number(panel.isc_a)>0)) continue;
        let iscPerTracker=null;
        let trackerStringCounts=null;
        if(integrated){
          if(!(Number(panel.isc_a)>0) || !Number.isFinite(Number(panel.isc_a))) continue;
          if(parallel>limits.trackerCount*limits.stringsPerTracker) continue;
          trackerStringCounts=Array.from({length:limits.trackerCount},(_,index)=>
            Math.floor(parallel/limits.trackerCount)+(index<(parallel%limits.trackerCount)?1:0));
          const mostStrings=Math.max(...trackerStringCounts);
          iscPerTracker=mostStrings*Number(panel.isc_a);
          const wpPerTracker=mostStrings*series*Number(panel.rated_wp);
          if(!(iscPerTracker>0) || iscPerTracker>limits.operatingA*0.98 ||
              wpPerTracker>limits.perTrackerWp)continue;
          // This is only a conservative OPERATING input screen; an absolute
          // Isc limit must be independently sourced to authorize buying.
          if(limits.maxIsc && iscPerTracker>limits.maxIsc*0.98)continue;
        }else if(limits.maxIsc){
          const arrayIsc=parallel*Number(panel.isc_a || 0);
          if(!(arrayIsc>0) || arrayIsc>limits.maxIsc*0.98)continue;
        }

        const stringVmp = series * Number(panel.vmp_v);
        const coldStringVoc = series * coldVocPerPanel;

        if (stringVmp < limits.minVmp) continue;
        if (Number.isFinite(limits.maxVmp) && stringVmp > limits.maxVmp) continue;
        if (coldStringVoc >= limits.maxVoc * 0.98) continue;

        const tierPenalty = panel.tier === tier ? 0 : (panel.tier === 'best' ? 8 : 14);
        const oversizeWp = totalWp - Number(sizing.panelWp);
        const score = tierPenalty + (oversizeWp / Math.max(1, Number(sizing.panelWp))) * 100 + count * 0.05;

        candidates.push({
          product: panel,
          count,
          series,
          parallel,
          topology: series + 'S' + parallel + 'P',
          totalWp,
          stringVmp: Math.round(stringVmp * 10) / 10,
          coldStringVoc: Math.round(coldStringVoc * 10) / 10,
          pvIscVerified: integrated ? limits.pvIscVerified : true,
          iscPerTracker,
          trackerStringCounts,
          maxControllerWp: limits.maxWp,
          oversizeWp,
          score
        });
      }
    }

    return candidates.sort((a, b) => a.score - b.score)[0] || null;
  },

  findBundleDeal(bundleDeals, componentIds, separatePrice) {
    const ids = [...componentIds].sort();
    const matcher = window.SolarExpertProductMatcher;
    const candidates = (Array.isArray(bundleDeals) ? bundleDeals : [])
      .map(deal => {
        if (!deal || !Array.isArray(deal.components)) return null;
        const dealIds = [...deal.components].sort();
        if (dealIds.length !== ids.length || dealIds.some((id,i)=>id!==ids[i])) return null;

        const offers = Array.isArray(deal.offers) && deal.offers.length
          ? deal.offers
          : [{
              merchant:deal.merchant,
              price_czk:deal.price_czk,
              availability:deal.availability,
              verified_at:deal.verified_at,
              source_url:deal.source_url
            }];
        const validOffers = offers
          .filter(o => o && o.availability === 'in_stock')
          .filter(o => matcher && matcher.hasSellerSource(o))
          .filter(o => matcher && matcher.verificationState(o.verified_at) === 'fresh')
          .filter(o => Number.isFinite(Number(o.price_czk)) && Number(o.price_czk) > 0)
          .sort((a,b)=>Number(a.price_czk)-Number(b.price_czk));
        const bestOffer = validOffers[0] || null;
        if (!bestOffer || Number(bestOffer.price_czk) >= Number(separatePrice)) return null;
        return {
          ...deal,
          price_czk:Number(bestOffer.price_czk),
          availability:bestOffer.availability,
          effective_offer:bestOffer
        };
      })
      .filter(Boolean)
      .sort((a,b)=>Number(a.price_czk)-Number(b.price_czk));
    const deal = candidates[0] || null;
    if (!deal) return null;
    return {
      ...deal,
      savings_czk: Math.max(0, Math.round(Number(separatePrice)-Number(deal.price_czk)))
    };
  },

  compose(catalog, sizing, bundleDeals=[]) {
    const matcher = window.SolarExpertProductMatcher;
    if (!matcher) return [];

    const batteryProducts = catalog.filter(p => p.type === 'battery');
    const inverters = matcher.rank(catalog.filter(p => p.type === 'inverter' || p.type === 'inverter_hybrid'), sizing);
    const mppts = matcher.rank(catalog.filter(p => p.type === 'mppt'), sizing);
    const panels = catalog.filter(p => p.type === 'panel');
    const labels = { budget: 'Budget', best: 'Best Value', premium: 'Premium' };

    return ['budget', 'best', 'premium'].map(tier => {
      // Preserve a technically valid fallback, but keep searching for a
      // fully quoted, purchase-actionable combination within this tier.
      // A first compatible product with an expired/missing seller quote must
      // not hide a later source-backed purchase path.
      let fallback=null;
      const batteryCandidates = this.batteryBankCandidates(batteryProducts, sizing, tier);
      const inverterCandidates = this.tierProducts(inverters, tier);

      if (!batteryCandidates.length || !inverterCandidates.length) {
        return {
          tier,
          label: labels[tier],
          complete: false,
          missing: [
            !batteryCandidates.length ? 'baterie' : null,
            !inverterCandidates.length ? 'měnič' : null
          ].filter(Boolean)
        };
      }

      for (const batteryBank of batteryCandidates) {
        const battery = batteryBank.product;
        for (const inverter of inverterCandidates) {
          if (!this.batteryInverterCompatible(battery, inverter)) continue;
          const integrated = inverter.type === 'inverter_hybrid' && Boolean(inverter.integrated_mppt);

          if (integrated) {
            const panelPlan = this.findPanelPlan(panels, sizing, inverter, true, tier);
            if (!panelPlan) continue;

            const batteryPrice = batteryBank.totalPrice;
            const inverterPrice = matcher.effectivePrice(inverter);
            const panelPrice = matcher.effectivePrice(panelPlan.product);
            const priceParts = [batteryPrice, inverterPrice, panelPrice];
            const priceComplete = priceParts.every(v => Number.isFinite(Number(v)) && Number(v) > 0 && Number(v) < Number.MAX_SAFE_INTEGER);
            const separateCorePrice = batteryPrice + inverterPrice;
            const bundleDeal = priceComplete
              ? this.findBundleDeal(bundleDeals, [battery.id, inverter.id], batteryBank.unitPrice + inverterPrice)
              : null;
            if (bundleDeal) {
              bundleDeal.extraBatteryUnits = Math.max(0, batteryBank.quantity - 1);
              bundleDeal.bankSavingsCzk = Math.max(
                0,
                Math.round(separateCorePrice - (Number(bundleDeal.price_czk) + batteryBank.unitPrice * bundleDeal.extraBatteryUnits))
              );
            }
            const effectiveCorePrice = bundleDeal
              ? Number(bundleDeal.price_czk) + batteryBank.unitPrice * bundleDeal.extraBatteryUnits
              : separateCorePrice;
            const totalPrice = priceComplete
              ? effectiveCorePrice + panelPrice * panelPlan.count
              : null;

            const candidate = {
              tier,
              label: labels[tier],
              complete: true,
              status: panelPlan.pvIscVerified ? 'preliminarily_compatible' : 'pv_isc_limit_unverified',
              pvIscVerified: panelPlan.pvIscVerified,
              battery,
              batteryQuantity: batteryBank.quantity,
              batteryBank,
              inverter,
              mppt: null,
              integratedMppt: true,
              panel: panelPlan,
              totalPrice,
              priceComplete,
              bundleDeal,
              checksPending: [
                'kabeláž a jištění',
                'přesný teplotní koeficient Voc pro lokalitu',
                'BMS ↔ měnič komunikace',
                ...(batteryBank.quantity > 1 ? ['paralelní bateriové propojení / sběrnice a jištění každé větve'] : []),
                'aktuální dostupnost a affiliate URL',
                ...(!panelPlan.pvIscVerified ? ['Absolutní PV Isc limit konkrétní revize integrovaného MPPT není doložen: nákup této sestavy je pozastaven.'] : [])
              ]
            };
            // A quoted integrated bundle with no verified absolute PV Isc
            // is *not* purchase ready; continue to safer alternatives.
            if(candidate.priceComplete && candidate.pvIscVerified===true)return candidate;
            if(!fallback)fallback=candidate;
          }

          const mpptCandidates = this.tierProducts(mppts, tier);
          for (const mppt of mpptCandidates) {
            const panelPlan = this.findPanelPlan(panels, sizing, mppt, false, tier);
            if (!panelPlan) continue;

            const batteryPrice = batteryBank.totalPrice;
            const inverterPrice = matcher.effectivePrice(inverter);
            const mpptPrice = matcher.effectivePrice(mppt);
            const panelPrice = matcher.effectivePrice(panelPlan.product);
            const priceParts = [batteryPrice, inverterPrice, mpptPrice, panelPrice];
            const priceComplete = priceParts.every(v => Number.isFinite(Number(v)) && Number(v) > 0 && Number(v) < Number.MAX_SAFE_INTEGER);
            const separateCorePrice = batteryPrice + inverterPrice;
            const bundleDeal = priceComplete
              ? this.findBundleDeal(bundleDeals, [battery.id, inverter.id], batteryBank.unitPrice + inverterPrice)
              : null;
            if (bundleDeal) {
              bundleDeal.extraBatteryUnits = Math.max(0, batteryBank.quantity - 1);
              bundleDeal.bankSavingsCzk = Math.max(
                0,
                Math.round(separateCorePrice - (Number(bundleDeal.price_czk) + batteryBank.unitPrice * bundleDeal.extraBatteryUnits))
              );
            }
            const effectiveCorePrice = bundleDeal
              ? Number(bundleDeal.price_czk) + batteryBank.unitPrice * bundleDeal.extraBatteryUnits
              : separateCorePrice;
            const totalPrice = priceComplete
              ? effectiveCorePrice + mpptPrice + panelPrice * panelPlan.count
              : null;

            const candidate = {
              tier,
              label: labels[tier],
              complete: true,
              status: 'preliminarily_compatible',
              battery,
              batteryQuantity: batteryBank.quantity,
              batteryBank,
              inverter,
              mppt,
              integratedMppt: false,
              panel: panelPlan,
              totalPrice,
              priceComplete,
              bundleDeal,
              checksPending: [
                'kabeláž a jištění',
                'přesný teplotní koeficient Voc pro lokalitu',
                'BMS ↔ měnič komunikace',
                ...(batteryBank.quantity > 1 ? ['paralelní bateriové propojení / sběrnice a jištění každé větve'] : []),
                'aktuální dostupnost a affiliate URL'
              ]
            };
            if(candidate.priceComplete)return candidate;
            // Unlike an Isc-unverified hybrid, this standalone MPPT path
            // passed the source-backed independent PV input safety screen.
            if(!fallback || (fallback.integratedMppt && fallback.pvIscVerified!==true))fallback=candidate;
          }
        }
      }

      if(fallback)return fallback;
      return {
        tier,
        label: labels[tier],
        complete: false,
        missing: ['kompatibilní panelové zapojení / MPPT evidence']
      };
    });
  }
};
