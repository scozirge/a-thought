import * as THREE from 'three';
import { COVER, moveInArena, ROUND_SECONDS, TARGET_SCORE, WEAPONS, unlockedWeapon, turnView } from './arena';

export type ArenaStatus = 'ready' | 'playing' | 'paused' | 'won' | 'lost';
export type ArenaSnapshot = { status: ArenaStatus; score: number; health: number; seconds: number; hit: boolean; hurt: boolean; locked: boolean; weapon: number; ammo: number; reloading: boolean; aiming: boolean; respawn: number; deaths: number; notice: string };

export function createArena(host: HTMLDivElement, onChange: (state: ArenaSnapshot) => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute('aria-label', '方塊競技場，WASD 移動，滑鼠瞄準，左鍵射擊');
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#bedfe3');
  scene.fog = new THREE.Fog('#bedfe3', 30, 65);
  const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 90);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  scene.add(new THREE.HemisphereLight('#fff7da', '#697e88', 2.5));
  const sun = new THREE.DirectionalLight('#fff4dd', 3);
  sun.position.set(-12, 22, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22 });
  scene.add(sun);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  function box(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
    const mesh = new THREE.Mesh(geometry, materials.get(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  box(scene, 0, -0.3, 0, 40, 0.6, 40, '#e1d5b5');
  const grid = new THREE.GridHelper(34, 17, '#c4b899', '#d1c5a7');
  grid.position.y = 0.015;
  scene.add(grid);
  const obstacles: THREE.Mesh[] = [];
  for (const [i, cover] of COVER.entries()) {
    obstacles.push(box(scene, cover.x, cover.h / 2, cover.z, cover.w, cover.h, cover.d, i % 2 ? '#639c9c' : '#d59d72'));
    box(scene, cover.x, cover.h + 0.08, cover.z, cover.w + 0.15, 0.16, cover.d + 0.15, '#fff1d3');
  }
  for (const [x, z, w, d] of [[0, -18, 37, 1], [0, 18, 37, 1], [-18, 0, 1, 37], [18, 0, 1, 37]]) {
    obstacles.push(box(scene, x, 1.6, z, w, 3.2, d, '#738d92'));
    box(scene, x, 3.25, z, w, 0.15, d, '#f6edcf');
  }
  for (let i = 0; i < 10; i++) {
    const x = -27 + i * 6;
    box(scene, x, 2 + (i % 3), -26, 4, 4 + (i % 3) * 2, 4, '#9fb9af');
  }
  // The first-person blaster is made from the same simple blocks as the opponents.
  const gun = new THREE.Group();
  camera.add(gun);
  const gunBody = box(gun, 0.34, -0.3, -0.62, 0.22, 0.25, 0.62, '#477e83');
  const gunMaterial = new THREE.MeshStandardMaterial({ color: WEAPONS[0].color, roughness: 0.7 });
  gunBody.material = gunMaterial;
  box(gun, 0.34, -0.3, -0.95, 0.24, 0.2, 0.12, '#ffd279');
  box(gun, 0.34, -0.5, -0.42, 0.16, 0.3, 0.2, '#eeaa75');
  const muzzle = box(gun, 0.34, -0.3, -1.06, 0.15, 0.15, 0.15, '#fff2a6');
  muzzle.visible = false;
  const spawns = [[0, -8], [-11, -9], [11, -11], [-11, 2], [11, 7], [0, -14]];
  const bots = ['#d98671', '#a590bb', '#dda845'].map((color, i) => {
    const group = new THREE.Group();
    scene.add(group);
    box(group, 0, 1.05, 0, 0.85, 0.8, 0.5, color);
    box(group, 0, 1.78, 0, 0.67, 0.65, 0.65, '#ffe1ad');
    box(group, 0, 2.13, 0, 0.76, 0.16, 0.75, color);
    box(group, -0.17, 1.8, 0.335, 0.08, 0.1, 0.03, '#354c56');
    box(group, 0.17, 1.8, 0.335, 0.08, 0.1, 0.03, '#354c56');
    box(group, 0, 1.62, 0.34, 0.2, 0.04, 0.03, '#354c56');
    box(group, -0.59, 1.05, 0.08, 0.28, 0.75, 0.32, color);
    box(group, 0.59, 1.05, 0.08, 0.28, 0.75, 0.32, color);
    const legs = [-0.24, 0.24].map((x) => box(group, x, 0.34, 0, 0.32, 0.65, 0.38, '#465d71'));
    box(group, 0.48, 1.03, 0.45, 0.22, 0.2, 0.7, '#477e83');
    group.traverse((part) => { part.userData.bot = i; });
    return { group, legs, hp: 2, respawn: 0, shot: 2 + i, phase: i * 2 };
  });
  const raycaster = new THREE.Raycaster();
  const keys = new Set<string>();
  const projectiles: { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number }[] = [];
  let status: ArenaStatus = 'ready';
  let score = 0, health = 100, remaining = ROUND_SECONDS;
  let yaw = 0, pitch = 0, cooldown = 0, hitTimer = 0, hurtTimer = 0, elapsed = 0;
  let firing = false, locked = false, disposed = false, aiming = false;
  let mouse: { x: number; y: number } | null = null;
  let sensitivity = 0.0025, jumpVelocity = 0, weapon = 0, reloadTime = 0, respawn = 0, deaths = 0;
  const ammo: number[] = WEAPONS.map((w) => w.magazine);
  let notice = '', noticeTime = 0;
  let last = performance.now(), nextHud = 0, frame = 0;
  const snapshot = () => onChange({ status, score, health, seconds: Math.ceil(remaining), hit: hitTimer > 0, hurt: hurtTimer > 0, locked, weapon, ammo: ammo[weapon], reloading: reloadTime > 0, aiming, respawn: Math.ceil(respawn), deaths, notice });
  function clearProjectiles() {
    for (const p of projectiles) scene.remove(p.mesh);
    projectiles.length = 0;
  }
  function reset() {
    score = 0; health = 100; remaining = ROUND_SECONDS; elapsed = 0;
    yaw = 0; pitch = 0; cooldown = 0; hitTimer = 0; hurtTimer = 0;
    weapon = 0; reloadTime = 0; respawn = 0; deaths = 0; jumpVelocity = 0; aiming = false; mouse = null;
    notice = ''; noticeTime = 0;
    WEAPONS.forEach((w, i) => { ammo[i] = w.magazine; });
    gunMaterial.color.set(WEAPONS[0].color);
    camera.position.set(0, 1.7, 12);
    camera.rotation.set(0, 0, 0);
    clearProjectiles();
    bots.forEach((bot, i) => {
      bot.group.position.set(spawns[i][0], 0, spawns[i][1]);
      bot.group.visible = true; bot.hp = 2; bot.respawn = 0; bot.shot = 2 + i;
    });
  }
  function stop(next: ArenaStatus) {
    status = next;
    keys.clear(); firing = false; aiming = false; mouse = null;
    if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
    snapshot();
  }
  function pause() { if (status === 'playing') stop('paused'); }
  function start() {
    if (disposed) return;
    if (status !== 'paused') reset();
    status = 'playing'; last = performance.now(); snapshot();
    requestLock();
  }
  function requestLock() {
    if (status !== 'playing' || document.pointerLockElement === renderer.domElement) return;
    try { renderer.domElement.requestPointerLock()?.catch(lockerror); } catch { lockerror(); }
  }
  function lockerror() {
    if (disposed) return;
    locked = false; snapshot();
  }
  function reload() {
    if (status !== 'playing' || respawn > 0 || reloadTime > 0 || ammo[weapon] === WEAPONS[weapon].magazine) return;
    reloadTime = WEAPONS[weapon].reload; snapshot();
  }
  function selectWeapon(index: number) {
    if (index > unlockedWeapon(score) || respawn > 0) return;
    weapon = index; reloadTime = 0; cooldown = 0.25;
    gunMaterial.color.set(WEAPONS[index].color);
    snapshot();
  }
  function shoot() {
    if (status !== 'playing' || respawn > 0 || cooldown > 0 || reloadTime > 0) return;
    if (ammo[weapon] <= 0) { reload(); return; }
    const currentWeapon = WEAPONS[weapon];
    ammo[weapon]--;
    cooldown = currentWeapon.interval;
    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const targets = bots.filter((b) => b.group.visible).map((b) => b.group);
    const hit = raycaster.intersectObjects([...obstacles, ...targets], true)[0];
    if (hit && typeof hit.object.userData.bot === 'number') {
      const bot = bots[hit.object.userData.bot];
      bot.hp -= currentWeapon.damage; hitTimer = 0.16;
      if (bot.hp <= 0) {
        bot.group.visible = false; bot.respawn = 2;
        const previousUnlock = unlockedWeapon(score);
        score++;
        notice = '擊倒 +1'; noticeTime = 1.5;
        if (unlockedWeapon(score) > previousUnlock) {
          selectWeapon(unlockedWeapon(score));
          notice = `解鎖 ${WEAPONS[weapon].name}！`; noticeTime = 3;
        }
        if (score >= TARGET_SCORE) stop('won');
      }
    }
    snapshot();
  }
  function keydown(event: KeyboardEvent) {
    if (event.code === 'Escape') { pause(); return; }
    if (status !== 'playing') return;
    if (event.code === 'KeyR') { reload(); return; }
    if (/^Digit[123]$/.test(event.code)) { selectWeapon(Number(event.code.slice(-1)) - 1); return; }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyF'].includes(event.code)) {
      event.preventDefault(); keys.add(event.code);
      if (event.code === 'Space' && !event.repeat && camera.position.y <= 1.701 && respawn <= 0) jumpVelocity = 5;
      if (event.code === 'KeyF' && !event.repeat) shoot();
    }
  }
  function keyup(event: KeyboardEvent) { keys.delete(event.code); }
  function mousemove(event: MouseEvent) {
    if (status !== 'playing' || respawn > 0) return;
    let dx = event.movementX, dy = event.movementY;
    if (!locked) {
      const rect = renderer.domElement.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) { mouse = null; return; }
      dx = mouse ? event.clientX - mouse.x : 0;
      dy = mouse ? event.clientY - mouse.y : 0;
      mouse = { x: event.clientX, y: event.clientY };
    }
    const view = turnView(yaw, pitch, dx, dy, sensitivity * (aiming ? 0.55 : 1));
    yaw = view.yaw; pitch = view.pitch;
  }
  function mousedown(event: MouseEvent) {
    if (status !== 'playing') return;
    if (event.button === 2) { aiming = true; snapshot(); return; }
    if (event.button !== 0) return;
    requestLock(); firing = true; shoot();
  }
  function mouseup(event: MouseEvent) {
    if (event.button === 0) firing = false;
    if (event.button === 2) { aiming = false; snapshot(); }
  }
  function contextmenu(event: MouseEvent) { event.preventDefault(); }
  function lockchange() {
    const wasLocked = locked;
    locked = document.pointerLockElement === renderer.domElement;
    mouse = null;
    if (locked && status !== 'playing') document.exitPointerLock();
    if (wasLocked && !locked) pause();
    snapshot();
  }
  function visibility() { if (document.hidden) pause(); }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('mousemove', mousemove);
  window.addEventListener('mouseup', mouseup);
  window.addEventListener('blur', pause);
  renderer.domElement.addEventListener('mousedown', mousedown);
  renderer.domElement.addEventListener('contextmenu', contextmenu);
  document.addEventListener('pointerlockchange', lockchange);
  document.addEventListener('pointerlockerror', lockerror);
  document.addEventListener('visibilitychange', visibility);
  function animate(now: number) {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (status === 'playing') {
      elapsed += dt; remaining = Math.max(0, remaining - dt);
      cooldown -= dt; hitTimer -= dt; hurtTimer -= dt;
      noticeTime -= dt; if (noticeTime <= 0) notice = '';
      if (reloadTime > 0) {
        reloadTime = Math.max(0, reloadTime - dt);
        if (reloadTime === 0) ammo[weapon] = WEAPONS[weapon].magazine;
      }
      if (respawn > 0) {
        respawn = Math.max(0, respawn - dt);
        if (respawn === 0) {
          health = 100; camera.position.set(0, 1.7, 12); jumpVelocity = 0;
          clearProjectiles(); WEAPONS.forEach((w, i) => { ammo[i] = w.magazine; });
        }
      }
      // Edge turning allows a full rotation even in embedded browsers that deny pointer lock.
      if (!locked && mouse && respawn <= 0) {
        const rect = renderer.domElement.getBoundingClientRect();
        if (mouse.x < rect.left + 45) yaw += dt * 1.7;
        if (mouse.x > rect.right - 45) yaw -= dt * 1.7;
      }
      yaw += ((keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0)) * dt * 1.8;
      pitch = THREE.MathUtils.clamp(pitch + ((keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0)) * dt, -1.15, 1.15);
      camera.rotation.set(pitch, yaw, 0);
      const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
      const strafe = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
      const sprinting = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && !aiming;
      const speed = (respawn > 0 ? 0 : aiming ? 2.8 : sprinting ? 8 : 5) * dt / Math.max(1, Math.hypot(forward, strafe));
      moveInArena(camera.position, (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * speed, (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * speed);
      if (respawn <= 0) {
        jumpVelocity -= dt * 15;
        camera.position.y = Math.max(1.7, camera.position.y + jumpVelocity * dt);
        if (camera.position.y === 1.7) jumpVelocity = 0;
      }
      if (firing || keys.has('KeyF')) shoot();
      camera.fov = THREE.MathUtils.lerp(camera.fov, aiming ? 48 : 72, Math.min(1, dt * 12));
      camera.updateProjectionMatrix();
      muzzle.visible = cooldown > WEAPONS[weapon].interval - 0.06 && reloadTime <= 0;
      gun.position.z = Math.max(0, cooldown) * 0.25;
      gun.position.x = aiming ? -0.25 : 0;
      gun.rotation.x = reloadTime > 0 ? -0.55 : 0;
      bots.forEach((bot, i) => {
        if (!bot.group.visible) {
          bot.respawn -= dt;
          if (bot.respawn <= 0) {
            const spawn = [...spawns].sort((a, b) => Math.hypot(b[0] - camera.position.x, b[1] - camera.position.z) - Math.hypot(a[0] - camera.position.x, a[1] - camera.position.z))[i];
            bot.group.position.set(spawn[0], 0, spawn[1]); bot.hp = 2; bot.shot = 2; bot.group.visible = true;
          }
          return;
        }
        const pos = bot.group.position;
        const angle = Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z);
        const distance = Math.hypot(camera.position.x - pos.x, camera.position.z - pos.z);
        const direction = distance > 8 ? angle : angle + Math.PI / 2;
        moveInArena(pos, Math.sin(direction) * dt * 1.3, Math.cos(direction) * dt * 1.3);
        bot.group.rotation.y = angle;
        bot.legs.forEach((leg, n) => { leg.rotation.x = Math.sin(elapsed * 6 + bot.phase + n * Math.PI) * 0.28; });
        bot.shot -= dt;
        if (bot.shot <= 0 && distance < 25 && respawn <= 0) {
          bot.shot = 2.4 + i * 0.3;
          const origin = pos.clone().add(new THREE.Vector3(0, 1.45, 0));
          const directionToPlayer = camera.position.clone().sub(origin).normalize();
          raycaster.set(origin, directionToPlayer);
          if ((raycaster.intersectObjects(obstacles)[0]?.distance ?? Infinity) > distance) {
            const mesh = box(scene, origin.x, origin.y, origin.z, 0.22, 0.22, 0.22, '#ff775e');
            projectiles.push({ mesh, velocity: directionToPlayer.multiplyScalar(6), life: 5 });
          }
        }
      });
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        const step = p.velocity.clone().multiplyScalar(dt);
        raycaster.set(p.mesh.position, step.clone().normalize());
        const blocked = (raycaster.intersectObjects(obstacles)[0]?.distance ?? Infinity) <= step.length();
        p.mesh.position.add(step); p.life -= dt;
        const hitPlayer = p.mesh.position.distanceTo(camera.position) < 0.6;
        if (hitPlayer && !blocked && respawn <= 0) { health = Math.max(0, health - 10); hurtTimer = 0.3; }
        if (blocked || hitPlayer || p.life <= 0) { scene.remove(p.mesh); projectiles.splice(i, 1); }
      }
      if (health <= 0 && respawn <= 0) {
        respawn = 2; deaths++; firing = false; aiming = false; reloadTime = 0;
      }
      if (status === 'playing' && remaining <= 0) stop('lost');
      if (now >= nextHud) { snapshot(); nextHud = now + 100; }
    } else muzzle.visible = false;
    renderer.render(scene, camera);
  }
  reset(); resize(); snapshot(); frame = requestAnimationFrame(animate);
  return {
    start, pause, reload, selectWeapon, requestLock,
    setSensitivity(value: number) { sensitivity = Math.max(0.0008, Math.min(0.006, value)); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup);
      window.removeEventListener('mousemove', mousemove); window.removeEventListener('mouseup', mouseup);
      window.removeEventListener('blur', pause);
      renderer.domElement.removeEventListener('mousedown', mousedown);
      renderer.domElement.removeEventListener('contextmenu', contextmenu);
      document.removeEventListener('pointerlockchange', lockchange); document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('pointerlockerror', lockerror);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
      geometry.dispose(); grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      materials.forEach((material) => material.dispose()); gunMaterial.dispose(); sun.shadow.dispose(); renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
