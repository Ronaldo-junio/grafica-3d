const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib');
const {TELEGRAPH_TOKEN:TOKEN,DB_SECRET:SECRET,ADMIN_PIN:PIN}=process.env,PORT=process.env.PORT||3000,TITLE='g3d-db',ST=['Novo','Em produção','Acabamento','Pronto','Enviado','Entregue','Cancelado'];
let DB,PAGE,ready=false,fail='';
const addFin=o=>DB.fin.push({id:Math.max(0,...DB.fin.map(f=>f.id||0))+1,...o});
const migrate=()=>{let m=Math.max(0,...DB.fin.map(f=>f.id||0));DB.fin.forEach(f=>{if(!f.id)f.id=++m});DB.prod.forEach(p=>{if(p.ativo===undefined)p.ativo=true})};
const today=()=>new Date().toISOString().slice(0,10);
function seed(){const fin=[];[[5,3100,1900],[6,3600,2100],[7,3900,2300],[8,4400,2500],[9,4900,2600]].forEach(([m,r,g])=>{const d='2026-0'+m+'-15';fin.push({d,t:'receita',c:'Vendas',x:'Vendas do mês',v:r},{d,t:'gasto',c:'Material',x:'Filamentos e resina',v:Math.round(g*.6)},{d,t:'gasto',c:'Energia',x:'Energia e internet',v:Math.round(g*.25)},{d,t:'gasto',c:'Manutenção',x:'Peças e bicos',v:Math.round(g*.15)})});
fin.push({d:'2026-10-10',t:'receita',c:'Vendas',x:'Vendas do mês',v:2380},{d:'2026-10-10',t:'gasto',c:'Material',x:'Filamentos e resina',v:1300},{d:'2026-10-10',t:'gasto',c:'Energia',x:'Energia e internet',v:540});
return{pin:'1234',fin,
prod:[{id:1,nome:'Suporte de Celular Articulado',cat:'Utilidades',preco:29.9,est:14,tags:'suporte celular smartphone mesa'},{id:2,nome:'Vaso Geométrico Low Poly',cat:'Decoração',preco:39.9,est:9,tags:'vaso planta decoracao casa'},{id:3,nome:'Dragão Articulado',cat:'Colecionáveis',preco:64.9,est:6,tags:'dragao miniatura brinquedo flexivel'},{id:4,nome:'Organizador de Cabos',cat:'Utilidades',preco:14.9,est:30,tags:'cabo fio organizador mesa'},{id:5,nome:'Chaveiro Personalizado',cat:'Brindes',preco:12.9,est:40,tags:'chaveiro nome brinde'},{id:6,nome:'Luminária Litofania',cat:'Decoração',preco:89.9,est:4,tags:'luminaria lampada foto litofania presente'},{id:7,nome:'Suporte de Headphone',cat:'Utilidades',preco:34.9,est:11,tags:'fone headphone suporte gamer'},{id:8,nome:'Peça Sob Medida',cat:'Sob medida',preco:0,est:999,tags:'personalizado stl projeto arquivo encomenda'}],
mat:[{id:1,nome:'PLA Preto',qtd:4.2,min:1.5,custo:95},{id:2,nome:'PLA Branco',qtd:1.1,min:1.5,custo:95},{id:3,nome:'PETG Transparente',qtd:2.8,min:1,custo:120},{id:4,nome:'ABS Cinza',qtd:3.5,min:1,custo:110},{id:5,nome:'Resina Standard',qtd:0.9,min:0.5,custo:180}],
ped:[{id:1001,cli:'Marina Souza',desc:'2x Chaveiro Personalizado',total:25.8,st:'Entregue',fin:1,d:'2026-10-12'},{id:1002,cli:'Carlos Lima',desc:'1x Luminária Litofania',total:89.9,st:'Pronto',d:'2026-10-18'},{id:1003,cli:'Oficina Beta',desc:'Sob medida: suporte de bancada (PETG, 180g)',total:68,st:'Em produção',d:'2026-10-19'},{id:1004,cli:'Ana Paula',desc:'3x Organizador de Cabos',total:44.7,st:'Novo',d:'2026-10-20'}]}}

