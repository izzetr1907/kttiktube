
(function(){
  const drop=document.getElementById('dropzone');
  const input=document.getElementById('fileInput');
  const fileName=document.getElementById('fileName');
  const form=document.getElementById('uploadForm');
  const progress=document.getElementById('progress');
  const bar=progress.querySelector('span');
  const status=document.getElementById('status');
  let file=null;
  drop.addEventListener('click',()=>input.click());
  drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag');});
  drop.addEventListener('dragleave',()=>drop.classList.remove('drag'));
  drop.addEventListener('drop',e=>{
    e.preventDefault(); drop.classList.remove('drag');
    if(e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change',()=>{ if(input.files[0]) setFile(input.files[0]); });
  function setFile(f){
    file=f; fileName.textContent=f.name+' ('+Math.round(f.size/1024/1024*10)/10+' MB)';
    const t=document.getElementById('title');
    if(!t.value) t.value=f.name.replace(/\.[^.]+$/,'');
  }
  form.addEventListener('submit',e=>{
    e.preventDefault();
    if(!file){ status.textContent='Lütfen bir video seç.'; return; }
    const fd=new FormData();
    fd.append('video',file);
    fd.append('title',document.getElementById('title').value);
    fd.append('description',document.getElementById('description').value);
    fd.append('channel_name',document.getElementById('channel_name').value||'İzzet');
    progress.style.display='block'; bar.style.width='0%'; status.textContent='Yükleniyor…';
    const xhr=new XMLHttpRequest();
    xhr.open('POST','/api/upload');
    xhr.upload.onprogress=ev=>{
      if(ev.lengthComputable) bar.style.width=Math.round(ev.loaded/ev.total*100)+'%';
    };
    xhr.onload=()=>{
      try{
        const j=JSON.parse(xhr.responseText);
        if(xhr.status>=200&&xhr.status<300){
          status.textContent='Yüklendi! Yönlendiriliyor…';
          location.href='/watch?v='+encodeURIComponent(j.id);
        } else status.textContent=j.error||'Hata';
      }catch(_){ status.textContent='Beklenmeyen yanıt'; }
    };
    xhr.onerror=()=>{ status.textContent='Ağ hatası'; };
    xhr.send(fd);
  });
})();
