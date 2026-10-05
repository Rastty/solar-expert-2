(function(){
  function init(){
    if(!window.SolarExpertAffiliate) return;
    document.querySelectorAll('[data-se-lead-id]').forEach(function(link){
      const id=link.getAttribute('data-se-lead-id');
      const fallback=link.getAttribute('data-se-fallback')||link.getAttribute('href')||'#';
      const placement=link.getAttribute('data-se-placement')||'lead_cta';
      const resolved=window.SolarExpertAffiliate.resolveLead(id,fallback);
      const href=typeof resolved==='string'?resolved:(resolved.href||fallback);
      const monetized=typeof resolved==='object'&&Boolean(resolved.monetized);
      link.setAttribute('href',href);
      if(monetized){
        link.setAttribute('rel','sponsored nofollow noopener');
      }else{
        link.setAttribute('rel','nofollow noopener');
      }
      link.addEventListener('click',function(){
        window.SolarExpertAffiliate.trackLead(id,placement,fallback);
      },{passive:true});
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
