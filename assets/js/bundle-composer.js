window.SolarExpertBundleComposer = {
  tierProducts(rows, tier) {
    const exact = rows.filter(r => r.product.tier === tier).map(r => r.product);
    if (exact.length) return exact;
    if (tier === 'best') return rows.map(r => r.product);
    return [];
  },

  controllerLimits(controller, sizing, integrated) {
    if (integrated) {
      const i = controller.integrated_mppt || {};
      if (i.evidence_complete_for_bundle === false || !i.pv_w_max || !i.pv_voc_max) {
        return null;
      }
      return {
        maxWp: Number(i.pv_w_max),
        maxVoc: Number(i.pv_voc_max),
        minVmp: Number(i.mppt_v_min || i.pv_v_min || 0),
        maxVmp: Number(i.mppt_v_max || Infinity),
        maxIsc: Number(i.pv_current_max_a || 0) || null
      };
    }

    const maxWp = Number((controller.max_pv_w_by_voltage || {})[String(sizing.voltage)] || 0);
    const minVmp = Number((controller.min_pv_start_v_by_voltage || {})[String(sizing.voltage)] || 0);
    if (!maxWp || !controller.max_pv_voc_v) return null;

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

    for (const panel of panels) {
      if (!panel.rated_wp || !panel.voc_v || !panel.vmp_v) continue;

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

        if (limits.maxIsc && panel.isc_a) {
          const arrayIsc = parallel * Number(panel.isc_a);
          if (arrayIsc > limits.maxIsc * 0.98) continue;
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
          maxControllerWp: limits.maxWp,
          oversizeWp,
          score
        });
      }
    }

    return candidates.sort((a, b) => a.score - b.score)[0] || null;
  },

  compose(catalog, sizing) {
    const matcher = window.SolarExpertProductMatcher;
    if (!matcher) return [];

    const batteries = matcher.rank(catalog.filter(p => p.type === 'battery'), sizing);
    const inverters = matcher.rank(catalog.filter(p => p.type === 'inverter' || p.type === 'inverter_hybrid'), sizing);
    const mppts = matcher.rank(catalog.filter(p => p.type === 'mppt'), sizing);
    const panels = catalog.filter(p => p.type === 'panel');
    const labels = { budget: 'Budget', best: 'Best Value', premium: 'Premium' };

    return ['budget', 'best', 'premium'].map(tier => {
      const batteryCandidates = this.tierProducts(batteries, tier);
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

      for (const battery of batteryCandidates) {
        for (const inverter of inverterCandidates) {
          const integrated = inverter.type === 'inverter_hybrid' && Boolean(inverter.integrated_mppt);

          if (integrated) {
            const panelPlan = this.findPanelPlan(panels, sizing, inverter, true, tier);
            if (!panelPlan) continue;

            const batteryPrice = matcher.effectivePrice(battery);
            const inverterPrice = matcher.effectivePrice(inverter);
            const panelPrice = matcher.effectivePrice(panelPlan.product);
            const priceParts = [batteryPrice, inverterPrice, panelPrice];
            const priceComplete = priceParts.every(v => Number.isFinite(Number(v)) && Number(v) > 0 && Number(v) < Number.MAX_SAFE_INTEGER);
            const totalPrice = priceComplete
              ? batteryPrice + inverterPrice + panelPrice * panelPlan.count
              : null;

            return {
              tier,
              label: labels[tier],
              complete: true,
              status: 'preliminarily_compatible',
              battery,
              inverter,
              mppt: null,
              integratedMppt: true,
              panel: panelPlan,
              totalPrice,
              priceComplete,
              checksPending: [
                'kabeláž a jištění',
                'přesný teplotní koeficient Voc pro lokalitu',
                'BMS ↔ měnič komunikace',
                'aktuální dostupnost a affiliate URL'
              ]
            };
          }

          const mpptCandidates = this.tierProducts(mppts, tier);
          for (const mppt of mpptCandidates) {
            const panelPlan = this.findPanelPlan(panels, sizing, mppt, false, tier);
            if (!panelPlan) continue;

            const batteryPrice = matcher.effectivePrice(battery);
            const inverterPrice = matcher.effectivePrice(inverter);
            const mpptPrice = matcher.effectivePrice(mppt);
            const panelPrice = matcher.effectivePrice(panelPlan.product);
            const priceParts = [batteryPrice, inverterPrice, mpptPrice, panelPrice];
            const priceComplete = priceParts.every(v => Number.isFinite(Number(v)) && Number(v) > 0 && Number(v) < Number.MAX_SAFE_INTEGER);
            const totalPrice = priceComplete
              ? batteryPrice + inverterPrice + mpptPrice + panelPrice * panelPlan.count
              : null;

            return {
              tier,
              label: labels[tier],
              complete: true,
              status: 'preliminarily_compatible',
              battery,
              inverter,
              mppt,
              integratedMppt: false,
              panel: panelPlan,
              totalPrice,
              priceComplete,
              checksPending: [
                'kabeláž a jištění',
                'přesný teplotní koeficient Voc pro lokalitu',
                'BMS ↔ měnič komunikace',
                'aktuální dostupnost a affiliate URL'
              ]
            };
          }
        }
      }

      return {
        tier,
        label: labels[tier],
        complete: false,
        missing: ['kompatibilní panelové zapojení / MPPT evidence']
      };
    });
  }
};
