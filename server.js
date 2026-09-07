const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cafevida2026';

const dir = path.join(__dirname, 'uploads');
fs.mkdirSync(dir, { recursive: true });

const imageExt = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: dir,
    filename: (req, file, cb) => {
      const safeName = Date.now() + '-' +
        file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, safeName);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    cb(null, !!imageExt[file.mimetype]);
  }
});

const pdfUpload = multer({
  storage: multer.diskStorage({
    destination: dir,
    filename: (req, file, cb) => {
      cb(null, 'presentacion.pdf');
    }
  }),
  limits: {
    fileSize: 100 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === 'application/pdf' ||
      /\.pdf$/i.test(file.originalname || '');

    if (isPdf) {
      cb(null, true);
    } else {
      cb(new Error('El archivo debe ser un PDF.'));
    }
  }
});

function saveImage(file, base) {
  const ext = imageExt[file.mimetype];
  const dest = path.join(dir, base + '.' + ext);

  for (const e of Object.values(imageExt)) {
    const old = path.join(dir, base + '.' + e);
    if (old !== dest && fs.existsSync(old)) {
      fs.unlinkSync(old);
    }
  }

  fs.renameSync(file.path, dest);
  return dest;
}

function current(base) {
  for (const ext of Object.values(imageExt)) {
    const f = path.join(dir, base + '.' + ext);
    if (fs.existsSync(f)) {
      return f;
    }
  }
  return null;
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/presentacion', (req, res) => {
  const file = path.join(dir, 'presentacion.pdf');

  if (fs.existsSync(file)) {
    res.sendFile(file);
  } else {
    res.status(404).send('La presentación aún no ha sido publicada.');
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});

app.get('/background', (req, res) => {
  const file = current('background');

  if (file) {
    res.sendFile(file);
  } else {
    res.status(404).end();
  }
});

app.get('/logo', (req, res) => {
  const file = current('logo');

  if (file) {
    res.sendFile(file);
  } else {
    res.status(404).end();
  }
});

app.post('/admin/upload', pdfUpload.single('pdf'), (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(401).send('Contraseña incorrecta.');
  }

  if (!req.file) {
    return res.status(400).send('Seleccioná un PDF.');
  }

  res.send('Presentación actualizada correctamente.');
});

app.post('/admin/background', imageUpload.single('image'), (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(401).send('Contraseña incorrecta.');
  }

  if (!req.file) {
    return res.status(400).send('Seleccioná una imagen.');
  }

  saveImage(req.file, 'background');
  res.send('Fondo actualizado correctamente.');
});

app.post('/admin/logo', imageUpload.single('image'), (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(401).send('Contraseña incorrecta.');
  }

  if (!req.file) {
    return res.status(400).send('Seleccioná una imagen.');
  }

  saveImage(req.file, 'logo');
  res.send('Logo actualizado correctamente.');
});

app.use((err, req, res, next) => {
  if (err) {
    console.error('ERROR DE SUBIDA:', err);

    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(400).send(
      'No se pudo subir el archivo: ' + err.message
    );
  }

  next();
});

app.listen(PORT, () => {
  console.log(`Café y Vida corriendo en http://localhost:${PORT}`);
});