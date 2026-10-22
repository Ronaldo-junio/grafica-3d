const K='g3d_v1',ST=['Novo','Em produção','Pronto','Entregue','Cancelado'];
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const brl=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),today=()=>new Date().toISOString().slice(0,10);
const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ');
function lev(a,b){const d=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){let p=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const t=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]==b[j-1]?0:1));p=t}}return d[b.length]}
function score(q,doc){const qt=norm(q).split(/\s+/).filter(Boolean),dt=norm(doc).split(/\s+/).filter(Boolean);if(!qt.length)return 0;let s=0;for(const t of qt){let b=0;for(const d of dt){const v=d==t?1:((t.length>1&&d.startsWith(t))||(d.length>3&&t.startsWith(d)))?.85:(t.length>3&&lev(t,d)<=Math.ceil(t.length/4))?.6:0;if(v>b)b=v}s+=b}return s/qt.length}
const SC={Novo:'#22d3ee','Em produção':'#fbbf24',Pronto:'#a78bfa',Entregue:'#a3e635',Cancelado:'#f472b6'};
function xhr(m,u,b,pin){const x=new XMLHttpRequest();x.open(m,u,false);x.setRequestHeader('content-type','application/json');if(pin)x.setRequestHeader('x-pin',pin);try{x.send(b?JSON.stringify(b):null)}catch(e){return{s:0,j:{erro:'Sem conexão com o servidor'}}}let j={};try{j=JSON.parse(x.responseText)}catch(e){}return{s:x.status,j}}
const api=(m,u,b)=>xhr(m,u,b,sessionStorage.getItem('pin'));
let DB;{const r=xhr('GET','/api/pub');DB=r.s==200?r.j:{prod:[],mat:[],ped:[],fin:[],erro:(r.j&&r.j.erro)||'Servidor indisponível'}}
const save=()=>{};
function reload(){const r=api('GET','/api/admin');if(r.s==200)DB=r.j}
function gate(){let p=sessionStorage.getItem('pin')||prompt('PIN do administrador');const r=xhr('GET','/api/admin',null,p);if(r.s!=200){sessionStorage.removeItem('pin');document.body.innerHTML='<p style="padding:40px;font:16px system-ui">'+esc(r.s==401?'PIN incorreto.':(r.j.erro||'Erro'))+' <a href="index.html">Voltar à loja</a></p>';throw 0}sessionStorage.setItem('pin',p);DB=r.j}
function shell(a){const L=[['index.html','Loja','loja'],['pedido.html','Fazer pedido','pedido'],['admin.html','Admin','admin'],['financeiro.html','Financeiro','fin']];
document.head.insertAdjacentHTML('beforeend',`<meta name="viewport" content="width=device-width,initial-scale=1"><style>
:root{--bg:#120f24;--c:#1e1a38;--t:#f3f0ff;--m:#a79fd0;--b:#352f5c;--a:#22d3ee;--ac:#08121a;--w:#fbbf24;--r:#f472b6;--g:#a3e635;--v:#a78bfa;--c0:#22d3ee;--c1:#f472b6;--c2:#a3e635;--c3:#fbbf24;--c4:#a78bfa}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(900px 500px at 85% -10%,#3b1d6e55,transparent),radial-gradient(700px 400px at -10% 30%,#0e749044,transparent),var(--bg);background-attachment:fixed;color:var(--t);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
header{display:flex;flex-wrap:wrap;align-items:center;gap:8px 24px;padding:14px 20px;background:linear-gradient(90deg,#2a1a5e,#4a1d6b 55%,#7a1d56);border-bottom:3px solid var(--a)}
header b{font-size:19px;letter-spacing:-.3px;background:linear-gradient(90deg,var(--a),var(--g),var(--w));-webkit-background-clip:text;background-clip:text;color:transparent}nav{display:flex;gap:4px;flex-wrap:wrap}nav a{padding:6px 13px;border-radius:999px;color:#e5defc;text-decoration:none}nav a.on{background:var(--a);color:var(--ac);font-weight:600}nav a:hover:not(.on){background:#ffffff22}
main{max-width:1060px;margin:0 auto;padding:20px}h1{font-size:26px;margin:4px 0 14px;letter-spacing:-.5px}h2{font-size:17px;margin:26px 0 10px;color:var(--w)}
.card{background:var(--c);border:1px solid var(--b);border-top:3px solid var(--v);border-radius:10px;padding:14px}.w{overflow-x:auto}
button,select,input{font:inherit;color:var(--t);background:#2a2550;border:1px solid var(--b);border-radius:8px;padding:7px 10px}button{cursor:pointer}button:hover{border-color:var(--a)}button.p{background:linear-gradient(90deg,var(--a),var(--v));color:var(--ac);border:0;font-weight:600}
input::placeholder{color:var(--m)}:focus-visible{outline:2px solid var(--w);outline-offset:2px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--b);vertical-align:middle}th{color:var(--a);font-weight:600}
.k{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.k div{background:var(--c);border:1px solid var(--b);border-radius:10px;padding:12px;border-top:4px solid var(--c0)}.k div:nth-child(2){border-top-color:var(--c1)}.k div:nth-child(3){border-top-color:var(--c2)}.k div:nth-child(4){border-top-color:var(--c3)}.k small{color:var(--m)}.k b{display:block;font-size:22px}
.lo{color:var(--r);font-weight:600}.ok{color:var(--g)}
</style>`);
document.body.insertAdjacentHTML('afterbegin',`<header><b>Gráfica3D</b><nav>${L.map(l=>`<a href="${l[0]}" class="${l[2]==a?'on':''}">${l[1]}</a>`).join('')}</nav></header>`);if(DB.erro)document.body.insertAdjacentHTML('afterbegin','<p style="margin:0;padding:10px 20px;background:var(--r);color:#12001a">'+esc(DB.erro)+'</p>')}