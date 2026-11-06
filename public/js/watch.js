
(async function(){
  const id=new URLSearchParams(location.search).get('v');
  if(!id){ location.href='/'; return; }
  const res=await fetch('/api/videos/'+encodeURIComponent(id));
  if(!res.ok){ document.getElementById('title').textContent='Video bulunamadı'; return; }
  const data=await res.json();
  const v=data.video;
  document.title=v.title+' — KttıkTube';
  document.getElementById('title').textContent=v.title;
  document.getElementById('channel').textContent=v.channel_name;
  document.getElementById('chAvatar').textContent=KTT.initial(v.channel_name);
  document.getElementById('views').textContent=v.views_label+' • '+KTT.timeAgo(v.created_at);
  document.getElementById('desc').textContent=v.description||'Açıklama yok.';
  document.getElementById('likeCount').textContent=v.likes;
  document.getElementById('dislikeCount').textContent=v.dislikes;
  const player=document.getElementById('player');
  player.src=v.src;
  player.poster=v.thumbnail;

  const rRes=await fetch('/api/videos/'+encodeURIComponent(id)+'/reaction?visitor_id='+encodeURIComponent(KTT.visitorId()));
  const rData=await rRes.json();
  function setActive(t){
    document.getElementById('likeBtn').classList.toggle('active', t==='like');
    document.getElementById('dislikeBtn').classList.toggle('active', t==='dislike');
  }
  setActive(rData.my_reaction);

  async function react(type){
    const rr=await fetch('/api/videos/'+encodeURIComponent(id)+'/react',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({type, visitor_id:KTT.visitorId()})
    });
    const j=await rr.json();
    document.getElementById('likeCount').textContent=j.likes;
    document.getElementById('dislikeCount').textContent=j.dislikes;
    setActive(j.my_reaction);
  }
  document.getElementById('likeBtn').onclick=()=>react('like');
  document.getElementById('dislikeBtn').onclick=()=>react('dislike');

  function renderComments(list){
    document.getElementById('commentCount').textContent=list.length+' yorum';
    document.getElementById('comments').innerHTML=list.map(c=>`
      <div class="comment">
        <div class="avatar">${KTT.escape(KTT.initial(c.author))}</div>
        <div class="body">
          <div class="author">${KTT.escape(c.author)}<span class="time">${KTT.timeAgo(c.created_at)}</span></div>
          <p>${KTT.escape(c.text)}</p>
        </div>
      </div>`).join('')||'<p class="empty">Henüz yorum yok. İlk yorumu sen yaz!</p>';
  }
  renderComments(data.comments||[]);

  document.getElementById('commentForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const rr=await fetch('/api/videos/'+encodeURIComponent(id)+'/comments',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({author:fd.get('author'), text:fd.get('text')})
    });
    if(rr.ok){
      const c=await rr.json();
      data.comments.unshift(c);
      renderComments(data.comments);
      e.target.reset();
    }
  });

  document.getElementById('related').innerHTML=(data.related||[]).map(r=>`
    <a class="related-item" href="/watch?v=${encodeURIComponent(r.id)}">
      <div class="rthumb"><img src="${KTT.escape(r.thumbnail)}" alt=""/></div>
      <div>
        <p class="rtitle">${KTT.escape(r.title)}</p>
        <p class="rmeta">${KTT.escape(r.channel_name)}</p>
        <p class="rmeta">${KTT.escape(r.views_label)}</p>
      </div>
    </a>`).join('');
})();
