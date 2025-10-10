import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = Number(process.env.PORT || 5174);
const ROOT = path.resolve(process.cwd(), 'local_media');

const tmpDir = path.join(ROOT, '_tmp');
fs.mkdirSync(tmpDir, { recursive: true });
const upload = multer({ dest: tmpDir });

// Static serving
app.use('/media', express.static(ROOT, { maxAge: '1h', etag: true }));

// Upload endpoint
app.post('/media/upload', upload.single('file'), (req, res) => {
  try {
    const original = req.file?.originalname || req.file?.filename || 'file.bin';
    // The originalname may contain our desired key path, e.g. uploads/userId/name
    const key = original.replace(/^\/+/, '');
    const dest = path.join(ROOT, key);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(req.file!.path, dest);
    res.json({ key, url: `/media/${key}` });
  } catch (e: any) {
    console.error('Upload error:', e);
    res.status(500).json({ error: e?.message || 'upload failed' });
  }
});

// Delete endpoint
app.delete('/media/*', (req, res) => {
  const key = (req.params[0] || '').replace(/^\/+/, '');
  const dest = path.join(ROOT, key);
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
  res.sendStatus(204);
});

app.listen(PORT, () => {
  console.log(`Local media server on http://localhost:${PORT}`);
});


