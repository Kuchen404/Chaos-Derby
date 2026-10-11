// Chaos-Derby – Rennsimulation: Starter, Ereignisse, Kommentar. Läuft im Browser und in Node (siehe tools/odds.js).
const L=1000, DT=1/30, FIELD=6;
// Alle Starter. Pro Rennen laufen FIELD davon (siehe drawField); die Startnummer bleibt fest.
// v: Grundtempo m/s, late: Faktor für die zweite Rennhälfte, rain: Faktor bei Regen, bod: Faktor je Bahnzustand [gut, weich, schwer]
const ROSTER=[
 {id:'pferd',nr:1,name:'Sekundenschlaf',kind:'Pferd',trait:'Schnell, schläft in Führung aber gern ein',col:'#d2232a',ink:'#fff',v:23.16,late:-.04,rain:.85,bod:[1,.97,.95]},
 {id:'alpaka',nr:2,name:'Hals über Kopf',kind:'Alpaka',trait:'Streckt im Ziel den Hals, frisst unterwegs',col:'#f2b600',ink:'#111',v:22.52,late:.02,rain:.85,bod:[1,.99,.97]},
 {id:'stier',nr:3,name:'Dampfwalze',kind:'Stier',trait:'Langsam, räumt beim Sturmlauf alles ab',col:'#2f6fb8',ink:'#fff',v:19.17,late:.03,rain:.95,bod:[1,1,.99]},
 {id:'husky',nr:4,name:'Schmuddelwetter',kind:'Husky',trait:'Trottet lustlos, außer es regnet',col:'#12a08f',ink:'#fff',v:16.79,late:0,rain:2.33,bod:[1,1,1]},
 {id:'aufrecht',nr:5,name:'Aufrechter Gang',kind:'Pferd auf zwei Beinen',trait:'Der Schnellste, läuft manchmal zurück',col:'#8e44ad',ink:'#fff',v:25.15,late:0,rain:.8,bod:[1,.97,.95]},
 {id:'kuh',nr:6,name:'Spätzünder',kind:'Kuh mit Rakete',trait:'Trottet, bis die Rakete zündet',col:'#e0559b',ink:'#fff',v:11.8,late:0,rain:1,bod:[1,.98,.96]},
 {id:'esel',nr:7,name:'Sturkopf',kind:'Esel',trait:'Bleibt stur stehen, bis ihn einer überholt',col:'#ef7d1a',ink:'#111',v:22.45,late:.02,rain:.95,bod:[1,.99,.97]},
 {id:'hirsch',nr:8,name:'Platzhirsch',kind:'Hirsch',trait:'Springt in großen Sätzen, landet nicht immer',col:'#7a4b2a',ink:'#fff',v:21.76,late:0,rain:.9,bod:[1,.98,.95]},
 {id:'reh',nr:9,name:'Schreckhaft',kind:'Reh',trait:'Sehr schnell, erstarrt aber bei jedem Krach',col:'#f4f4f4',ink:'#111',v:23.15,late:0,rain:.85,bod:[1,.97,.94]},
 {id:'fuchs',nr:10,name:'Schlitzohr',kind:'Fuchs',trait:'Hängt sich hinter andere und zieht spät vorbei',col:'#8bc34a',ink:'#111',v:20.71,late:0,rain:.9,bod:[1,.99,.97]},
 {id:'wolf',nr:11,name:'Hetzjagd',kind:'Wolf',trait:'Jagt den Vordermann, der rennt dann um sein Leben',col:'#3a3f47',ink:'#fff',v:21.17,late:0,rain:1,bod:[1,1,.99]},
 {id:'shiba',nr:12,name:'Schnüffelnase',kind:'Shiba Inu',trait:'Schnüffelt herum, bekommt dann seine fünf Minuten',col:'#1c2f6b',ink:'#fff',v:22.39,late:0,rain:.8,bod:[1,.97,.94]}
];
const CLASSIC=[0,1,2,3,4,5];   // das ursprüngliche Feld
// Das Feld des aktuellen Rennens, Index = Bahn. Im Browser lesen Darstellung und Wetten daraus; setField tauscht den Inhalt aus.
const RUN=CLASSIC.map(k=>ROSTER[k]);
function setField(f){RUN.length=0;f.forEach(k=>RUN.push(ROSTER[k]))}
// Zieht FIELD verschiedene Starter, sortiert nach Startnummer. u: Zufallsquelle 0…1
function drawField(u){const a=ROSTER.map((d,k)=>k);for(let k=a.length-1;k>0;k--){const j=Math.floor(u()*(k+1));[a[k],a[j]]=[a[j],a[k]]}return a.slice(0,FIELD).sort((x,y)=>x-y)}
// Bahnzustand: wird vor dem Rennen ausgelost und angesagt, damit die Quoten ihn schon enthalten
const BODEN=[{name:'gut',p:.5},{name:'weich',p:.3},{name:'schwer',p:.2}];
function drawBoden(u){let a=0;for(let k=0;k<BODEN.length;k++){a+=BODEN[k].p;if(u<a)return k}return BODEN.length-1}
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
// Wie weit die Nase vor der Position liegt: das Alpaka streckt im Ziel den Hals
const nose=(d,x)=>d.id==='alpaka'?2+4*clamp((x-(L-90))/60,0,1):0;
// Zustände: 0 läuft, 1 schläft, 2 purzelt, 3 frisst, 4 Sturmlauf, 6 Rakete, 7 läuft zurück, 8 jubelt zu früh, 9 Rakete verkehrt herum,
// 10 bockt, 11 springt, 12 erstarrt, 13 jagt, 14 schnüffelt, 15 Zoomies
const STOP=[1,2,3,8,10,12,14];
// bod: Index in BODEN (Standard 0 = gut), field: ROSTER-Indizes der Starter (Standard CLASSIC)
function simulate(seed,rec,bod,field){
  const F=(field||CLASSIC).map(k=>ROSTER[k]),n=F.length,R=rng(seed);
  const rs=F.map(()=>({x:0,st:0,T:0,n:0,fin:-1,used:false,fl:0,dr:-1,ahead:0}));
  const has=id=>F.findIndex(d=>d.id===id);
  const order=[],frames=[],ev=[]; let t=0,lead=-1,leadT=0,m200=false,stretch=false,winT=-1,wasRain=false,howl=false,foxT=-9;
  bod=bod|0;
  let rain0=R()<.45?8+R()*20:-1, rain1=rain0+10;
  // p: Gewicht für den gesprochenen Kommentar, 3 = Zieleinlauf, 2 = Ereignis, 1 = Rest
  // k: Art des Ereignisses, damit die Wiedergabe es auch in anderen Sprachen ansagen kann; j: zweiter beteiligter Starter
  const say=(s,i,cut,p,k,j)=>{if(rec)ev.push({t,s,i,cut,p:p||(cut?2:1),k,j:j==null?-1:j})};
  const p=h=>R()<h*DT;
  // Laute Ereignisse (Sturmlauf, Rakete, Stürze, Jagd, Zoomies): Ein Reh in der Nähe erschrickt und erstarrt
  function scare(i){for(let j=0;j<n;j++){const r=rs[j];
    if(j!==i&&F[j].id==='reh'&&r.st===0&&r.fin<0&&Math.abs(r.x-rs[i].x)<18&&R()<.7){r.st=12;r.T=1.4+R()*1.2;say(F[j].name+' erschrickt und bleibt wie angewurzelt stehen.',j,1.8,0,'scare',i)}}}
  const hu=has('husky'),huN=hu>=0?F[hu].name:'';
  say(bod?'Das Feld ist unterwegs. Der Boden ist '+BODEN[bod].name+'.':'Das Feld ist unterwegs.',-1,0,1,'start');
  while(order.length<n&&t<150){
    const rain=rain0>=0&&t>=rain0&&t<rain1;
    if(rain!==wasRain){wasRain=rain;
      if(hu>=0)say(rain?'Es beginnt zu regnen. Jetzt wacht '+huN+' auf.':'Der Regen hört auf. '+huN+' trottet wieder.',hu,rain?2.4:0,0,rain?'rain':'rainstop');
      else say(rain?'Es beginnt zu regnen.':'Der Regen hört auf.',-1,0,1,rain?'rain':'rainstop')}
    let li=-1,lx=-1,l2=-1,cross=[]; for(let i=0;i<n;i++)if(rs[i].fin<0){if(rs[i].x>lx){l2=lx;lx=rs[i].x;li=i}else if(rs[i].x>l2)l2=rs[i].x}
    for(let i=0;i<n;i++){
      const r=rs[i],d=F[i],id=d.id;
      r.n=r.n*.97+(R()-.5)*.05;
      if(r.T>0){r.T-=DT;if(r.T<=0)r.st=0}
      if(r.fl>0)r.fl-=DT;
      let v=d.v*(1+r.n)*(1+d.late*(r.x/L-.5))*d.bod[bod];
      const z=r.x>L-200?1.5:1;   // Zielgerade: Pannen werden häufiger
      if(r.fin>=0){v*=.6}
      else{
        if(r.st===0&&t>3){
          if(id==='pferd'&&i===li&&r.x>150&&p(.035)){r.st=1;r.T=3.5+R()*2.5;say(d.name+' führt und legt sich hin. Er schläft.',i,2.6,0,'sleep')}
          else if((id==='pferd'||id==='aufrecht')&&!r.jub&&i===li&&r.x>L-80&&r.x<L-35&&lx-l2>9&&p(.16)){r.st=8;r.jub=true;r.T=1+R()*.6;say(id==='pferd'?d.name+' jubelt schon. Viel zu früh!':d.name+' reißt die Arme hoch. Er jubelt zu früh!',i,1.5,0,'jub')}
          else if(id==='alpaka'&&p(.015*z)){r.st=3;r.T=2+R()*1.5;say(d.name+' hat den Blumenschmuck entdeckt und frisst.',i,2.2,0,'eat')}
          else if(id==='stier'&&p(.03*z)){r.st=4;r.T=4;say(d.name+' senkt den Kopf. Bitte alle zur Seite.',i,4,0,'charge');scare(i)}
          else if(id==='aufrecht'&&(rain&&p(.08)||bod===2&&p(.012))){r.st=2;r.T=2.2;say(rain?d.name+' rutscht auf dem nassen Gras aus.':d.name+' rutscht im tiefen Boden aus.',i,2,0,'slip');scare(i)}
          else if(id==='aufrecht'&&p(.045*z)){r.st=7;r.T=1.8+R()*1.4;say(d.name+' hat sich umgedreht. Er läuft zurück.',i,2,0,'back')}
          else if(id==='kuh'&&!r.used&&t>6&&p(.026*(z>1?2.5:1))){r.used=true;
            if(R()<.15){r.st=9;r.T=1+R()*.5;say('Zündung! Aber die Rakete zeigt in die falsche Richtung.',i,2.6,0,'rocketwrong')}
            else{r.st=6;say('Zündung! Die Rakete von '+d.name+' brennt.',i,2.6,0,'rocket')}
            scare(i)}
          else if(id==='husky'&&!howl&&!rain&&rain0<0&&t>5&&p(.006)){howl=true;rain0=t+1.5;rain1=rain0+10;say(d.name+' heult die Wolken an. Da zieht etwas auf.',i,1.8,0,'howl')}
          // Esel: bleibt stehen, bis ihn jemand überholt (höchstens 7 s)
          else if(id==='esel'&&r.x>60&&p(.035*z)){r.st=10;r.T=7;r.ahead=rs.filter(q=>q.x>r.x).length;say(d.name+' bleibt einfach stehen. Er will nicht mehr.',i,2.2,0,'stubborn')}
          // Hirsch: großer Satz nach vorn, jeder sechste geht schief
          else if(id==='hirsch'&&p(.06)){if(R()<.17){r.st=2;r.T=2.2;say(d.name+' setzt zum Sprung an und landet auf der Nase.',i,2,0,'crash');scare(i)}else{r.st=11;r.T=.9}}
          // Reh: erschrickt auch ohne Grund
          else if(id==='reh'&&p(.016)){r.st=12;r.T=1.4+R()*1.2;say(d.name+' erschrickt vor einem Schmetterling.',i,1.8,0,'spook')}
          // Wolf: jagt den Vordermann, der flieht schneller als sonst
          else if(id==='wolf'&&p(.05)){let tg=-1,gx=1e9;for(let j=0;j<n;j++){const g=rs[j].x-r.x;if(j!==i&&rs[j].fin<0&&g>4&&g<20&&g<gx){gx=g;tg=j}}
            if(tg>=0){const q=rs[tg];r.st=13;r.T=3;q.fl=3;if(STOP.includes(q.st)&&q.st!==2){q.st=0;q.T=0}
              say(d.name+' hat '+F[tg].name+' im Visier. '+F[tg].name+' rennt um sein Leben.',i,2.2,0,'hunt',tg);scare(i)}}
          else if(id==='shiba'&&p(.025*z)){r.st=14;r.T=1.8+R()*1.4;say(d.name+' hat eine Spur gefunden und schnüffelt.',i,2,0,'sniff')}
          else if(id==='shiba'&&p(.018)){r.st=15;r.T=2.5;say(d.name+' bekommt seine fünf Minuten und rast los.',i,2.2,0,'zoom');scare(i)}
        }else if(r.st===6&&p(.13)){r.st=2;r.T=3;say('Die Rakete ist explodiert. '+d.name+' geht zu Fuß weiter.',i,2.4,0,'explode');scare(i)}
        else if(r.st===9&&r.T<=DT){r.st=2;r.T=3;say('Die Rakete ist explodiert. '+d.name+' sortiert sich neu.',i,2.4,0,'explode');scare(i)}
        else if(r.st===10){const a=rs.filter(q=>q.x>r.x).length;if(a>r.ahead){const by=rs.findIndex((q,j)=>j!==i&&q.x>r.x&&q.x-r.x<3);r.st=0;r.T=0;say(by>=0?F[by].name+' zieht vorbei. Jetzt trottet '+d.name+' beleidigt hinterher.':d.name+' setzt sich wieder in Bewegung.',i,0,1,'unstubborn',by)}}
        if(STOP.includes(r.st))v=0;
        else if(r.st===4)v*=1.7;else if(r.st===7)v*=-.6;else if(r.st===6)v=70;else if(r.st===9)v=-35;
        else if(r.st===11)v*=1.8;else if(r.st===13)v*=1.45;else if(r.st===15)v*=1.9;
        if(r.fl>0&&!STOP.includes(r.st)&&r.st!==6&&r.st!==9)v*=1.25;
        // Fuchs: im Windschatten eines Vordermanns schneller, auf den letzten 150 m zieht er heraus
        if(id==='fuchs'&&r.st===0){let dr=-1;for(let j=0;j<n;j++){const g=rs[j].x-r.x;if(j!==i&&rs[j].fin<0&&g>.5&&g<6&&!STOP.includes(rs[j].st)){dr=j;break}}
          if(dr>=0){const late=r.x>L-150;v*=late?1.3:1.12;
            if(r.dr<0&&t>6&&(late||dr===li)&&t-foxT>12){foxT=t;say(late?d.name+' kommt aus dem Windschatten von '+F[dr].name+'!':d.name+' hängt sich in den Windschatten von '+F[dr].name+'.',i,late?1.6:0,0,late?'draftout':'draft',dr)}}
          r.dr=dr}
        if(rain&&r.st!==6&&r.st!==9)v*=d.rain;
      }
      const x0=r.x;r.x+=v*DT;
      // Zieldurchgang auf den Bruchteil des Zeitschritts genau, damit Zielfoto und Einlauf übereinstimmen
      if(r.fin<0&&r.x+nose(d,r.x)>=L){const a0=x0+nose(d,x0),a1=r.x+nose(d,r.x);r.fin=t-DT+DT*clamp((L-a0)/(a1-a0),0,1);r.st=0;r.T=0;cross.push(i)}
    }
    cross.sort((a,b)=>rs[a].fin-rs[b].fin).forEach(i=>{
      order.push(i);
      if(order.length===1){winT=rs[i].fin;say(F[i].name+' gewinnt!',i,0,3,'win')}
      else if(order.length===2&&rs[i].fin-winT<.2)say('Das war eng. '+F[i].name+' nur eine Nasenlänge dahinter.',i,0,3,'close');
    });
    for(let e=0;e<n;e++){const b=rs[e];if(F[e].id!=='stier'||b.st!==4||b.fin>=0)continue;
      for(let j=0;j<n;j++){const r=rs[j];
        if(j!==e&&r.fin<0&&r.st!==2&&r.st!==6&&r.st!==9&&r.st!==11&&Math.abs(r.x-b.x)<5){r.st=2;r.T=2.2;say(F[e].name+' räumt '+F[j].name+' ab.',j,0,2,'knock',e);scare(j)}}}
    if(!order.length&&t>4&&li!==lead&&t-leadT>2.5){say(F[li].name+(lead<0?' führt das Feld an.':' übernimmt die Führung.'),li,0,1,lead<0?'lead1':'lead');lead=li;leadT=t}
    if(!m200&&lx>=L-200){m200=true;say('Noch 200 Meter.',-1,0,2,'m200')}
    const al=has('alpaka');
    if(!stretch&&al>=0&&rs[al].fin<0&&rs[al].x>=L-90){stretch=true;say(F[al].name+' streckt den Hals nach vorn.',al,0,2,'stretch')}
    if(rec)frames.push({x:rs.map(r=>r.x),s:rs.map(r=>r.st),rain});
    t+=DT;
  }
  rs.map((r,i)=>i).filter(i=>rs[i].fin<0).sort((a,b)=>rs[b].x-rs[a].x).forEach(i=>order.push(i));
  return {order,frames,ev,dur:t,winT,fin:rs.map(r=>r.fin),field:(field||CLASSIC).slice()};
}

if(typeof module!=='undefined')module.exports={simulate,ROSTER,CLASSIC,RUN,FIELD,setField,drawField,L,BODEN,drawBoden,nose,rng};
