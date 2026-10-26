import * as THREE from 'three';

/** Single low-poly spade; attach to KayKit's handslot.r bone.
 * Local origin is the hand's grip, not the character's world origin.
 */
export function makeGardeningSpade(): THREE.Group {
  const tool = new THREE.Group();
  tool.name = 'KomorebiGardenSpade';
  const wood = new THREE.MeshStandardMaterial({ color: 0x987451, roughness: 1, flatShading: true });
  const steel = new THREE.MeshStandardMaterial({ color: 0x879c9a, metalness: .12, roughness: .82, flatShading: true, side: THREE.DoubleSide });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.028, .03, .96, 8), wood);
  handle.position.y = -.06;
  handle.castShadow = true;
  tool.add(handle);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(.041, .041, .16, 8), steel);
  collar.position.y = -.55;
  collar.castShadow = true;
  tool.add(collar);
  const outline = new THREE.Shape();
  outline.moveTo(-.17, -.62);
  outline.lineTo(.17, -.62);
  outline.lineTo(.165, -.75);
  outline.lineTo(.12, -.87);
  outline.lineTo(0, -1.02);
  outline.lineTo(-.12, -.87);
  outline.lineTo(-.165, -.75);
  outline.closePath();
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(outline, {
    depth: .035, bevelEnabled: true, bevelSize: .009, bevelThickness: .009,
    bevelSegments: 1, curveSegments: 1,
  }), steel);
  blade.position.z = -.018;
  blade.castShadow = true;
  tool.add(blade);
  tool.position.set(0, -.05, 0);
  return tool;
}