// ---- criptografia: a página do Telegraph é pública, então só guardamos dados cifrados ----
const KEY=SECRET&&crypto.createHash('sha256').update(SECRET).digest();
const enc=o=>{const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',KEY,iv),e=Buffer.concat([c.update(zlib.deflateSync(JSON.stringify(o))),c.final()]);return Buffer.concat([iv,c.getAuthTag(),e]).toString('base64')};
const dec=s=>{const b=Buffer.from(s,'base64'),d=crypto.createDecipheriv('aes-256-gcm',KEY,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return JSON.parse(zlib.inflateSync(Buffer.concat([d.update(b.subarray(28)),d.final()])))};
const tg=async(m,p)=>{const r=await fetch('https://api.telegra.ph/'+m,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({access_token:TOKEN,...p})});const j=await r.json();if(!j.ok)throw new Error(j.error);return j.result};
const body=()=>[{tag:'p',children:[enc(DB)]}];
async function init(){const l=await tg('getPageList',{limit:200}),f=(l.pages||[]).find(p=>p.title==TITLE);
if(f){PAGE=f.path;const pg=await tg('getPage/'+PAGE,{return_content:true});DB=dec(pg.content[0].children[0])}
else{DB=seed();PAGE=(await tg('createPage',{title:TITLE,content:body()})).path}migrate();ready=true}
let chain=Promise.resolve();
const persist=()=>chain=chain.catch(()=>{}).then(async()=>{const c=body();if(JSON.stringify(c).length>64000)throw new Error('Banco cheio (limite de 64 KB do Telegraph)');
for(let i=0;;i++){try{await tg('editPage/'+PAGE,{title:TITLE,content:c});return}catch(e){const m=/FLOOD_WAIT_(\d+)/.exec(e.message);if(i>=2||!m)throw e;await new Promise(r=>setTimeout(r,Math.min(+m[1],10)*1000))}}});
// ---- utilidades ----
const J=(res,s,o)=>{res.writeHead(s,{'content-type':'application/json'});res.end(JSON.stringify(o))};
const rd=(req,max=20000)=>new Promise((ok,no)=>{let d='';req.on('data',c=>{d+=c;if(d.length>max){no(0);req.destroy()}});req.on('end',()=>{try{ok(d?JSON.parse(d):{})}catch(e){no(0)}})});
const hits={},recent=(k,ms)=>(hits[k]=(hits[k]||[]).filter(t=>Date.now()-t<ms)),mark=k=>hits[k].push(Date.now());
const h=s=>crypto.createHash('sha256').update(String(s)).digest();
const str=(v,n)=>String(v==null?'':v).trim().slice(0,n);
const quote=(m,g)=>Math.round((g/1000*m.custo*2.5+15)*100)/100;
const pub=()=>({prod:DB.prod.filter(p=>p.ativo!==false),mat:DB.mat.map(({id,nome})=>({id,nome})),ped:[],fin:[]});
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8'},PAGES={'/':'index.html','/index.html':'index.html','/pedido':'pedido.html','/produtos':'produtos.html','/produtos.html':'produtos.html','/pedido.html':'pedido.html','/admin':'admin.html','/admin.html':'admin.html','/financeiro':'financeiro.html','/financeiro.html':'financeiro.html','/shared.js':'shared.js'};
const TGT=process.env.TG_BOT_TOKEN,TGC=process.env.TG_CHAT_ID,fpath=new Map();
async function foto(req,res){const b=await rd(req,3e6),m=/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.img||''));if(!m)return J(res,400,{erro:'Envie uma imagem JPEG.'});
 if(!TGT||!TGC)return J(res,503,{erro:'Configure TG_BOT_TOKEN e TG_CHAT_ID no Render para enviar fotos.'});
 const buf=Buffer.from(m[1],'base64');if(buf.length>2e6)return J(res,400,{erro:'Imagem grande demais.'});
 const fd=new FormData();fd.append('chat_id',TGC);fd.append('disable_notification','true');fd.append('photo',new Blob([buf],{type:'image/jpeg'}),'foto.jpg');
 const j=await fetch('https://api.telegram.org/bot'+TGT+'/sendPhoto',{method:'POST',body:fd}).then(r=>r.json()).catch(()=>null);
 if(!j||!j.ok)return J(res,502,{erro:'O Telegram recusou a imagem: '+String(j&&j.description||'sem resposta').slice(0,120)});
 const ph=j.result.photo;return J(res,200,{id:'tg:'+ph[ph.length-1].file_id})}
