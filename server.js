const express=require('express'),multer=require('multer'),fs=require('fs'),path=require('path');
const app=express(),PORT=process.env.PORT||3000,ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'cafevida2026';
const dir=path.join(__dirname,'uploads'); fs.mkdirSync(dir,{recursive:true});
const imageExt={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
const imageUpload=multer({storage:multer.diskStorage({destination:dir,filename:(r,f,c)=>c(null,(r.path||'')+'site-image.tmp')}),limits:{fileSize:10*1024*1024},fileFilter:(r,f,c)=>c(null,!!imageExt[f.mimetype])});
const pdfUpload=multer({storage:multer.diskStorage({destination:dir,filename:(r,f,c)=>c(null,'presentacion.pdf')}),limits:{fileSize:25*1024*1024},fileFilter:(r,f,c)=>c(null,f.mimetype==='application/pdf')});
function saveImage(file,base){const ext=imageExt[file.mimetype];const dest=path.join(dir,base+'.'+ext);for(const e of Object.values(imageExt)){const old=path.join(dir,base+'.'+e);if(old!==dest&&fs.existsSync(old))fs.unlinkSync(old)}fs.renameSync(file.path,dest);return dest}
function current(base){for(const ext of Object.values(imageExt)){const f=path.join(dir,base+'.'+ext);if(fs.existsSync(f))return f}return null}
app.use(express.static(path.join(__dirname,'public')));
app.get('/presentacion',(r,s)=>{const f=path.join(dir,'presentacion.pdf');fs.existsSync(f)?s.sendFile(f):s.status(404).send('La presentación aún no ha sido publicada.');});
app.get('/admin',(r,s)=>s.sendFile(path.join(__dirname,'public/admin.html')));
app.get('/background',(r,s)=>{const f=current('background');f?s.sendFile(f):s.status(404).end()});
app.get('/logo',(r,s)=>{const f=current('logo');f?s.sendFile(f):s.status(404).end()});
app.post('/admin/upload',pdfUpload.single('pdf'),(r,s)=>{if(r.body.password!==ADMIN_PASSWORD){if(r.file)fs.unlinkSync(r.file.path);return s.status(401).send('Contraseña incorrecta.')} if(!r.file)return s.status(400).send('Seleccioná un PDF.');s.send('Presentación actualizada correctamente.');});
app.post('/admin/background',imageUpload.single('image'),(r,s)=>{if(r.body.password!==ADMIN_PASSWORD){if(r.file)fs.unlinkSync(r.file.path);return s.status(401).send('Contraseña incorrecta.')}if(!r.file)return s.status(400).send('Seleccioná una imagen.');saveImage(r.file,'background');s.send('Fondo actualizado correctamente.');});
app.post('/admin/logo',imageUpload.single('image'),(r,s)=>{if(r.body.password!==ADMIN_PASSWORD){if(r.file)fs.unlinkSync(r.file.path);return s.status(401).send('Contraseña incorrecta.')}if(!r.file)return s.status(400).send('Seleccioná una imagen.');saveImage(r.file,'logo');s.send('Logo actualizado correctamente.');});
app.listen(PORT,()=>console.log(`Café y Vida corriendo en http://localhost:${PORT}`));
