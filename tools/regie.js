// Prüft die Kameraregie in Bewegung: spielt Rennen im Browser ab (ohne Bild) und misst, was die Kamera zeigt.
// Braucht Playwright mit Chromium (npm install playwright). Aufruf: node tools/regie.js [Anzahl]
// Optional CHROMIUM=/pfad/zu/chromium, falls Playwright keinen eigenen Browser hat.
const http=require('http'),fs=require('fs'),path=require('path');
let chromium;try{({chromium}=require('playwright'))}catch(e){console.error('Playwright fehlt: npm install playwright');process.exit(1)}
const root=path.join(__dirname,'..'),N=+process.argv[2]||30,types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.gltf':'model/gltf+json'};
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0])==='/'?'index.html':decodeURIComponent(q.url.split('?')[0]));
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return}
  r.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
srv.listen(0,async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined,args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage();p.on('pageerror',e=>console.error('Fehler auf der Seite:',e.message));
  await p.route(/fonts\.googleapis/,r=>r.abort());
  await p.goto('http://localhost:'+srv.address().port+'/');await p.evaluate(()=>{setField(CLASSIC);useField(CLASSIC)});await p.waitForFunction(()=>fig.every(f=>f.model),null,{timeout:120000});
  const res=await p.evaluate(N=>{
    renderer.render=()=>{};cancelAnimationFrame(raf);
    const V=new THREE.Vector3(),seen=i=>{camera.updateMatrixWorld();const r=fig[i].root.position;V.set(r.x,vis(i).top*S*.5,r.z).project(camera);return Math.abs(V.x)<.95&&Math.abs(V.y)<.95&&V.z<1};
    const out=[];
    for(let s=0;s<N;s++){
      race=simulate(1000+s*7919,true,0,CLASSIC);race.bod=0;reset();state='run';
      const o={side:0,leadOff:0,cut:0,cutOff:0,pack:0,jumps:0,short:[],win:false,frames:0};let k0='',t0=0;const P=new THREE.Vector3(),Q=new THREE.Vector3();
      for(;;){const done=step(1/30);o.frames++;
        const xs=race.frames[Math.min(Math.floor(t*30),race.frames.length-1)].x,li=xs.indexOf(Math.max(...xs)),k=shotK.replace(/[\d.]+$/,'');
        if(shotK!==k0){if(k0&&t-t0<1.2)o.short.push(k0.replace(/[\d.]+$/,'')+' '+(t-t0).toFixed(1)+' s');k0=shotK;t0=t}
        else if(Q.copy(camera.position).distanceTo(P)>4)o.jumps++;   // mehr als 4 m in einem Bild ohne Schnitt
        P.copy(camera.position);
        if(k==='side'){o.side++;if(!seen(li))o.leadOff++}
        if(k==='pack')o.pack++;
        if(k==='cut'){o.cut++;if(!seen(regie.cutI))o.cutOff++}
        if(!o.win&&t>=race.winT&&k==='fin'&&seen(race.order[0]))o.win=true;
        if(done)break}
      out.push(o)}
    return out},N);
  const sum=k=>res.reduce((a,o)=>a+o[k],0),pc=(a,b)=>(b?100*a/b:0).toFixed(1)+' %';
  console.log('Rennen:',N);
  console.log('Seitenkamera, Führender nicht im Bild:',pc(sum('leadOff'),sum('side')));
  console.log('Schnitt, betroffener Starter nicht im Bild:',pc(sum('cutOff'),sum('cut')));
  console.log('Anteil Verfolger-Einstellung:',pc(sum('pack'),sum('frames')));
  console.log('Kamerasprünge ohne Schnitt:',sum('jumps'));
  console.log('Sieger beim Zieleinlauf im Bild:',res.filter(o=>o.win).length+' von '+N);
  const sh=res.flatMap((o,i)=>o.short.map(x=>'Rennen '+i+': '+x));
  console.log('Einstellungen kürzer als 1,2 s:',sh.length);sh.forEach(x=>console.log('  '+x));
  await b.close();srv.close()});
