// Chaos-Derby – japanischer Live-Kommentar (実況, jikkyō): fängt sachlich an und dreht im Rennverlauf immer mehr ab.
// Baut aus einem Ereignis der Simulation (Feld k) und dem Grad der Aufregung m (0…1) einen japanischen Satz.
// Die deutschen Textzeilen bleiben als Untertitel; hier entsteht nur, was gesprochen wird.
const jikkyo=(()=>{
  // Namen der Starter in Katakana, so wie ein japanischer Sprecher sie aussprechen würde
  const N=['ゼクンデンシュラーフ','ハルス・ユーバー・コップフ','ダンプヴァルツェ','シュムッデルヴェッター','アウフレヒター・ガング','シュペーツュンダー'];
  const BABA=['良','稍重','重'];
  const any=a=>a[Math.floor(Math.random()*a.length)];
  // Grundsätze, sachlich formuliert; e.i ist der betroffene Starter
  const T={
    start:e=>'さあ、各馬一斉にスタートしました。'+(e.b?'馬場状態は'+BABA[e.b]+'です。':''),
    rain:()=>'雨が降ってきました。シュムッデルヴェッターが目を覚まします。',
    rainstop:()=>'雨が上がりました。シュムッデルヴェッター、またのんびり歩き始めます。',
    sleep:()=>N[0]+'、先頭で横になりました。寝ています。',
    jub:e=>N[e.i]+'、もうガッツポーズ。早すぎます。',
    eat:()=>N[1]+'、花飾りを見つけて食べ始めました。',
    charge:()=>N[2]+'、頭を下げました。皆さん、よけてください。',
    slip:()=>N[4]+'、足を滑らせました。',
    back:()=>N[4]+'、くるりと向きを変えて、逆走しています。',
    rocketwrong:()=>'点火。しかし、ロケットが逆を向いています。',
    rocket:()=>'点火。'+N[5]+'のロケットが火を噴きました。',
    howl:()=>N[3]+'、雲に向かって遠吠えです。何かが近づいてきます。',
    explode:()=>'ロケットが爆発しました。'+N[5]+'、歩いて進みます。',
    knock:e=>N[2]+'が'+N[e.i]+'をはね飛ばしました。',
    lead1:e=>N[e.i]+'が先頭に立ちました。',
    lead:e=>'先頭が変わります。'+N[e.i]+'です。',
    m200:()=>'残り200メートル。',
    stretch:()=>N[1]+'、首をぐーんと伸ばしています。',
    stand:e=>e.gap<3?'先頭は'+N[e.a]+'と'+N[e.b]+'、並んでいます。'
      :e.tail?'先頭は'+N[e.a]+'、最後方は'+N[e.z]+'。'
      :N[e.a]+'がリード、'+e.gap+'メートル差で'+N[e.b]+'。',
    win:e=>'ゴール！ゴール！ゴーーール！'+N[e.i]+'、優勝です！',
    close:e=>'大接戦！'+N[e.i]+'、鼻差の二着！',
    einlauf:e=>'はあ、はあ……。失礼しました。結果をお伝えします。一着、'+N[e.o[0]]+'。二着、'+N[e.o[1]]+'。三着、'+N[e.o[2]]+'。'
  };
  const LEAD1=['おっと、','さあ、','おおっと、'];
  const LEAD2=['なんと！','これは！','おおおっと！','ええっ！'];
  const LEAD3=['うわあああああ！','ぎゃあああああ！','な、な、なんということだ！','ちょ、ちょっと待ってください！'];
  const TAIL3=['信じられません！','もうめちゃくちゃです！','実況席も大混乱です！','誰か止めてください！','これが競馬なのでしょうか！'];
  // Ausbrüche ohne Anlass für Pausen, wenn der Sprecher schon die Fassung verloren hat
  const RANT=['もう何が何だか分かりません！','わたくし実況三十年、こんなレースは初めてです！','解説の田中さん、どう思いますか？……田中さん？田中さーん！',
    '皆さん、落ち着いてください！わたくしは落ち着いていません！','これは夢でしょうか！誰かつねってください！'];
  return {
    // Grad 0 sachlich, 1 lebhaft, 2 aufgeregt, 3 außer sich
    level:m=>m<.3?0:m<.55?1:m<.8?2:3,
    line(e,m){
      const f=T[e.k];if(!f)return null;
      let s=f(e);const lv=this.level(m);
      if(e.k==='win'||e.k==='close'||e.k==='einlauf')return s;   // haben ihre eigene Tonlage
      if(lv>=2)s=s.replace(/。/g,'！');
      if(lv>=3){s=s.replace(/！/g,'！！');if(e.i>=0&&N[e.i]&&Math.random()<.6)s=N[e.i]+'！'+s}
      if(lv===1&&Math.random()<.6)s=any(LEAD1)+s;
      else if(lv===2)s=any(LEAD2)+s;
      else if(lv>=3)s=any(LEAD3)+s+any(TAIL3);
      return s;
    },
    rant:()=>any(RANT)
  };
})();
