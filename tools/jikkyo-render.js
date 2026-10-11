// Erzeugt die Tonaufnahmen des japanischen Kommentators mit VOICEVOX und packt sie in eine Datei.
// Voraussetzung: eine laufende VOICEVOX-Engine, z. B.
//   docker run -d -p 50021:50021 voicevox/voicevox_engine:cpu-latest
// und ffmpeg. Aufruf: node tools/jikkyo-render.js [Cache-Ordner]
// Ergebnis: audio/jikkyo.mp3 (alle Aufnahmen hintereinander) und audio/jikkyo.json (Start und Länge je Aufnahme).
// Stimme: VOICEVOX:青山龍星. Nutzung mit dieser Nennung erlaubt (siehe README).
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),{execFileSync}=require('child_process');
const jikkyo=require('../js/jikkyo.js');
const HOST=process.env.VOICEVOX||'http://localhost:50021';
const CACHE=process.argv[2]||path.join(os.tmpdir(),'jikkyo-cache');
const OUT=path.join(__dirname,'..','audio');
const RATE=24000,GAP=.25;
// Stimmlage je Stufe: 13 = 青山龍星 ノーマル, 81 = 青山龍星 熱血
const VOICE={
  0:{sp:13,speed:1.05,pitch:0,into:1.1,vol:1},
  1:{sp:13,speed:1.15,pitch:.02,into:1.45,vol:1.1},
  2:{sp:81,speed:1.22,pitch:.04,into:1.55,vol:1.2},
  3:{sp:81,speed:1.35,pitch:.08,into:1.85,vol:1.3},
  win:{sp:81,speed:1.25,pitch:.1,into:2,vol:1.4},
  calm:{sp:13,speed:1,pitch:-.01,into:1,vol:1}
};
async function synth(text,v){
  const q=await (await fetch(HOST+'/audio_query?speaker='+v.sp+'&text='+encodeURIComponent(text),{method:'POST'})).json();
  Object.assign(q,{speedScale:v.speed,pitchScale:v.pitch,intonationScale:v.into,volumeScale:v.vol,outputSamplingRate:RATE,outputStereo:false,prePhonemeLength:.05,postPhonemeLength:.1});
  const r=await fetch(HOST+'/synthesis?speaker='+v.sp,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(q)});
  if(!r.ok)throw new Error('VOICEVOX '+r.status+' bei '+text);
  return Buffer.from(await r.arrayBuffer());
}
// PCM-Daten aus einer WAV-Datei (16 Bit, mono) holen
function pcm(wav){let o=12;while(o<wav.length){const id=wav.toString('ascii',o,o+4),n=wav.readUInt32LE(o+4);if(id==='data')return wav.subarray(o+8,o+8+n);o+=8+n}throw new Error('keine Daten')}
(async()=>{
  fs.mkdirSync(CACHE,{recursive:true});fs.mkdirSync(OUT,{recursive:true});
  const list=jikkyo.all(),parts=[],map={},gap=Buffer.alloc(Math.round(RATE*GAP)*2);
  let pos=0,k=0;
  for(const c of list){
    const v=VOICE[c.lv],h=crypto.createHash('sha1').update(JSON.stringify([c.text,v])).digest('hex').slice(0,16),f=path.join(CACHE,h+'.wav');
    if(!fs.existsSync(f))fs.writeFileSync(f,await synth(c.text,v));
    const d=pcm(fs.readFileSync(f));
    parts.push(gap,d);pos+=gap.length/2;map[c.id]=[+(pos/RATE).toFixed(3),+(d.length/2/RATE).toFixed(3)];pos+=d.length/2;
    if(++k%20===0)console.log(k+'/'+list.length);
  }
  parts.push(gap);
  const raw=path.join(CACHE,'all.raw');fs.writeFileSync(raw,Buffer.concat(parts));
  execFileSync('ffmpeg',['-y','-loglevel','error','-f','s16le','-ar',String(RATE),'-ac','1','-i',raw,'-codec:a','libmp3lame','-b:a','48k',path.join(OUT,'jikkyo.mp3')]);
  fs.writeFileSync(path.join(OUT,'jikkyo.json'),JSON.stringify(map));
  console.log(list.length+' Aufnahmen, '+(pos/RATE).toFixed(0)+' s, '+(fs.statSync(path.join(OUT,'jikkyo.mp3')).size/1e6).toFixed(1)+' MB');
})().catch(e=>{console.error(e.message);process.exit(1)});
