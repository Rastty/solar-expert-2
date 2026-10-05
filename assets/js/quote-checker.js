window.solarExpertQuoteChecker=function(){return{
  dailyKwh:2.5,season:'three',autonomy:1,loadW:1200,surgeNeedW:2200,panelWp:1200,batteryKwh:3,inverterW:1500,inverterPeakW:3000,systemVoltage:24,quotePrice:null,
  result:null,checks:[],
  evaluate(){
    const daily=Math.max(0,Number(this.dailyKwh)||0);
    const autonomy=Math.max(.25,Number(this.autonomy)||1);
    const psh=this.season==='summer'?4.2:(this.season==='year'?1.6:2.8);
    const recommendedPanelWp=Math.ceil(((daily*1000)/(psh*.76))/50)*50;
    const recommendedBatteryKwh=Math.ceil(((daily*autonomy)/.85)*10)/10;
    const recommendedInverterW=Math.max(300,Math.ceil(((Number(this.loadW)||0)*1.2)/100)*100);
    const recommendedVoltage=recommendedInverterW<=1000?12:(recommendedInverterW<=2500?24:48);
    const checks=[];
    const push=(key,label,status,message)=>checks.push({key,label,status,message});

    const pv=Number(this.panelWp)||0;
    if(pv<recommendedPanelWp*.9) push('pv','Panely','fail','Nabídka je pod orientačním PV výkonem '+recommendedPanelWp+' Wp pro zadanou spotřebu a sezónu.');
    else if(pv<recommendedPanelWp) push('pv','Panely','warn','PV výkon je těsně pod orientačním cílem '+recommendedPanelWp+' Wp. Ověřte lokalitu a sklon.');
    else push('pv','Panely','pass','PV výkon dosahuje orientačního cíle '+recommendedPanelWp+' Wp.');

    const battery=Number(this.batteryKwh)||0;
    const usable=battery*.85;
    const targetUsable=daily*autonomy;
    if(usable<targetUsable*.9) push('battery','Baterie','fail','Při 85% využitelnosti vychází asi '+usable.toFixed(1)+' kWh, cíl je přibližně '+targetUsable.toFixed(1)+' kWh.');
    else if(usable<targetUsable) push('battery','Baterie','warn','Kapacita je na hraně cílové autonomie. Ověřte reálnou DoD a zimní rezervu.');
    else push('battery','Baterie','pass','Orientační využitelná kapacita pokrývá zadanou autonomii.');

    const load=Math.max(0,Number(this.loadW)||0);
    const inverter=Math.max(0,Number(this.inverterW)||0);
    if(inverter<load) push('inverter','Měnič – trvalý výkon','fail','Trvalý výkon měniče je nižší než zadaný souběžný odběr.');
    else if(inverter<recommendedInverterW) push('inverter','Měnič – trvalý výkon','warn','Měnič pokryje odběr, ale má menší rezervu než orientačních 20 %.');
    else push('inverter','Měnič – trvalý výkon','pass','Trvalý výkon má alespoň orientační 20% rezervu.');

    const surgeNeed=Math.max(0,Number(this.surgeNeedW)||0);
    const inverterPeak=Math.max(0,Number(this.inverterPeakW)||0);
    if(surgeNeed>0 && inverterPeak===0) push('surge','Měnič – rozběh','warn','Chybí údaj o špičkovém výkonu měniče. Ověřte jej v datasheetu.');
    else if(surgeNeed>0 && inverterPeak<surgeNeed) push('surge','Měnič – rozběh','fail','Deklarovaná špička měniče nepokrývá zadanou rozběhovou špičku spotřebičů.');
    else if(surgeNeed>0) push('surge','Měnič – rozběh','pass','Deklarovaná špička měniče pokrývá zadaný rozběh.');
    else push('surge','Měnič – rozběh','warn','Rozběhová špička nebyla zadána; u čerpadel a motorů ji ověřte.');

    const voltage=Number(this.systemVoltage)||0;
    if(voltage<recommendedVoltage) push('voltage','Systémové napětí','warn','Pro tento výkon bychom prověřili spíš '+recommendedVoltage+' V kvůli proudům a ztrátám.');
    else push('voltage','Systémové napětí','pass','Systémové napětí odpovídá orientační výkonové třídě.');

    if(Number(this.quotePrice)>0) push('price','Cena','info','Cena '+Number(this.quotePrice).toLocaleString('cs-CZ')+' Kč je zaznamenána, ale bez aktuálního benchmark koše ji zatím nehodnotíme.');

    const status=checks.some(c=>c.status==='fail')?'fail':(checks.some(c=>c.status==='warn')?'warn':'pass');
    this.checks=checks;
    this.result={status,recommendedPanelWp,recommendedBatteryKwh,recommendedInverterW,recommendedVoltage};
    if(Array.isArray(window.dataLayer)) window.dataLayer.push({event:'quote_checker_complete',status,recommendedPanelWp,recommendedBatteryKwh,recommendedInverterW,recommendedVoltage});
  },
  reset(){this.result=null;this.checks=[];}
};};
