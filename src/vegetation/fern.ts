import * as THREE from 'three';

/** One recognizable woodland fern. Variants alter frond directions and leaf span,
 *  while geometry stays small and flat-shaded. This is a real placeable species. */
export function createFern(seed: number): THREE.Group {
  const group = new THREE.Group();
  const palette = [0x477943, 0x568a48, 0x66984e, 0x759b58, 0x86ab62];
  const rand = (n: number) => { const v = Math.sin((seed + 17) * 127.1 + n * 311.7) * 43758.5453; return v - Math.floor(v); };
  const frondCount = 6 + Math.floor(rand(2) * 3);
  const stemMat = new THREE.MeshStandardMaterial({color:0x577d42,roughness:1,flatShading:true});
  const leafMats = palette.map(color=>new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide,flatShading:true}));
  const stalkGeom = new THREE.CylinderGeometry(.008,.017,1,4);
  const leafletGeom = new THREE.BufferGeometry();
  leafletGeom.setAttribute('position', new THREE.Float32BufferAttribute([
    0,0,0,  .16,.012,.065,  .08,.022,.19,
    0,0,0,  .08,.022,.19,  .03,0,.28,
    0,0,0, -.16,.012,.065, -.08,.022,.19,
    0,0,0, -.08,.022,.19, -.03,0,.28,
  ],3));
  leafletGeom.computeVertexNormals();
  for(let i=0;i<frondCount;i++){
    const angle=2*Math.PI*i/frondCount+(rand(i+4)-.5)*.4;
    const height=.65+rand(i+22)*.36;
    const spread=.48+rand(i+33)*.26;
    const radial = new THREE.Vector3(Math.cos(angle),0,Math.sin(angle));
    const end = new THREE.Vector3(radial.x*spread,height*.72,radial.z*spread);
    const mid = new THREE.Vector3(radial.x*spread*.40,height*.82,radial.z*spread*.40);
    const segments=6;
    for(let j=0;j<segments;j++){
      const t0=j/segments,t1=(j+1)/segments;
      const at=(t:number)=>new THREE.Vector3()
        .addScaledVector(mid,2*(1-t)*t)
        .addScaledVector(end,t*t);
      const a=at(t0),b=at(t1);
      const d=b.clone().sub(a),stem=new THREE.Mesh(stalkGeom,stemMat);
      stem.position.copy(a).add(b).multiplyScalar(.5);
      stem.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
      stem.scale.set(1,d.length(),1);stem.castShadow=false;group.add(stem);
      if(j===0)continue;
      const u=(j-.5)/segments;
      const leaflet=new THREE.Mesh(leafletGeom,leafMats[(i+j+seed)%leafMats.length]);
      leaflet.position.copy(a);
      leaflet.rotation.set(0,angle,0);
      const k=(.7+.4*rand(i*8+j+50))*Math.sin(Math.PI*u);
      leaflet.scale.set(k*.75,1,k*.8);
      leaflet.castShadow=false;group.add(leaflet);
    }
  }
  return group;
}
