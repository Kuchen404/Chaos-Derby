// Prüft die Geräusche aus js/sfx.js: rendert jedes einzeln im Browser (ohne Lautsprecher) und meldet stumme oder übersteuerte.
// Braucht Playwright mit Chromium wie tools/regie.js. Aufruf: node tools/sfx-test.js
const http=require('http'),fs=require('fs'),path=require('path');
let chromium;try{({chromium}=require('playwright'))}catch(e){console.error('Playwright fehlt: npm install playwright');process.exit(1)}
const root=path.join(__dirname,'..'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.gltf':'model/gltf+json','.json':'application/json','.mp3':'audio/mpeg'};
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]),f=path.join(root,u==='/'?'index.html':u);
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return}
  r.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
srv.listen(0,async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined,args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage();let err=0;p.on('pageerror',e=>{err++;console.error('Fehler auf der Seite:',e.message)});
  await p.route(/fonts\.googleapis/,r=>r.abort());
  await p.goto('http://localhost:'+srv.address().port+'/');
  const res=await p.evaluate(async()=>{const o={};for(const n of sfx.names)o[n]=await sfx.probe(n,4);return o});
  let bad=0;
  for(const n in res){const r=res[n],flag=r.bad?'kaputt':r.peak<.08?'zu leise':r.peak>1?'übersteuert':'';if(flag)bad++;
    console.log(n.padEnd(9),'Spitze',r.peak.toFixed(2),'Mittel',r.rms.toFixed(3),flag)}
  console.log(bad||err?'Auffällig: '+bad:'Geräusche ok');
  await b.close();srv.close();process.exit(bad||err?1:0)});
