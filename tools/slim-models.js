// Verkleinert die Originalmodelle von Quaternius auf die Animationen, die das Spiel benutzt,
// und schreibt sie nach models/. Aufruf: node tools/slim-models.js <Ordner mit den Original-glTF>
const fs=require('fs'),path=require('path');
const src=process.argv[2];if(!src){console.error('Ordner mit den Original-glTF angeben');process.exit(1)}
const JOBS={horse:['Horse.gltf',['Gallop','Death','Idle','Walk']],alpaca:['Alpaca.gltf',['Gallop','Idle','Eating']],bull:['Bull.gltf',['Gallop','Idle']],husky:['Husky.gltf',['Gallop','Idle','Walk']],cow:['Cow.gltf',['Walk','Idle']]};
const out=path.join(__dirname,'..','models');
for(const k in JOBS){
  const [file,keep]=JOBS[k],g=JSON.parse(fs.readFileSync(path.join(src,file),'utf8'));
  const buf=Buffer.from(g.buffers[0].uri.split(',')[1],'base64');
  g.animations=g.animations.filter(a=>keep.includes(a.name));
  if(g.animations.length!==keep.length)throw new Error(k+': Animation fehlt');
  const used=new Set();
  g.meshes.forEach(m=>m.primitives.forEach(p=>{Object.values(p.attributes).forEach(a=>used.add(a));if(p.indices!=null)used.add(p.indices)}));
  g.skins.forEach(s=>used.add(s.inverseBindMatrices));
  g.animations.forEach(a=>a.samplers.forEach(s=>{used.add(s.input);used.add(s.output)}));
  const amap={},bvmap={},nacc=[],nbv=[],chunks=[];let off=0;
  [...used].sort((a,b)=>a-b).forEach(ai=>{
    const a=g.accessors[ai];
    if(!(a.bufferView in bvmap)){
      const bv=g.bufferViews[a.bufferView],sl=buf.slice(bv.byteOffset||0,(bv.byteOffset||0)+bv.byteLength),pad=(4-off%4)%4;
      if(pad){chunks.push(Buffer.alloc(pad));off+=pad}
      bvmap[a.bufferView]=nbv.length;nbv.push({...bv,buffer:0,byteOffset:off});chunks.push(sl);off+=sl.length}
    amap[ai]=nacc.length;nacc.push({...a,bufferView:bvmap[a.bufferView]})});
  g.meshes.forEach(m=>m.primitives.forEach(p=>{for(const q in p.attributes)p.attributes[q]=amap[p.attributes[q]];if(p.indices!=null)p.indices=amap[p.indices]}));
  g.skins.forEach(s=>{s.inverseBindMatrices=amap[s.inverseBindMatrices]});
  g.animations.forEach(a=>a.samplers.forEach(s=>{s.input=amap[s.input];s.output=amap[s.output]}));
  g.accessors=nacc;g.bufferViews=nbv;const nb=Buffer.concat(chunks);
  g.buffers=[{byteLength:nb.length,uri:'data:application/octet-stream;base64,'+nb.toString('base64')}];
  fs.writeFileSync(path.join(out,k+'.gltf'),JSON.stringify(g));console.log(k,'geschrieben');
}
