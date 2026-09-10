const crypto=require('crypto'),express=require('express'),multer=require('multer'),fs=require('fs'),path=require('path');
const app=express(),PORT=process.env.PORT||3000,ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'cafevida2026';
const dir=path.join(__dirname,'uploads'); fs.mkdirSync(dir,{recursive:true});
const dataFile=path.join(__dirname,'data.json');
const defaults={title:'Café y Vida',description:'Un espacio para compartir, escuchar y crecer.',footer:'Café y Vida',links:[
{id:'facebook',name:'Facebook',url:'https://www.facebook.com/cafeyvidapodcast',active:true,featured:false,description:''},
{id:'instagram',name:'Instagram',url:'https://www.instagram.com/cafe.yvida/',active:true,featured:false,description:''},
{id:'youtube',name:'YouTube',url:'https://youtube.com/@predicacionesonline2024',active:true,featured:false,description:''}
],appearance:{font:'DM Sans',titleFont:'Playfair Display',textColor:'#3f2a1e',titleColor:'#3f2a1e',descriptionColor:'#3f2a1e',buttonColor:'#fffaf4',buttonTextColor:'#3f2a1e',buttonOpacity:92,buttonRadius:16,overlay:12,titleSize:36,bodySize:15}};
function load(){try{return {...defaults,...JSON.parse(fs.readFileSync(dataFile,'utf8'))}}catch{return {...defaults}}}
function save(d){fs.writeFileSync(dataFile,JSON.stringify(d,null,2))}
if(!fs.existsSync(dataFile))save(defaults);

