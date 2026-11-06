
(async function(){
  const params=new URLSearchParams(location.search);
  const q=params.get('q')||'';
  const input=document.getElementById('searchInput');
  if(input) input.value=q;
  const title=document.getElementById('pageTitle');
  if(title) title.textContent=q?`“${q}” için arama sonuçları`:'Önerilen videolar';
  const grid=document.getElementById('grid');
  const empty=document.getElementById('empty');
  try{
    const res=await fetch('/api/videos'+(q?('?q='+encodeURIComponent(q)):''));
    const videos=await res.json();
    if(!videos.length){ empty.hidden=false; return; }
    grid.innerHTML=videos.map(v=>`
      <a class="video-card" href="/watch?v=${encodeURIComponent(v.id)}">
        <div class="thumb-wrap"><img src="${KTT.escape(v.thumbnail)}" alt="" loading="lazy"/></div>
        <div class="card-meta">
          <div class="avatar">${KTT.escape(KTT.initial(v.channel_name))}</div>
          <div class="card-text">
            <h3>${KTT.escape(v.title)}</h3>
            <p class="channel">${KTT.escape(v.channel_name)}</p>
            <p class="stats">${KTT.escape(v.views_label)} • ${KTT.timeAgo(v.created_at)}</p>
          </div>
        </div>
      </a>`).join('');
  }catch(e){
    empty.hidden=false; empty.textContent='Videolar yüklenemedi.';
  }
})();
