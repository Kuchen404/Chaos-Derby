// Chaos-Derby – gemeinsame Konstanten und Zustand der 3D-Ansicht
const $=id=>document.getElementById(id);
const PI=Math.PI, S=1.25;                 // S: Figuren-Maßstab
const LANE=[2,0,1,4,3,5];                 // Bahn je Startplatz im Feld, 0 = hinten
const laneZ=i=>-5.5+LANE[i]*2.2;
const vis=i=>fig[i].V;                    // Darstellungswerte des Starters auf Bahn i (siehe VIS in figures.js)
let race,t=0,state='idle',evI=0,last=0,raf=0,cut=null,shotK='',gl=true;
let scene,camera,renderer,sun,hemi,rainFx,trackMat,fig=[],figAll=[],parts=[],pI=0;   // fig: Figuren des aktuellen Felds je Bahn, figAll: je ROSTER-Eintrag
const camP=new THREE.Vector3(),camT=new THREE.Vector3(),tmpV=new THREE.Vector3();
const SKY=new THREE.Color('#9bd3f0'),GREY=new THREE.Color('#8b979f'),bgc=new THREE.Color();
