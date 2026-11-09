// SEDDIK FIRE — procedural 3D operator preview (no external model files required)
export const SEDDIK_SOLDIERS = {
  woodland: 'Woodland',
  black: 'Black Ops',
  desert: 'Desert',
  urban: 'Urban'
};

export async function loadSeddikSoldier(THREE, GLTFLoader, scene, variant='woodland', position={x:0,y:0,z:0}) {
  const palettes = {
    woodland: [0x45543a,0x28352b,0x8d9a72],
    black: [0x202326,0x101214,0x555b60],
    desert: [0xb39a68,0x766344,0xd0bd91],
    urban: [0x657078,0x343c43,0xa0a8ad]
  };
  const colors = palettes[variant] || palettes.woodland;
  const group = new THREE.Group();
  group.name = 'SEDDIK_OPERATOR_' + variant.toUpperCase();
  group.position.set(position.x||0, position.y||0, position.z||0);
  const mat = (color, roughness=.88) => new THREE.MeshStandardMaterial({color,roughness});
  const cloth=mat(colors[0]), dark=mat(colors[1]), trim=mat(colors[2]), skin=mat(0xb98768), boot=mat(0x242522);
  function part(geo, material, x,y,z, sx=1,sy=1,sz=1) {
    const mesh=new THREE.Mesh(geo,material); mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz);
    mesh.castShadow=true; mesh.receiveShadow=true; group.add(mesh); return mesh;
  }
  // Boots, legs, torso, arms and head
  part(new THREE.BoxGeometry(.25,.14,.36),boot,-.17,.08,.02);
  part(new THREE.BoxGeometry(.25,.14,.36),boot,.17,.08,.02);
  part(new THREE.CapsuleGeometry(.115,.48,4,8),cloth,-.17,.43,0);
  part(new THREE.CapsuleGeometry(.115,.48,4,8),cloth,.17,.43,0);
  part(new THREE.BoxGeometry(.55,.62,.30),cloth,0,1.12,0);
  part(new THREE.BoxGeometry(.58,.16,.32),dark,0,1.36,0);
  part(new THREE.CapsuleGeometry(.105,.48,4,8),cloth,-.39,1.08,0,1,1,.9).rotation.z=-.12;
  part(new THREE.CapsuleGeometry(.105,.48,4,8),cloth,.39,1.08,0,1,1,.9).rotation.z=.12;
  part(new THREE.SphereGeometry(.19,16,12),skin,0,1.62,0, .9,1.05,.9);
  part(new THREE.SphereGeometry(.205,16,10,0,Math.PI*2,0,Math.PI*.55),dark,0,1.73,0,.98,.65,.98);
  // Chest rig, shoulder pads, belt, knee pads and insignia
  part(new THREE.BoxGeometry(.42,.30,.035),dark,0,1.16,.17);
  for (const x of [-.16,0,.16]) part(new THREE.BoxGeometry(.10,.13,.045),trim,x,1.17,.195);
  part(new THREE.BoxGeometry(.48,.09,.34),dark,0,.77,0);
  for (const x of [-.17,.17]) part(new THREE.BoxGeometry(.19,.13,.08),trim,x,.47,.13);
  for (const x of [-.34,.34]) part(new THREE.SphereGeometry(.13,10,8),dark,x,1.32,0,1,.8,1);
  part(new THREE.BoxGeometry(.12,.18,.06),trim,-.22,1.13,.19);
  scene.add(group);
  return group;
}