const imageExt={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const imageUpload=multer({storage:multer.diskStorage({destination:dir,filename:(r,f,c)=>c(null,Date.now()+'-'+f.originalname.replace(/[^a-zA-Z0-9._-]/g,'_'))}),limits:{fileSize:10*1024*1024},fileFilter:(r,f,c)=>c(null,!!imageExt[f.mimetype])});
const pdfUpload=multer({storage:multer.diskStorage({destination:dir,filename:(r,f,c)=>c(null,'presentacion-upload-'+Date.now()+'.tmp')}),limits:{fileSize:100*1024*1024},fileFilter:(r,f,c)=>c(null,true)});

function saveImage(file,base){const ext=imageExt[file.mimetype],dest=path.join(dir,base+'.'+ext);for(const e of Object.values(imageExt)){const old=path.join(dir,base+'.'+e);if(old!==dest&&fs.existsSync(old))fs.unlinkSync(old)}fs.renameSync(file.path,dest)}
function current(base){for(const ext of Object.values(imageExt)){const f=path.join(dir,base+'.'+ext);if(fs.existsSync(f))return f}return null}

const ADMIN_COOKIE='cafe_admin';
function adminToken(){return crypto.createHmac('sha256',ADMIN_PASSWORD).update('cafe-y-vida-admin').digest('hex')}
function isAdmin(req){
  const raw=(req.headers.cookie||'').split(';').map(x=>x.trim());
  const value=raw.find(x=>x.startsWith(ADMIN_COOKIE+'='))?.slice(ADMIN_COOKIE.length+1);
  return value===adminToken();
}
function requireAdmin(req,res,next){
  if(isAdmin(req)) return next();
  return res.status(401).send('No autorizado.');
}

app.use(express.urlencoded({extended:true}));
app.use(express.json());

/* Never expose the administration page before authentication. */
app.use((req,res,next)=>{
  if((req.path==='/admin.html'||req.path==='/admin')&&!isAdmin(req)) return next();
  next();
});
app.use(express.static(path.join(__dirname,'public')));

app.get('/api/config',(req,res)=>{
  const d=load(); d.appearance=d.appearance||{};
  d.appearance.titleColor=d.appearance.titleColor||d.appearance.textColor||'#3f2a1e';
  d.appearance.descriptionColor=d.appearance.descriptionColor||d.appearance.textColor||'#3f2a1e';
  d.appearance.buttonTextColor=d.appearance.buttonTextColor||d.appearance.textColor||'#3f2a1e';
  res.json({...d,hasPdf:fs.existsSync(path.join(dir,'presentacion.pdf')),hasLogo:!!current('logo'),hasBackground:!!current('background')});
});
app.get('/presentacion',(r,s)=>{const f=path.join(dir,'presentacion.pdf');fs.existsSync(f)?s.sendFile(f):s.status(404).send('La presentación aún no ha sido publicada.')});
app.get('/background',(r,s)=>{const f=current('background');f?s.sendFile(f):s.status(404).end()});
app.get('/logo',(r,s)=>{const f=current('logo');f?s.sendFile(f):s.status(404).end()});

/* Login screen: /admin only shows the password gate. */
app.get('/admin',(req,res)=>{
  if(!isAdmin(req)) return res.sendFile(path.join(__dirname,'public','login.html'));
  res.sendFile(path.join(__dirname,'public','admin.html'));
});
app.get('/admin.html',(req,res)=>{
  if(!isAdmin(req)) return res.sendFile(path.join(__dirname,'public','login.html'));
  res.sendFile(path.join(__dirname,'public','admin.html'));
});
app.post('/admin/login',(req,res)=>{
  if(String(req.body.password||'')!==ADMIN_PASSWORD) return res.status(401).send('Contraseña incorrecta.');
  res.setHeader('Set-Cookie',`${ADMIN_COOKIE}=${adminToken()}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`);
  res.redirect('/admin');
});
app.get('/admin/logout',(req,res)=>{
  res.setHeader('Set-Cookie',`${ADMIN_COOKIE}=; Max-Age=0; HttpOnly; Path=/; SameSite=Lax`);
  res.redirect('/admin');
});

/* All changes now require the authenticated admin cookie. */
app.post('/admin/upload',requireAdmin,(req,res)=>{
  pdfUpload.single('pdf')(req,res,(err)=>{
    if(err){
      console.error('PDF upload error:',err);
      return res.status(400).send('No se pudo subir el PDF: '+err.message);
    }
    if(!req.file)return res.status(400).send('Seleccioná un PDF.');
    const original=(req.file.originalname||'').toLowerCase();
    if(!original.endsWith('.pdf')){
      if(fs.existsSync(req.file.path))fs.unlinkSync(req.file.path);
      return res.status(400).send('El archivo debe ser un PDF.');
    }
    const dest=path.join(dir,'presentacion.pdf');
    try{
      if(fs.existsSync(dest))fs.unlinkSync(dest);
      fs.renameSync(req.file.path,dest);
      res.redirect('/admin?ok=pdf');
    }catch(e){
      if(fs.existsSync(req.file.path))fs.unlinkSync(req.file.path);
      console.error('PDF save error:',e);
      return res.status(500).send('No se pudo guardar el PDF.');
    }
  });
});
app.post('/admin/background',imageUpload.single('image'),requireAdmin,(req,res)=>{
  if(!req.file)return res.status(400).send('Seleccioná una imagen.');
  saveImage(req.file,'background');res.redirect('/admin?ok=background');
});
app.post('/admin/logo',imageUpload.single('image'),requireAdmin,(req,res)=>{
  if(!req.file)return res.status(400).send('Seleccioná una imagen.');
  saveImage(req.file,'logo');res.redirect('/admin?ok=logo');
});
app.post('/admin/config',requireAdmin,(req,res)=>{
  const d=load();d.title=String(req.body.title||'Café y Vida').slice(0,80);d.description=String(req.body.description||'').slice(0,180);d.footer=String(req.body.footer||d.title).slice(0,80);
  d.appearance={...d.appearance,...(req.body.appearance||{})};save(d);res.json({ok:true});
});
app.post('/admin/links',requireAdmin,(req,res)=>{
  let links=Array.isArray(req.body.links)?req.body.links:[];
  links=links.slice(0,30).map((x,i)=>({id:String(x.id||Date.now()+'-'+i),name:String(x.name||'Link').slice(0,60),url:String(x.url||'#').slice(0,500),active:!!x.active,featured:!!x.featured,description:String(x.description||'').slice(0,100)}));
  const d=load();d.links=links;save(d);res.json({ok:true});
});
app.use((err,r,s,n)=>{
  if(err){if(r.file?.path&&fs.existsSync(r.file.path))fs.unlinkSync(r.file.path);console.error(err);return s.status(400).send('No se pudo subir el archivo: '+err.message)}n();
});
app.listen(PORT,()=>console.log(`Café y Vida corriendo en http://localhost:${PORT}`));