async function img(res,id){if(!TGT||!/^[A-Za-z0-9_-]{20,200}$/.test(id)){res.writeHead(404);return res.end()}
 let c=fpath.get(id);if(!c||c.t<Date.now()){const r=await fetch('https://api.telegram.org/bot'+TGT+'/getFile?file_id='+id).then(x=>x.json()).catch(()=>null);if(!r||!r.ok){res.writeHead(404);return res.end()}c={p:r.result.file_path,t:Date.now()+3e6};fpath.set(id,c)}
 const f=await fetch('https://api.telegram.org/file/bot'+TGT+'/'+c.p);if(!f.ok){fpath.delete(id);res.writeHead(502);return res.end()}
 res.writeHead(200,{'content-type':'image/jpeg','cache-control':'public,max-age=86400'});res.end(Buffer.from(await f.arrayBuffer()))}
async function api(req,res,u,ip){
 if(!ready)return J(res,503,{erro:fail||'Servidor iniciando, tente de novo em instantes'});
 const p=u.pathname;
 if(req.method=='GET'&&p=='/api/pub')return J(res,200,pub());
 if(req.method=='GET'&&p=='/api/orcamento'){const m=DB.mat.find(x=>x.id==u.searchParams.get('mat')),g=Math.min(5000,Math.max(1,+u.searchParams.get('g')||0));return m?J(res,200,{v:quote(m,g)}):J(res,404,{erro:'Material não encontrado'})}
 if(req.method=='POST'&&p=='/api/pedido'){
  if(recent('o'+ip,36e5).length>=20)return J(res,429,{erro:'Muitos pedidos em pouco tempo. Tente mais tarde.'});
  const b=await rd(req),cli=str(b.cli,80);if(!cli)return J(res,400,{erro:'Informe seu nome.'});
  const it=(Array.isArray(b.itens)?b.itens:[]).slice(0,20),cu=(Array.isArray(b.custom)?b.custom:[]).slice(0,10);if(!it.length&&!cu.length)return J(res,400,{erro:'Pedido vazio.'});
  let total=0;const ds=[],need={},mneed={};
  for(const x of it){const pr=DB.prod.find(y=>y.id==x.id&&y.id!=8&&y.ativo!==false),q=Math.floor(+x.q);if(!pr||!(q>=1&&q<=999))return J(res,400,{erro:'Item inválido.'});need[pr.id]=(need[pr.id]||0)+q;total+=pr.preco*q;ds.push(q+'x '+pr.nome)}
  for(const x of cu){const m=DB.mat.find(y=>y.id==x.mat),g=Math.floor(+x.g);if(!m||!(g>=1&&g<=5000))return J(res,400,{erro:'Peça sob medida inválida.'});mneed[m.id]=(mneed[m.id]||0)+g/1000;total+=quote(m,g);ds.push('Sob medida: '+str(x.desc,60)+' ('+m.nome+', '+g+'g)')}
  for(const id in need){const pr=DB.prod.find(y=>y.id==id);if(need[id]>pr.est)return J(res,409,{erro:'Temos só '+pr.est+' de “'+pr.nome+'” em estoque.'})}
  for(const id in need)DB.prod.find(y=>y.id==id).est-=need[id];
  for(const id in mneed){const m=DB.mat.find(y=>y.id==id);m.qtd=Math.max(0,+(m.qtd-mneed[id]).toFixed(3))}
  const id=Math.max(1000,...DB.ped.map(x=>x.id))+1;DB.ped.push({id,cli,desc:ds.join('; '),total:+total.toFixed(2),st:'Novo',d:today()});mark('o'+ip);
  return J(res,200,{id,total:+total.toFixed(2)})}
 if(p.startsWith('/api/admin')){
  if(!PIN)return J(res,503,{erro:'Defina a variável ADMIN_PIN no Render.'});
  if(recent('a'+ip,9e5).length>=10)return J(res,429,{erro:'Muitas tentativas. Aguarde 15 minutos.'});
  if(!crypto.timingSafeEqual(h(req.headers['x-pin']||''),h(PIN))){mark('a'+ip);return J(res,401,{erro:'PIN incorreto'})}
  if(req.method=='GET'&&p=='/api/admin')return J(res,200,DB);
  if(req.method!='POST')return J(res,404,{erro:'Não encontrado'});
  if(p=='/api/admin/foto')return foto(req,res);
  const b=await rd(req);
  if(p=='/api/admin/status'){const o=DB.ped.find(x=>x.id==b.id);if(!o||!ST.includes(b.st))return J(res,400,{erro:'Dados inválidos'});o.st=b.st;if(b.st=='Entregue'&&!o.fin){o.fin=1;addFin({d:today(),t:'receita',c:'Vendas',x:'Pedido #'+o.id,v:o.total})}}
  else if(p=='/api/admin/estoque'){const o=DB.prod.find(x=>x.id==b.id&&x.id!=8),n=Math.floor(+b.n);if(!o||!(Math.abs(n)<=1000))return J(res,400,{erro:'Dados inválidos'});o.est=Math.max(0,o.est+n)}
  else if(p=='/api/admin/material'){const m=DB.mat.find(x=>x.id==b.id),kg=+b.kg;if(!m||!(kg>0&&kg<=1000))return J(res,400,{erro:'Dados inválidos'});m.qtd=+(m.qtd+kg).toFixed(2);addFin({d:today(),t:'gasto',c:'Material',x:'Reposição '+m.nome,v:+(kg*m.custo).toFixed(2)})}
  else if(p=='/api/admin/fin'){const v=+b.v;if(!['receita','gasto'].includes(b.t)||!str(b.c,60)||!str(b.x,60)||!(v>0&&v<1e8))return J(res,400,{erro:'Dados inválidos'});addFin({d:/^\d{4}-\d{2}-\d{2}$/.test(b.d||'')?b.d:today(),t:b.t,c:str(b.c,60),x:str(b.x,60),v})}
  else if(p=='/api/admin/pedidos/importar'){const L=str(b.lote,40),A=Array.isArray(b.pedidos)?b.pedidos.slice(0,200):[];DB.imp=DB.imp||[];
   if(!L||!A.length)return J(res,400,{erro:'Lote vazio'});if(DB.imp.includes(L))return J(res,409,{erro:'Este lote já foi importado.'});
   const R=A.map(x=>({cli:str(x.cli,80),desc:str(x.desc,200),total:+x.total,st:x.st,prazo:str(x.prazo,10),entrega:str(x.entrega,30)}));
   if(R.some(x=>!x.cli||!x.desc||!(x.total>=0&&x.total<1e7)||!ST.includes(x.st)||(x.prazo&&!/^\d{4}-\d{2}-\d{2}$/.test(x.prazo))))return J(res,400,{erro:'Há pedidos com dados inválidos.'});
   let id=Math.max(1000,...DB.ped.map(x=>x.id));R.forEach(x=>DB.ped.push({id:++id,...x,d:today(),...(x.st=='Entregue'?{fin:1}:{})}));DB.imp.push(L)}
  else if(p=='/api/admin/produto'){const o={nome:str(b.nome,80),cat:str(b.cat,30),preco:+b.preco,est:Math.floor(+b.est),tags:str(b.tags,120),img:str(b.img,200),ativo:b.ativo!==false};
   if(!o.nome||!o.cat||!(o.preco>=0&&o.preco<=1e5)||!(o.est>=0&&o.est<=1e5)||(o.img&&!/^tg:[A-Za-z0-9_-]{20,200}$/.test(o.img)))return J(res,400,{erro:'Dados inválidos'});
   if(b.id){const x=DB.prod.find(y=>y.id==b.id&&y.id!=8);if(!x)return J(res,404,{erro:'Produto não encontrado'});Object.assign(x,o)}else DB.prod.push({id:Math.max(8,...DB.prod.map(y=>y.id))+1,...o})}
  else if(p=='/api/admin/produto/del'){const i=DB.prod.findIndex(y=>y.id==b.id&&y.id!=8);if(i<0)return J(res,404,{erro:'Produto não encontrado'});DB.prod.splice(i,1)}
  else if(p=='/api/admin/mat'){const o={nome:str(b.nome,40),qtd:+b.qtd,min:+b.min,custo:+b.custo};if(!o.nome||!(o.qtd>=0&&o.qtd<=1e5)||!(o.min>=0&&o.min<=1e5)||!(o.custo>=0&&o.custo<=1e5))return J(res,400,{erro:'Dados inválidos'});
   if(b.id){const x=DB.mat.find(y=>y.id==b.id);if(!x)return J(res,404,{erro:'Material não encontrado'});Object.assign(x,o)}else DB.mat.push({id:Math.max(0,...DB.mat.map(y=>y.id))+1,...o})}
  else if(p=='/api/admin/mat/del'){const i=DB.mat.findIndex(y=>y.id==b.id);if(i<0)return J(res,404,{erro:'Material não encontrado'});DB.mat.splice(i,1)}
  else if(p=='/api/admin/fin/edit'){const f=DB.fin.find(x=>x.id==b.id),v=+b.v;if(!f||!['receita','gasto'].includes(b.t)||!str(b.c,60)||!str(b.x,60)||!(v>0&&v<1e8)||!/^\d{4}-\d{2}-\d{2}$/.test(b.d||''))return J(res,400,{erro:'Dados inválidos'});Object.assign(f,{t:b.t,c:str(b.c,60),x:str(b.x,60),v,d:b.d})}
  else if(p=='/api/admin/fin/del'){const i=DB.fin.findIndex(x=>x.id==b.id);if(i<0)return J(res,404,{erro:'Lançamento não encontrado'});DB.fin.splice(i,1)}
  else return J(res,404,{erro:'Não encontrado'});
  return J(res,200,{ok:1})}
 J(res,404,{erro:'Não encontrado'})}
