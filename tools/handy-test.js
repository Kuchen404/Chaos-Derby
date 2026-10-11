// Prüft das Wetten am Handy mit zwei Browsern: Fernseher (index.html) und Handy (handy.html) über einen eigenen PeerJS-Server.
// Braucht Playwright mit Chromium und den PeerJS-Server (npm install playwright peer). Aufruf: node tools/handy-test.js
// Optional CHROMIUM=/pfad/zu/chromium, falls Playwright keinen eigenen Browser hat.
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
let chromium,PeerServer;
try{({chromium}=require('playwright'));({PeerServer}=require('peer'))}catch(e){console.error('Es fehlt etwas: npm install playwright peer');process.exit(1)}
const root=path.join(__dirname,'..'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.gltf':'model/gltf+json','.json':'application/json'};
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]),f=path.join(root,u==='/'?'index.html':u);
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return}
  r.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
const step=s=>console.log('·',s);
// SHOTS=ordner legt Bildschirmfotos der wichtigsten Zustände ab
const shot=(p,n)=>process.env.SHOTS?p.screenshot({path:path.join(process.env.SHOTS,n+'.png'),fullPage:true}):null;
PeerServer({port:0,host:'127.0.0.1',path:'/'},ps=>srv.listen(0,'127.0.0.1',async()=>{
  const peerUrl='http://127.0.0.1:'+ps.address().port+'/',base='http://127.0.0.1:'+srv.address().port+'/';
  const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined,args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const errs=[];
  const page=async(ctx,url)=>{const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));if(process.env.DEBUG)p.on('console',m=>console.log('  [konsole]',m.text()));await p.route(/fonts\.googleapis/,r=>r.abort());await p.goto(url);return p};
  try{
    const tv=await page(await b.newContext({viewport:{width:1280,height:900}}),base+'index.html?peer='+encodeURIComponent(peerUrl));
    await tv.waitForFunction(()=>!document.getElementById('hon').hidden&&Q,null,{timeout:120000});
    const url=await tv.getAttribute('#hurl','href'),code=await tv.textContent('#hcode');
    assert.ok(url.includes('handy.html?raum='+code),'Handy-Adresse mit Raumcode: '+url);
    assert.ok(await tv.$eval('#qr svg',e=>e.getBBox().width>0),'QR-Code im Wettbüro');
    assert.ok(!await tv.$eval('#tvqr',e=>e.hidden),'QR-Code im Sendebild, solange die Wetten offen sind');
    await shot(tv,'fernseher');
    if(process.env.SHOTS){await tv.evaluate(()=>{document.getElementById('load').hidden=true});await tv.locator('#view').screenshot({path:path.join(process.env.SHOTS,'sendebild.png')})}
    step('Fernseher bereit, Raum '+code);

    const phone=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const anna=await page(phone,url);
    await anna.waitForSelector('#join:not([hidden])');
    assert.equal(await anna.$('canvas'),null,'Handy zeigt kein Rennen');
    await anna.fill('#name','Anna');await anna.click('#join button');
    await anna.waitForSelector('#game:not([hidden])');
    assert.equal(await anna.textContent('#mecash'),'100 Taler');
    step('Anna angemeldet');
    // Sieg auf Bahn 0, 10 Taler
    await anna.click('#pick button[data-i="0"]');await anna.fill('#stake','10');
    const q=await anna.textContent('#q');await anna.click('#go');
    await anna.waitForFunction(()=>document.getElementById('mecash').textContent==='90 Taler');
    // Zweierwette 2 vor 3, 25 Taler
    await anna.click('#types button[data-t="exacta"]');await anna.click('#pick button[data-i="2"]');await anna.click('#pick button[data-i="3"]');
    await anna.click('#chips button[data-s="25"]');await anna.click('#go');
    await anna.waitForFunction(()=>document.getElementById('mecash').textContent==='65 Taler');
    const host=await tv.evaluate(()=>({p:book.players.map(p=>[p.name,p.cash]),s:book.slips.map(s=>[s.type,s.a,s.b,s.stake,s.q]),li:document.getElementById('players').textContent}));
    assert.deepEqual(host.p,[['Anna',65]]);assert.equal(host.s.length,2);assert.equal(host.s[0][4].toFixed(1).replace('.',','),q);
    assert.ok(host.li.includes('Handy'),'Fernseher zeigt Anna als Handy-Spielerin');
    await anna.click('#types button[data-t="exacta"]');await anna.click('#pick button[data-i="1"]');await shot(anna,'handy-wettschein');
    step('Zwei Wetten angenommen, Quote '+q+' wie am Handy, Kasse am Fernseher 65');
    // Zu hoher Einsatz wird abgelehnt
    await anna.click('#types button[data-t="win"]');await anna.click('#pick button[data-i="1"]');await anna.fill('#stake','500');await anna.click('#go');
    await anna.waitForSelector('#msg.bad:not([hidden])');assert.match(await anna.textContent('#msg'),/nur noch 65/);
    step('Zu hoher Einsatz abgelehnt: '+await anna.textContent('#msg'));
    // Zurücknehmen
    await anna.fill('#stake','5');await anna.click('#go');await anna.waitForFunction(()=>document.getElementById('mecash').textContent==='60 Taler');
    await anna.click('#slips li:last-child .x');await anna.waitForFunction(()=>document.getElementById('mecash').textContent==='65 Taler');
    step('Wette zurückgenommen');

    // Zweites Handy: gleicher Name geht nicht, anderer schon
    const ben=await page(await b.newContext({viewport:{width:360,height:740},isMobile:true}),url);
    await ben.waitForSelector('#join:not([hidden])');await ben.fill('#name','anna');await ben.click('#join button');
    await ben.waitForSelector('#msg.bad:not([hidden])');assert.match(await ben.textContent('#msg'),/spielt schon mit/);
    await ben.fill('#name','Ben');await ben.click('#join button');await ben.waitForSelector('#game:not([hidden])');
    await ben.click('#types button[data-t="place"]');await ben.click('#pick button[data-i="4"]');await ben.click('#chips button[data-s="all"]');await ben.click('#go');
    await ben.waitForFunction(()=>document.getElementById('mecash').textContent==='0 Taler');
    step('Ben angemeldet, alles auf Platz gesetzt; doppelter Name abgelehnt');

    // Neuladen: Anna bekommt ihre Kasse zurück
    await anna.reload();await anna.waitForFunction(()=>document.getElementById('mecash').textContent==='65 Taler',null,{timeout:20000});
    assert.equal(await anna.$$eval('#slips li .x',l=>l.length),2);
    step('Anna nach dem Neuladen wieder dabei, Wetten noch da');

    // Rennen startet am Fernseher: Wetten zu, Handy zeigt nur den Hinweis
    await tv.evaluate(()=>start());
    await anna.waitForSelector('#banner.run');
    assert.ok(await anna.$eval('#slip',e=>e.hidden),'Wettschein im Rennen versteckt');
    assert.equal(await anna.$$eval('#slips .x',l=>l.length),0,'Im Rennen nichts mehr zurücknehmen');
    assert.ok(await tv.$eval('#tvqr',e=>e.hidden),'QR-Code im Sendebild während des Rennens aus');
    const late=await tv.evaluate(()=>book.slips.length);
    await anna.evaluate(k=>conn.send({t:'bet',key:k,type:'win',a:0,b:-1,stake:1}),await anna.evaluate(()=>st.q.key));
    await anna.waitForSelector('#msg.bad:not([hidden])');assert.equal(await tv.evaluate(()=>book.slips.length),late,'Späte Wette abgelehnt');
    await shot(anna,'handy-rennen');
    step('Rennen läuft: Handy zeigt „'+await anna.textContent('#banner')+'“, späte Wette abgelehnt');

    // Rennen vorspulen bis kurz vor Schluss
    await tv.evaluate(()=>{t=Math.min(race.dur,race.winT+7)-.2});
    await anna.waitForSelector('#res:not([hidden])',{timeout:30000});
    const o=await tv.evaluate(()=>({o:race.order.slice(0,3).map(i=>RUN[i].name),p:book.players.map(p=>[p.name,p.cash])}));
    const shown=await anna.$$eval('#order li',l=>l.map(e=>e.textContent.replace(/^\d+/,'')));
    assert.deepEqual(shown,o.o,'Einlauf am Handy wie am Fernseher');
    const annaCash=+(await anna.textContent('#mecash')).split(' ')[0],benCash=+(await ben.textContent('#mecash')).split(' ')[0];
    assert.deepEqual(o.p,[['Anna',annaCash],['Ben',benCash]],'Kassen gleich');
    await shot(anna,'handy-ergebnis');await shot(ben,'handy-ergebnis-ben');
    step('Abgerechnet. Einlauf '+o.o.join(', ')+'; Anna '+annaCash+', Ben '+benCash+' („'+(await anna.textContent('#paid')).replace(/\s+/g,' ')+'“)');

    // Neues Rennen: Handys sehen neue Quoten und können wieder wetten
    await tv.evaluate(()=>document.getElementById('neu').onclick());
    await anna.waitForSelector('#banner.open,#banner.wait');await anna.waitForSelector('#slip:not([hidden])',{timeout:120000});
    assert.ok(await anna.$eval('#res',e=>e.hidden));
    step('Neues Rennen: Wettschein wieder offen');
    if(errs.length)throw new Error('Fehler auf der Seite: '+errs.join(' | '));
    console.log('Handy-Wetten ok');
  }catch(e){console.error('FEHLER:',e.message);if(errs.length)console.error('Fehler auf der Seite:',errs.join(' | '));for(const c of b.contexts())for(const p of c.pages())console.error('  ',p.url().split('/').pop(),await p.evaluate(()=>(document.getElementById('conn')||document.getElementById('hmsg')).textContent).catch(()=>''));process.exitCode=1}
  finally{await b.close();srv.close();ps.close();process.exit()}
}));
