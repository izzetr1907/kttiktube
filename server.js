
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { initDb } = require('./db');
const seed = require('./seed');

const PORT = process.env.PORT || 3847;
const uploadsDir = path.join(__dirname, 'uploads');
const thumbsDir = path.join(__dirname, 'thumbnails');
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(thumbsDir, { recursive: true });

function formatViews(n) {
  n = Number(n) || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + ' Mn';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + ' B';
  return String(n);
}

function videoPayload(row) {
  if (!row) return null;
  const src = row.filename ? `/uploads/${row.filename}` : row.video_url;
  return {
    id: row.id, title: row.title, description: row.description,
    channel_name: row.channel_name,
    thumbnail: row.thumbnail || '/img/default-thumb.svg',
    views: row.views, views_label: formatViews(row.views) + ' görüntülenme',
    likes: row.likes, dislikes: row.dislikes, created_at: row.created_at,
    src, is_remote: !row.filename
  };
}

async function main() {
  const db = await initDb();
  seed(db);
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(uploadsDir));
  app.use('/thumbnails', express.static(thumbsDir));
  app.use(express.static(path.join(__dirname, 'public')));

  const storage = multer.diskStorage({
    destination: (_r, _f, cb) => cb(null, uploadsDir),
    filename: (_r, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname) || '.mp4'}`)
  });
  const upload = multer({
    storage, limits: { fileSize: 500 * 1024 * 1024 },
    fileFilter: (_r, file, cb) => {
      if (/^video\//.test(file.mimetype) || /\.(mp4|webm|ogg|mov|mkv)$/i.test(file.originalname)) cb(null, true);
      else cb(new Error('Sadece video dosyaları yüklenebilir'));
    }
  });

  app.get('/api/videos', (req, res) => {
    const q = (req.query.q || '').trim();
    let rows;
    if (q) {
      const like = `%${q}%`;
      rows = db.prepare(`SELECT * FROM videos WHERE title LIKE ? OR description LIKE ? OR channel_name LIKE ? ORDER BY views DESC`).all(like, like, like);
    } else {
      rows = db.prepare('SELECT * FROM videos ORDER BY created_at DESC').all();
    }
    res.json(rows.map(videoPayload));
  });

  app.get('/api/videos/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Video bulunamadı' });
    db.prepare('UPDATE videos SET views = views + 1 WHERE id = ?').run(req.params.id);
    row.views = Number(row.views) + 1;
    const related = db.prepare('SELECT * FROM videos WHERE id != ? ORDER BY RANDOM() LIMIT 8').all(req.params.id).map(videoPayload);
    const comments = db.prepare('SELECT * FROM comments WHERE video_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json({ video: videoPayload(row), related, comments });
  });

  app.post('/api/videos/:id/react', (req, res) => {
    const { type, visitor_id } = req.body || {};
    if (!['like', 'dislike'].includes(type) || !visitor_id) return res.status(400).json({ error: 'Geçersiz istek' });
    const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video bulunamadı' });
    const existing = db.prepare('SELECT * FROM reactions WHERE video_id = ? AND visitor_id = ?').get(req.params.id, visitor_id);
    const tx = db.transaction(() => {
      if (existing) {
        if (existing.type === type) {
          db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id);
          if (type === 'like') db.prepare('UPDATE videos SET likes = CASE WHEN likes > 0 THEN likes - 1 ELSE 0 END WHERE id = ?').run(req.params.id);
          else db.prepare('UPDATE videos SET dislikes = CASE WHEN dislikes > 0 THEN dislikes - 1 ELSE 0 END WHERE id = ?').run(req.params.id);
        } else {
          db.prepare('UPDATE reactions SET type = ? WHERE id = ?').run(type, existing.id);
          if (type === 'like') db.prepare('UPDATE videos SET dislikes = CASE WHEN dislikes > 0 THEN dislikes - 1 ELSE 0 END, likes = likes + 1 WHERE id = ?').run(req.params.id);
          else db.prepare('UPDATE videos SET likes = CASE WHEN likes > 0 THEN likes - 1 ELSE 0 END, dislikes = dislikes + 1 WHERE id = ?').run(req.params.id);
        }
      } else {
        db.prepare('INSERT INTO reactions (video_id, visitor_id, type) VALUES (?, ?, ?)').run(req.params.id, visitor_id, type);
        if (type === 'like') db.prepare('UPDATE videos SET likes = likes + 1 WHERE id = ?').run(req.params.id);
        else db.prepare('UPDATE videos SET dislikes = dislikes + 1 WHERE id = ?').run(req.params.id);
      }
    });
    tx();
    const updated = db.prepare('SELECT likes, dislikes FROM videos WHERE id = ?').get(req.params.id);
    const mine = db.prepare('SELECT type FROM reactions WHERE video_id = ? AND visitor_id = ?').get(req.params.id, visitor_id);
    res.json({ likes: updated.likes, dislikes: updated.dislikes, my_reaction: mine ? mine.type : null });
  });

  app.get('/api/videos/:id/reaction', (req, res) => {
    const visitor = req.query.visitor_id;
    if (!visitor) return res.json({ my_reaction: null });
    const mine = db.prepare('SELECT type FROM reactions WHERE video_id = ? AND visitor_id = ?').get(req.params.id, visitor);
    res.json({ my_reaction: mine ? mine.type : null });
  });

  app.post('/api/videos/:id/comments', (req, res) => {
    const { text, author } = req.body || {};
    if (!text || !String(text).trim()) return res.status(400).json({ error: 'Yorum boş olamaz' });
    if (!db.prepare('SELECT id FROM videos WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Video bulunamadı' });
    const id = uuidv4();
    const created_at = new Date().toISOString();
    const name = (author && String(author).trim()) || 'Misafir';
    const body = String(text).trim();
    db.prepare('INSERT INTO comments (id, video_id, author, text, created_at) VALUES (?, ?, ?, ?, ?)').run(id, req.params.id, name, body, created_at);
    res.status(201).json({ id, video_id: req.params.id, author: name, text: body, created_at });
  });

  app.post('/api/upload', (req, res) => {
    upload.single('video')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Yükleme hatası' });
      try {
        if (!req.file) return res.status(400).json({ error: 'Video dosyası gerekli' });
        const title = (req.body.title || '').trim() || req.file.originalname;
        const description = (req.body.description || '').trim();
        const channel_name = (req.body.channel_name || '').trim() || 'İzzet';
        const id = uuidv4();
        db.prepare(`INSERT INTO videos (id, title, description, channel_name, filename, video_url, thumbnail, views, likes, dislikes, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?, 0, 0, 0, ?)`)
          .run(id, title, description, channel_name, req.file.filename, '/img/default-thumb.svg', new Date().toISOString());
        res.status(201).json({ id, message: 'Video yüklendi' });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message || 'Yükleme başarısız' });
      }
    });
  });

  app.get('/api/health', (_req, res) => {
    const c = db.prepare('SELECT COUNT(*) AS c FROM videos').get();
    res.json({ ok: true, name: 'KttıkTube', videos: c.c });
  });

  app.get('/watch', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'watch.html')));
  app.get('/upload', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'upload.html')));

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Sunucu hatası' });
  });

  app.listen(PORT, '0.0.0.0', () => console.log(`KttıkTube http://0.0.0.0:${PORT}`));
}

main().catch((e) => { console.error(e); process.exit(1); });
