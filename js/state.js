// Chaos-Derby – gemeinsame Konstanten und Zustand der 3D-Ansicht
const $=id=>document.getElementById(id);
const PI=Math.PI, S=1.25;                 // S: Figuren-Maßstab
const LANE=[2,0,1,4,3,5];                 // Bahn je Starter, 0 = hinten
const laneZ=i=>-5.5+LANE[i]*2.2;
const FRONT=[1.7,1.29,2.22,.97,.8,1.86];   // Abstand Mitte bis Nase, vor Maßstab
const TOPY=[3.5,4.0,3.2,2.4,4.6,3.7];
const GS=[8,7,8,5,8,8],WS=[4.5,4,4,2.6,4.5,3.2];   // Meter je Galopp- bzw. Schrittzyklus
let race,t=0,state='idle',evI=0,last=0,raf=0,cut=null,shotK='',gl=true;
let scene,camera,renderer,sun,hemi,rainFx,trackMat,fig=[],parts=[],pI=0;
const camP=new THREE.Vector3(),camT=new THREE.Vector3(),tmpV=new THREE.Vector3();
const SKY=new THREE.Color('#9bd3f0'),GREY=new THREE.Color('#8b979f'),bgc=new THREE.Color();
