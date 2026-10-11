// Chaos-Derby – japanischer Live-Kommentar (実況, jikkyō): fängt sachlich an und dreht im Rennverlauf immer mehr ab.
// Diese Tabelle ist die eine Quelle für alle japanischen Sätze:
// - tools/jikkyo-render.js liest sie und erzeugt daraus mit VOICEVOX die Tonaufnahmen in audio/,
// - js/voice.js wählt beim Abspielen über clip() die passende Aufnahme.
// Die deutschen Textzeilen der Simulation bleiben als Untertitel.
const jikkyo=(()=>{
  // Namen der Starter in Katakana, so wie ein japanischer Sprecher sie aussprechen würde; Index wie ROSTER in sim.js
  const N=['ゼクンデンシュラーフ','ハルス・ユーバー・コップフ','ダンプヴァルツェ','シュムッデルヴェッター','アウフレヒター・ガング','シュペーツュンダー',
    'シュトゥアコップフ','プラッツヒルシュ','シュレックハフト','シュリッツオーア','ヘッツヤークト','シュニュッフェルナーゼ'];
  // Ereignisse zählen nach Bahn im aktuellen Feld (0…5), Sätze und Aufnahmen nach Starter (ROSTER-Index)
  const rid=i=>i>=0&&typeof RUN!=='undefined'&&RUN[i]?ROSTER.indexOf(RUN[i]):-1;
  const ALL=N.map((n,i)=>i);
  const BABA=['良','稍重','重'];
  // Grundsätze, sachlich formuliert; i ist der betroffene Starter
  const T={
    start:i=>'さあ、各馬一斉にスタートしました。'+(i>0?'馬場状態は'+BABA[i]+'です。':''),
    rain:()=>'雨が降ってきました。シュムッデルヴェッターが目を覚まします。',
    rainstop:()=>'雨が上がりました。シュムッデルヴェッター、またのんびり歩き始めます。',
    sleep:()=>N[0]+'、先頭で横になりました。寝ています。',
    jub:i=>N[i]+'、もうガッツポーズ。早すぎます。',
    eat:()=>N[1]+'、花飾りを見つけて食べ始めました。',
    charge:()=>N[2]+'、頭を下げました。皆さん、よけてください。',
    slip:()=>N[4]+'、足を滑らせました。',
    back:()=>N[4]+'、くるりと向きを変えて、逆走しています。',
    rocketwrong:()=>'点火。しかし、ロケットが逆を向いています。',
    rocket:()=>'点火。'+N[5]+'のロケットが火を噴きました。',
    howl:()=>N[3]+'、雲に向かって遠吠えです。何かが近づいてきます。',
    explode:()=>'ロケットが爆発しました。'+N[5]+'、歩いて進みます。',
    knock:i=>N[2]+'が'+N[i]+'をはね飛ばしました。',
    lead1:i=>N[i]+'が先頭に立ちました。',
    lead:i=>'先頭が変わります。'+N[i]+'です。',
    m200:()=>'残り200メートル。',
    stretch:()=>N[1]+'、首をぐーんと伸ばしています。',
    stand:i=>'先頭は'+N[i]+'。',
    // Eigenheiten der Starter 7 bis 12
    stubborn:()=>N[6]+'、突然立ち止まりました。もう走りたくないようです。',
    unstubborn:()=>N[6]+'、抜かれて、しぶしぶ走り出しました。',
    crash:()=>N[7]+'、ジャンプに失敗、顔から着地です。',
    scare:()=>N[8]+'、びっくりして固まってしまいました。',
    spook:()=>N[8]+'、蝶々に驚いて立ち止まりました。',
    hunt:()=>N[10]+'、前を行く馬に狙いを定めました。逃げろ、逃げろ。',
    sniff:()=>N[11]+'、何かの匂いを嗅いでいます。',
    zoom:()=>N[11]+'、突然スイッチが入りました。猛ダッシュです。',
    draft:()=>N[9]+'、前の馬の後ろにぴったりつけています。',
    draftout:()=>N[9]+'、陰から飛び出した！',
    // Fehlschläge mit Kettenreaktion
    trip:()=>'後ろの馬も巻き込まれました！',
    pileup:()=>N[0]+'につまずいて、後続が転倒！',
    chargefail:()=>N[2]+'、つまずいて転倒！後ろも巻き込まれます！',
    rocketram:()=>'ロケットが逆走して、次々となぎ倒していきます！',
    blast:()=>'爆風で周りの馬も吹き飛ばされました！',
    landon:()=>N[7]+'、ほかの馬の上に着地！両者転倒！',
    bullturn:()=>N[10]+'、相手を間違えました！'+N[2]+'が振り向いた！',
    kick:()=>N[6]+'の後ろ蹴りが炸裂！',
    freeze:()=>N[8]+'、逃げずに固まってしまいました。',
    zoomhit:()=>N[11]+'、ジグザグに走って体当たり！',
    headon:()=>N[4]+'、逆走して正面衝突！',
    rearend:()=>N[9]+'、前の馬に追突しました！',
    bump:()=>N[8]+'が急に止まって、後ろが追突！',
    howlalong:()=>N[10]+'もつられて遠吠えです。'
  };
  // Welche Starter ein Satz betreffen kann (-1: keiner)
  const WHO={start:[0,1,2],jub:[0,4],knock:ALL.filter(i=>i!==2),lead1:ALL,lead:ALL,stand:ALL};
  // Regen ohne Husky im Feld: eigener Satz, dafür gibt es keine Aufnahme
  const RAIN={rain:'雨が降ってきました。',rainstop:'雨が上がりました。'};
  const noHusky=e=>RAIN[e.k]&&e.i<0;
  const ONLY0={start:1,lead1:1};          // fallen immer in die ruhige Anfangsphase
  // Zuschnitt je Stufe: 0 sachlich, 1 lebhaft, 2 aufgeregt, 3 außer sich; je Stufe zwei Fassungen ab Stufe 2
  const LEAD1='おっと、',LEAD2=['なんと！','これは！'],LEAD3=['うわあああああ！','な、な、なんということだ！'];
  const TAIL3=['信じられません！','実況席も大混乱です！'];
  const VARS=[1,1,2,2];
  function dress(s,i,lv,v){
    if(lv===1)return LEAD1+s;
    if(lv>=2)s=s.replace(/。/g,'！');
    if(lv===2)return LEAD2[v]+s;
    if(lv===3)return LEAD3[v]+(i>=0&&v===0?N[i]+'！':'')+s.replace(/！/g,'！！')+TAIL3[v];
    return s;
  }
  // Ausbrüche ohne Anlass für Pausen, wenn der Sprecher schon die Fassung verloren hat (Stufe 2 und 3)
  const RANT=['もう何が何だか分かりません！','わたくし実況三十年、こんなレースは初めてです！','解説の田中さん、どう思いますか？……田中さん？田中さーん！',
    '皆さん、落ち着いてください！わたくしは落ち着いていません！','これは夢でしょうか！誰かつねってください！'];
  // Satzbausteine für den Einlauf, ruhig und außer Atem
  const EIN={intro:'はあ、はあ……。失礼しました。結果をお伝えします。',p1:'一着、',p2:'二着、',p3:'三着、'};
  const id=(k,i,lv,v)=>k+'.'+i+'.'+lv+'.'+v;
  // Stufe der Aufregung aus dem Wert m (0…1)
  const level=m=>m<.3?0:m<.55?1:m<.8?2:3;
  return {
    N,level,
    // alle Aufnahmen: {id, text, lv}; lv bestimmt die Stimmlage beim Erzeugen ('win' und 'calm' sind eigene Lagen)
    all(){
      const out=[];
      for(const k in T)for(const i of WHO[k]||[-1])for(let lv=0;lv<(ONLY0[k]?1:4);lv++)for(let v=0;v<VARS[lv];v++)
        out.push({id:id(k,i,lv,v),text:dress(T[k](i),i,lv,v),lv});
      for(const i of ALL){
        out.push({id:id('win',i,3,0),text:'ゴール！ゴール！ゴーーール！'+N[i]+'、優勝です！',lv:'win'});
        out.push({id:id('close',i,3,0),text:'大接戦！'+N[i]+'、鼻差の二着！',lv:'win'});
        out.push({id:'name.'+i,text:N[i]+'。',lv:'calm'});
      }
      for(const k in EIN)out.push({id:'ein.'+k,text:EIN[k],lv:'calm'});
      RANT.forEach((s,r)=>{for(const lv of [2,3])out.push({id:'rant.'+r+'.'+lv,text:s,lv})});
      return out;
    },
    // Aufnahmen für ein Ereignis e (Felder k, i, b, o) bei Aufregung m; liefert eine Liste von ids oder null
    clips(e,m,has){
      const pick=(k,i,lv)=>{for(let l=lv;l>=0;l--){const n=VARS[l],v0=Math.floor(Math.random()*n);
        for(let q=0;q<n;q++){const c=id(k,i,l,(v0+q)%n);if(has(c))return c}}return null};
      if(e.rant){const r=Math.floor(Math.random()*RANT.length),c='rant.'+r+'.'+(level(m)>=3?3:2);return has(c)?[c]:null}
      if(e.k==='win'||e.k==='close'){const c=id(e.k,rid(e.i),3,0);return has(c)?[c]:null}
      if(e.k==='einlauf'){const o=e.o.map(rid),l=['ein.intro','ein.p1','name.'+o[0],'ein.p2','name.'+o[1],'ein.p3','name.'+o[2]];return l.every(has)?l:null}
      if(!T[e.k]||noHusky(e))return null;
      const i=e.k==='start'?(e.b|0):e.k==='stand'?rid(e.a):WHO[e.k]?rid(e.i):-1;
      const c=pick(e.k,i,ONLY0[e.k]?0:level(m));
      return c?[c]:null;
    },
    // Satz für die Sprachausgabe des Browsers, falls die Aufnahmen fehlen
    text(e,m){
      if(e.rant)return RANT[Math.floor(Math.random()*RANT.length)];
      if(e.k==='win')return 'ゴール！ゴール！ゴーーール！'+N[rid(e.i)]+'、優勝です！';
      if(e.k==='close')return '大接戦！'+N[rid(e.i)]+'、鼻差の二着！';
      if(e.k==='einlauf'){const o=e.o.map(rid);return EIN.intro+EIN.p1+N[o[0]]+'。'+EIN.p2+N[o[1]]+'。'+EIN.p3+N[o[2]]+'。'}
      if(noHusky(e))return RAIN[e.k];
      if(!T[e.k])return null;
      const i=e.k==='start'?(e.b|0):e.k==='stand'?rid(e.a):WHO[e.k]?rid(e.i):-1,lv=ONLY0[e.k]?0:level(m);
      return dress(T[e.k](i),i,lv,Math.floor(Math.random()*VARS[lv]));
    }
  };
})();
if(typeof module!=='undefined')module.exports=jikkyo;
