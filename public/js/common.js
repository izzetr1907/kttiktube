
(function(){
  const key='kttiktube-theme';
  const saved=localStorage.getItem(key)||'dark';
  document.documentElement.setAttribute('data-theme',saved);
  const btn=document.getElementById('themeToggle');
  if(btn) btn.addEventListener('click',()=>{
    const next=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme',next);
    localStorage.setItem(key,next);
  });
  function visitorId(){
    let id=localStorage.getItem('kttiktube-vid');
    if(!id){ id='v_'+Math.random().toString(36).slice(2)+Date.now().toString(36); localStorage.setItem('kttiktube-vid',id); }
    return id;
  }
  window.KTT={
    visitorId,
    escape(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
    timeAgo(iso){
      const d=new Date(iso); const sec=Math.floor((Date.now()-d.getTime())/1000);
      if(sec<60) return 'az önce';
      if(sec<3600) return Math.floor(sec/60)+' dakika önce';
      if(sec<86400) return Math.floor(sec/3600)+' saat önce';
      if(sec<2592000) return Math.floor(sec/86400)+' gün önce';
      return d.toLocaleDateString('tr-TR');
    },
    initial(name){ return (name||'?').trim().charAt(0).toUpperCase(); }
  };
})();
