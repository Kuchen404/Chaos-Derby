// Chaos-Derby – gemeinsam für Fernseher (Host) und Handy: Raumcode und Zugang zum Vermittlungsserver.
// Der Server (PeerJS, öffentlich und kostenlos) stellt nur die Verbindung her, danach reden Handy und Host direkt miteinander (WebRTC).
const LINK={
  pre:'chaosderby-',
  ABC:'ABCDEFGHJKMNPQRSTUVWXYZ23456789',      // ohne 0/O und 1/I/L, damit man den Code auch abtippen kann
  newCode(){let s='';for(let k=0;k<5;k++)s+=LINK.ABC[Math.floor(Math.random()*LINK.ABC.length)];return s},
  clean:c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5),
  id:c=>LINK.pre+LINK.clean(c).toLowerCase(),
  // ?peer=http://localhost:9000 nimmt einen eigenen PeerJS-Server statt des öffentlichen (zum Testen, siehe tools/handy-test.js)
  srv:new URLSearchParams(location.search).get('peer')||'',
  opts(){
    const o={debug:0};if(!LINK.srv)return o;
    const u=new URL(LINK.srv);
    return Object.assign(o,{host:u.hostname,port:+u.port||(u.protocol==='https:'?443:80),path:u.pathname||'/',secure:u.protocol==='https:'})},
  // Adresse der Handy-Seite für den QR-Code, neben index.html
  phoneUrl(c){return location.origin+location.pathname.replace(/[^/]*$/,'')+'handy.html?raum='+LINK.clean(c)+(LINK.srv?'&peer='+encodeURIComponent(LINK.srv):'')}
};