const srv=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://x'),ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0].trim();
 if(u.pathname.startsWith('/api/')){const snap=JSON.stringify(DB);try{await api(req,res,u,ip);if(req.method=='POST'&&res.statusCode==200&&JSON.stringify(DB)!=snap)await persist()}catch(e){if(!res.headersSent)J(res,e===0?400:502,{erro:e===0?'Requisição inválida':'Não foi possível salvar no banco (Telegraph): '+e.message});if(e!==0&&snap)DB=JSON.parse(snap)}return}
 if(u.pathname.startsWith('/img/'))return await img(res,u.pathname.slice(5));
 const f=PAGES[u.pathname];if(!f){res.writeHead(404);return res.end('Não encontrado')}
 res.writeHead(200,{'content-type':MIME[path.extname(f)],'cache-control':'no-cache'});fs.createReadStream(path.join(__dirname,'public',f)).pipe(res)}catch(e){if(!res.headersSent)res.writeHead(500);res.end()}});
srv.listen(PORT,()=>console.log('Gráfica3D na porta '+PORT));
if(!TOKEN||!SECRET)fail='Defina TELEGRAPH_TOKEN e DB_SECRET no Render.';else init().catch(e=>{fail='Falha ao conectar ao Telegraph: '+e.message;console.error(fail)});
