
const { v4: uuidv4 } = require('uuid');

function seed(db) {
  const countRow = db.prepare('SELECT COUNT(*) AS c FROM videos').get();
  const count = countRow ? countRow.c : 0;
  if (count > 0) {
    console.log('Zaten', count, 'video var, seed atlandı.');
    return count;
  }
  const seeds = [
    ['Big Buck Bunny — Blender Açık Film', "Blender Foundation'ın ücretsiz açık kaynak animasyon filmi.", 'Blender Foundation', null, 'https://media.w3.org/2010/05/bunny/trailer.mp4', '/thumbnails/bunny.jpg', 1284500, 42000, 310],
    ['Sintel — Trailer', "Blender Foundation'ın epik kısa filmi Sintel'in fragmanı.", 'Blender Foundation', null, 'https://media.w3.org/2010/05/sintel/trailer.mp4', '/thumbnails/sintel.jpg', 892300, 31000, 180],
    ['Big Buck Bunny (Tam Film — W3C)', "Big Buck Bunny'nin tam uzunluk sürümü.", 'W3C Media', null, 'https://media.w3.org/2010/05/bunny/movie.mp4', '/thumbnails/bbb-card.jpg', 2450000, 88000, 520],
    ['Elephants Dream — Blender Open Movie', 'Dünyanın ilk açık film projesi.', 'Orange Open Movie', null, 'https://archive.org/download/ElephantsDream/ed_hd.mp4', '/thumbnails/elephants.jpg', 654200, 19500, 240],
    ['Tears of Steel — Blender Açık Film', 'Canlı çekim + CGI bilimkurgu kısa filmi.', 'Blender Mango', null, 'https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4', '/thumbnails/tears.jpg', 1100200, 37500, 410],
    ['Spring — Blender Open Movie Fragmanı', 'Blender açık film örnek videosu.', 'Blender Studio', null, 'https://media.w3.org/2010/05/sintel/trailer.mp4', '/thumbnails/spring.jpg', 523100, 22100, 95]
  ];
  const comments = [
    ['Harika bir film, Blender efsane!', 'Ayşe'],
    ['Açık kaynak sinemanın gücü 🔥', 'Mehmet'],
    ['Çocukken izlemiştim, nostalji...', 'Zeynep'],
    ['Kalite hâlâ çok iyi görünüyor.', 'Can'],
    ["İzzet'in kanalında bunları görmek güzel!", 'Elif']
  ];
  const insert = db.prepare(`INSERT INTO videos (id, title, description, channel_name, filename, video_url, thumbnail, views, likes, dislikes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const cIns = db.prepare(`INSERT INTO comments (id, video_id, author, text, created_at) VALUES (?, ?, ?, ?, ?)`);
  const now = Date.now();
  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i];
    const id = uuidv4();
    insert.run(id, s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], s[8], new Date(now - i * 86400000 * 3).toISOString());
    for (let j = 0; j < 3; j++) {
      const c = comments[(i + j) % comments.length];
      cIns.run(uuidv4(), id, c[1], c[0], new Date(now - j * 3600000).toISOString());
    }
  }
  console.log('Seed tamam:', seeds.length, 'video eklendi.');
  return seeds.length;
}
module.exports = seed;
