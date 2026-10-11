// Chaos-Derby – Bahn, Kulisse, Licht, Regen und Partikel
/* ---------- Bahn und Kulisse ---------- */
function build(){
  scene=new THREE.Scene();scene.background=bgc.copy(SKY);scene.fog=new THREE.Fog(0x9bd3f0,90,520);
  camera=new THREE.PerspectiveCamera(32,16/9,.5,900);
  hemi=new THREE.HemisphereLight(0xffffff,0x5a7a50,.8);scene.add(hemi);
  sun=new THREE.DirectionalLight(0xffffff,.7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  const sc=sun.shadow.camera;sc.left=-40;sc.right=40;sc.top=40;sc.bottom=-40;sc.near=1;sc.far=110;sun.shadow.bias=-.0006;scene.add(sun,sun.target);
  const flat=(w,h,m,x,y,z)=>{const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);p.rotation.x=-PI/2;p.position.set(x,y,z);p.receiveShadow=true;scene.add(p);return p};
  flat(3000,900,new THREE.MeshLambertMaterial({color:'#5d9f5a'}),500,-.02,0);
  const st=canvasTex(2,1,c=>{c.fillStyle='#4aa655';c.fillRect(0,0,1,1);c.fillStyle='#3f9a4b';c.fillRect(1,0,1,1)});
  st.magFilter=THREE.NearestFilter;st.wrapS=THREE.RepeatWrapping;st.repeat.set(24,1);
  flat(1200,17,new THREE.MeshLambertMaterial({map:st}),500,0,0);
  flat(.35,16.4,new THREE.MeshBasicMaterial({color:'#ffffff'}),0,.02,0);
  const ck=canvasTex(2,2,c=>{c.fillStyle='#fff';c.fillRect(0,0,2,2);c.fillStyle='#111';c.fillRect(0,0,1,1);c.fillRect(1,1,1,1)});
  ck.magFilter=THREE.NearestFilter;ck.wrapS=ck.wrapT=THREE.RepeatWrapping;ck.repeat.set(1,14);
  flat(1.2,16.4,new THREE.MeshBasicMaterial({map:ck}),L+.6,.02,0);
  // Rails
  const white=mat('#f4f4f4');
  [-8.4,8.4].forEach(z=>P(BOX,white,scene,500,1,z,1200,.09,.09));
  const posts=new THREE.InstancedMesh(CYL,white,482),m4=new THREE.Matrix4();let n=0;
  for(let x=-100;x<=1100;x+=5)[-8.4,8.4].forEach(z=>{m4.makeScale(.05,1,.05);m4.setPosition(x,.5,z);posts.setMatrixAt(n++,m4)});scene.add(posts);
  // Distanztafeln und Ziel
  for(let m=100;m<L;m+=100){
    const b=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.3),new THREE.MeshBasicMaterial({map:canvasTex(128,64,c=>{c.fillStyle='#fff';c.fillRect(0,0,128,64);c.fillStyle='#17231a';c.font='40px "Dela Gothic One","Arial Black",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(L-m,64,35)})}));
    b.position.set(m,3,-8.9);scene.add(b);P(CYL,'#17231a',scene,m,1.2,-8.95,.06,2.4,.06)}
  [-8.9].forEach(z=>{for(let k=0;k<6;k++)P(CYL,k%2?'#f4f4f4':'#d2232a',scene,L,.5+k,z,.14,1,.14)});
  const zl=new THREE.Mesh(new THREE.CircleGeometry(1.5,32),new THREE.MeshBasicMaterial({map:canvasTex(128,128,c=>{c.fillStyle='#d2232a';c.fillRect(0,0,128,128);c.fillStyle='#fff';c.font='38px "Dela Gothic One","Arial Black",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('ZIEL',64,68)})}));
  zl.position.set(L,7.3,-8.85);scene.add(zl);
  // Tribünen
  const crowd=canvasTex(256,64,c=>{c.fillStyle='#d9dde0';c.fillRect(0,0,256,64);const cs=['#e9d8a6','#d2232a','#2f6fb8','#f4f4f4','#f2b600','#3a3a3a'];
    for(let r=0;r<6;r++)for(let q=0;q<42;q++){c.fillStyle=cs[(r*13+q*5+(q*q)%4)%6];c.fillRect(3+q*6,4+r*10+((q+r)%2)*2,4,6)}});
  crowd.wrapS=THREE.RepeatWrapping;crowd.repeat.set(2,1);crowd.magFilter=THREE.NearestFilter;
  const cm=new THREE.MeshLambertMaterial({map:crowd});
  for(let x=20;x<=1050;x+=115){
    P(BOX,'#c4c9cc',scene,x,5,-24,84,10,10).castShadow=false;
    const c=new THREE.Mesh(new THREE.PlaneGeometry(82,10),cm);c.position.set(x,5,-17.8);c.rotation.x=-.5;scene.add(c);
    P(BOX,'#b0343a',scene,x,11,-21,88,.5,14).castShadow=false}
  for(let k=0;k<18;k++){const r=45+(k*37%30);const h=P(SPH,'#7fb37c',scene,-150+k*85,-22,-150-(k*53%60),r*1.6,r,r);h.castShadow=false}
  for(let k=0;k<9;k++){const c=P(SPH,'#ffffff',scene,-80+k*150,70+(k*17%25),-260,26+(k*7%14),6,10);c.castShadow=false;c.material=new THREE.MeshBasicMaterial({color:'#ffffff',fog:false})}
  // Regen
  const rp=new Float32Array(700*6);for(let k=0;k<700;k++){const x=Math.random()*90-45,y=Math.random()*22,z=Math.random()*44-16;rp.set([x,y,z,x-.25,y-.9,z],k*6)}
  const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.BufferAttribute(rp,3));
  rainFx=new THREE.LineSegments(rg,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.55}));rainFx.visible=false;rainFx.frustumCulled=false;scene.add(rainFx);
  // Partikel
  const puff=canvasTex(64,64,c=>{const g=c.createRadialGradient(32,32,2,32,32,30);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,64,64)});
  for(let k=0;k<120;k++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:puff,transparent:true,depthWrite:false}));s.visible=false;scene.add(s);parts.push({s,life:0,max:1,v:new THREE.Vector3(),size:1})}
  // Starter
  fig=RUN.map((d,i)=>mkModel(i));
  
  fig.forEach((f,i)=>{label(f,i);f.root.position.z=laneZ(i)});
  buildPodium();
}
function emit(x,y,z,vx,vy,vz,life,size,col,op){const p=parts[pI=(pI+1)%parts.length];p.s.position.set(x,y,z);p.v.set(vx,vy,vz);p.life=p.max=life;p.size=size;p.op=op||.5;p.s.material.color.set(col);p.s.visible=true}
function stepParts(sdt){for(const p of parts)if(p.life>0){p.life-=sdt;p.s.position.addScaledVector(p.v,sdt);const u=Math.max(0,p.life/p.max);p.s.material.opacity=u*p.op;const z=p.size*(1.4-u*.8);p.s.scale.set(z,z,1);if(p.life<=0)p.s.visible=false}}
