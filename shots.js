// WHY FIG NEWTONS ARE NAMED AFTER A TOWN: the shot list (Tall Tale 3D).
// One shot per script line (13 lines, 13 shots). cut(i) = just before line i, W('word', i) = when that word is said
// (falls back to a time inside the line if Whisper spelled the word differently, so the build never crashes on a word).
import * as THREE from 'three';
import { ctx, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Wd } from './core/timing.js';
import { camera } from './core/engine.js';
import * as WD from './core/world.js';
import * as PR from './core/props.js';
import { Toon } from './core/toon.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const mix = (a, b, k) => a.clone().lerp(b, k);
const blink = (t, off = 0) => (((t + off) % 3.3) < 0.12 ? 1 : 0);
const W = (w, i, fb = 0.4) => { try { return Wd(w, i); } catch (e) { return L(i) + fb; } };

// a cookie held in a hand (plain 2D prop: (g, x, y))
const COOKIE = (g, x, y) => {
  g.save(); g.translate(x + 8, y - 46); g.rotate(-0.25); g.fillStyle = '#C98B4A'; g.strokeStyle = '#1F1C33'; g.lineWidth = 6;
  g.beginPath(); g.roundRect(-52, -22, 104, 44, 18); g.fill(); g.stroke();
  g.fillStyle = '#7A3E2A'; [-26, 0, 26].forEach((dx) => { g.beginPath(); g.arc(dx, 0, 7, 0, 7); g.fill(); });
  g.restore();
};

// 2D overlay helpers (the caption zone is y 1250-1550, keep overlays above it)
const pill = (text, x, y, sp, { bg = '#F2C230', fg = '#1F1C33', size = 64, rot = 0 } = {}) => {
  if (sp <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); const s = lerp(1.7, 1, eo(sp)); ctx.scale(s, s); ctx.globalAlpha = Math.min(1, sp * 2);
  ctx.font = `900 ${size}px Inter`; const w = ctx.measureText(text).width + 70, h = size * 1.5;
  ctx.fillStyle = '#1F1C33'; ctx.beginPath(); ctx.roundRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 16, 30); ctx.fill();
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 24); ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 4); ctx.restore();
};
const bigCookie = (x, y, s, sp) => {
  if (sp <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * eob(sp), s * eob(sp)); ctx.rotate(-0.12);
  ctx.fillStyle = '#C98B4A'; ctx.strokeStyle = '#1F1C33'; ctx.lineWidth = 12; ctx.beginPath(); ctx.roundRect(-190, -80, 380, 160, 60); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7A3E2A'; [-110, -40, 40, 110].forEach((dx) => { ctx.beginPath(); ctx.arc(dx, 0, 18, 0, 7); ctx.fill(); });
  ctx.restore();
};

const LOOK = {
  sage: { body: '#8A6FB5', hat: 'none', hairCol: '#E9E9F2', neck: 'collar', extra: ['glasses'] },
  roser: { body: '#E8A33C', hat: 'none', hairCol: '#5A3A2A', neck: 'bowtie', neckCol: '#2E4E8A', pattern: 'vest', patCol: '#7A3E24', extra: ['mustache', 'glasses'] },
  hazen: { body: '#4A4560', hat: 'bowler', hatCol: '#2A2638', neck: 'bowtie', neckCol: '#D8343F', pattern: 'vest', patCol: '#2A2638', extra: ['mustache', 'monocle'] },
  baker: { body: '#F4EFE4', hat: 'beanie', hatCol: '#FFFFFF', pattern: 'apron', patCol: '#D8D2C4', extra: ['blush'] },
  kid: { body: '#F2C230', hat: 'bow', hatCol: '#3C6FB6', hairCol: '#3A2A22', kid: true, extra: ['freckles'] },
  clerk: { body: '#4FB3A9', hat: 'visor', hatCol: '#2F8F5B', neck: 'collar', pattern: 'vest', patCol: '#2B5E73', extra: ['pencil'] },
};
const person = (k, opts) => new Toon({ ...LOOK[k], extra: [...(LOOK[k].extra || [])] }, opts);

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.06);
  const cam = camera(36);
  const LOOKS = { street: { bloom: 0.15, aperture: 0.0012, maxblur: 0.008 }, room: { bloom: 0.3, aperture: 0.001, maxblur: 0.008 }, field: { bloom: 0.25, aperture: 0.001, maxblur: 0.007 } };
  const shoot = (scene, people, from, to, at, at2, k, look, focus) => {
    if (cam.fov !== (look.fov || 36)) { cam.fov = look.fov || 36; cam.updateProjectionMatrix(); }
    cam.position.copy(mix(from, to, k)); cam.lookAt(at2 ? mix(at, at2, k) : at);
    people.forEach((p) => p.face(cam));
    E.render(scene, cam, { ...look, focus: focus ?? cam.position.distanceTo(at2 ? mix(at, at2, k) : at) });
  };
  const view = (scene, from, look, people = []) => { const c = new THREE.PerspectiveCamera(42, 4 / 3, 0.1, 800); c.position.copy(from); c.lookAt(look); people.forEach((p) => p.face(c)); const t = WD.snapshot(E, scene, c); t.wrapS = THREE.RepeatWrapping; return t; };

  // ── sets ─────────────────────────────────────────────────────────────
  // main street: the first five shops on the left boardwalk are the cookie names, in order
  const SHOP_ORDER = [['KENNEDY', '#C9603F', 'brick', '#D8343F'], ['BEACON HILL', '#6FA3B8', 'wood', null], ['HARVARD', '#9E4A3A', 'brick', '#F2C230'], ['SHREWSBURY', '#E3C16F', 'wood', '#3C6FB6'],
    ['NEWTON', '#7FA36A', 'brick', '#2E4E8A'], ['BARBER', '#B98ACF', 'wood', '#2E4E3F'], ['GENERAL STORE', '#B5553C', 'brick', '#F2C230'], ['CAFE', '#E58A6A', 'wood', '#2E4E3F'],
    ['BANK', '#C7B79A', 'brick', null], ['PHARMACY', '#5FA39A', 'wood', '#D8343F']];
  const ST = WD.mainStreet(E, { shops: SHOP_ORDER });
  ST.sun.key.target.position.set(-4, 0, 0); ST.sun.key.position.set(5, 13, 6);
  const shop = (name) => ST.buildings.find((b) => b.name === name && b.side < 0) || ST.buildings.find((b) => b.name === name);
  const stHazen = person('hazen'), stBaker = person('baker'), stKid = person('kid', { height: 1.4 });
  [stHazen, stBaker, stKid].forEach((p) => ST.scene.add(p.group));
  const stPeople = [...ST.people, stHazen, stBaker, stKid];
  const stHide = () => [stHazen, stBaker, stKid].forEach((p) => (p.group.visible = false));

  // the bakery inside: counter on the right (x 2.2..3.2), the person behind it at x 3.55
  const IN = WD.interior(E, { wall: '#F2E6CF', motif: '#E8D5B0', floor: '#A8693E', ceiling: '#7A3E24', signText: 'FIG PASTE · FRESH DAILY', view: view(ST.scene, V3(2, 1.8, -12), V3(-3, 2.2, 10), ST.people), picture: false });
  { const sb = WD.signBoard('KENNEDY BISCUIT WORKS', { w: 3.4, h: 0.5, bg: '#8A3B2A', fg: '#F2E6CF' }); sb.position.set(0, 3.55, -6.86); IN.scene.add(sb);
    const nm = PR.poster(['COOKIE NAMES', 'BEACON HILL', 'HARVARD', 'SHREWSBURY', '!???'], { w: 1.4, h: 1.9 }); nm.position.set(-0.8, 2.1, -6.86); IN.scene.add(nm);
    [[-3.1, -5.6], [-3.3, -4.6]].forEach(([x, z], i) => { const c = PR.parcel(0.7, 0.5, 0.6); c.position.set(x, 0, z); c.rotation.y = i * 0.5; IN.scene.add(c); }); }
  const pile = new THREE.Group(); for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 0.2), WD.mat({ color: i % 2 ? '#C98B4A' : '#B9793E' })); m.position.set(0.02 * i, 0.04 + i * 0.075, 0); m.rotation.y = i * 0.5; m.castShadow = true; pile.add(m); }
  pile.position.set(2.7, 1.18, -3.1); IN.scene.add(pile);
  const inRoser = person('roser'), inHazen = person('hazen'), inKid = person('kid', { height: 1.4 }), inClerk = person('clerk');
  const inPeople = [inRoser, inHazen, inKid, inClerk]; inPeople.forEach((p) => IN.scene.add(p.group));
  const inHide = () => inPeople.forEach((p) => (p.group.visible = false));

  // the meadow with one tree, for the apple gag
  const MD = WD.meadow(E, { fenceOn: false }); MD.sun.key.position.set(8, 12, 6); MD.sun.key.target.position.set(0, 0, -4);
  const oak = WD.tree(1.5, '#4E9A3C', 'round'); oak.position.set(0.9, 0, -5.2); MD.scene.add(oak);
  const sage = person('sage'); MD.scene.add(sage.group);
  const apple = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), WD.mat({ color: '#D8343F' })); apple.castShadow = true; MD.scene.add(apple);

  // ── 1 · "Lots of people think Fig Newtons were named after Isaac Newton, the apple guy." (apple bonks the guy) ──
  { const st = cut(0), w0 = W('apple', 0, 3.0);
    add({ id: 'S01', at: st, note: 'meadow: a thinker under a tree, an apple bonks him on "apple"', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d)); sage.at(-0.3, 0, -3.6);
      const fall = eo(seg(t, w0 - 0.5, w0)); const after = Math.max(0, t - w0);
      apple.visible = t > w0 - 0.6; apple.position.set(-0.3 + after * 0.5, t < w0 ? lerp(4.4, 1.95, fall) : Math.max(0.13, 1.95 + after * 1.4 - 9 * after * after), -3.6 + 0.15);
      sage.set({ mood: t < w0 ? 'proud' : 'dizzy', armL: [20, 10], armR: [20, 10], look: [0, t < w0 ? -0.6 : 0], blink: blink(t) });
      shoot(MD.scene, [sage], V3(-1.8, 1.7, 1.4), V3(-0.9, 1.75, -0.4), V3(-0.3, 1.6, -3.6), V3(-0.3, 1.9, -3.6), k, LOOKS.field);
      blit();
    } });
    cue(st + 0.05, 'whoosh', { gain: 0.6 }); cue(w0, 'boing', { gain: 0.9 }); cue(w0 + 0.05, 'pop', { gain: 0.6 }); }

  // ── 2 · "But nope, they're named after a town in Massachusetts." (crane down the street to NEWTON) ──
  { const st = cut(1), w0 = W('massachusetts', 1, 1.8); const NW = shop('NEWTON');
    add({ id: 'S02', at: st, note: 'crane toward the NEWTON shop; "NEWTON, MASS." label pops on "Massachusetts"', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d)); const z = NW.z; stHide();
      shoot(ST.scene, stPeople, V3(0.5, 6.0, z - 22), V3(-2.3, 1.9, z - 6.4), V3(-2.5, 3.0, z), V3(-5.0, 2.0, z), k, { ...LOOKS.street, fov: 44 });
      blit(); pill('NEWTON, MASS.', 540, 430, seg(t, w0 - 0.4, w0 - 0.15), { bg: '#7FA36A', fg: '#FFFFFF', rot: -0.04 });
    } });
    cue(st, 'whoosh', { gain: 0.6 }); cue(w0 - 0.3, 'ding', { gain: 0.8 }); }

  // ── 3 · "See, back in 1891, a man named Charles Roser" (inside the bakery, the year slams on) ──
  { const st = cut(2), wy = W('back', 2, 0.5), wn = W('charles', 2, 1.6);
    add({ id: 'S03', at: st, note: 'bakery inside: the inventor proud behind the counter; "1891" and his name pop on', draw(lt, d, t, blit) {
      const k = eo(clamp(lt / d)); inHide(); inRoser.group.visible = true; pile.visible = false; inRoser.at(3.55, 0, -2.5);
      inRoser.set({ mood: t > wn ? 'proud' : 'smug', armL: [30, -20], armR: [30, -30], blink: blink(t) });
      shoot(IN.scene, inPeople, V3(-0.4, 1.9, 1.6), V3(0.2, 1.85, 0.8), V3(3.2, 1.8, -2.4), null, k, LOOKS.room);
      blit(); pill('1891', 540, 430, seg(t, wy + 0.25, wy + 0.5), { bg: '#F2C230' }); pill('CHARLES ROSER', 540, 560, seg(t, wn - 0.05, wn + 0.2), { bg: '#F4EFE4', size: 56 });
    } });
    cue(st, 'whoosh'); cue(wy + 0.3, 'stamp', { gain: 0.7 }); cue(wn, 'pop', { gain: 0.7 }); }

  // ── 4 · "came up with a cookie stuffed with fig paste," (close-up, he lifts the cookie) ──
  { const st = cut(3), wc = W('cookie', 3, 0.7), wf = W('fig', 3, 1.4);
    add({ id: 'S04', at: st, note: 'close-up: he holds up a fig cookie, ideas pop', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d)); inHide(); inRoser.group.visible = true; pile.visible = true; inRoser.at(3.55, 0, -2.5);
      inRoser.set({ mood: t > wc ? 'happy' : 'proud', armR: [70, -80], armL: [30, -20], holdR: COOKIE, v: 'cookie', look: [-0.3, 0], blink: blink(t, 0.5) });
      shoot(IN.scene, inPeople, V3(2.0, 1.95, -0.3), V3(2.5, 1.9, -0.9), V3(3.5, 1.75, -2.5), null, k, LOOKS.room, 1.6);
      blit();
    } });
    cue(st, 'whoosh'); cue(wc, 'pop', { gain: 0.8 }); cue(wf, 'plop', { gain: 0.8 }); }

  // ── 5 · "and the Kennedy Biscuit Works, in Cambridgeport, started baking them." (the factory street) ──
  { const st = cut(4), wk = W('kennedy', 4, 0.5), wcam = W('cambridge', 4, 2.0); const K = shop('KENNEDY');
    add({ id: 'S05', at: st, note: 'KENNEDY shop front, the baker carries cookies out; "CAMBRIDGEPORT, MASS." label', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d)); const z = K.z; stHide(); stBaker.group.visible = true;
      stBaker.at(-5.1, 0.18, z + 2.2 - k * 3.0); stBaker.set({ legs: 'walk', phase: t * 7, mood: 'happy', armR: [60, -70], holdR: COOKIE, v: 'cookie', blink: blink(t) });
      shoot(ST.scene, stPeople, V3(-0.6, 2.5, z + 8.5), V3(-1.8, 1.9, z + 4.6), V3(-6.0, 2.6, z + 0.6), V3(-6.0, 2.2, z - 0.4), k, LOOKS.street);
      blit(); pill('CAMBRIDGEPORT, MASS.', 540, 430, seg(t, wcam - 0.1, wcam + 0.15), { bg: '#D8343F', fg: '#FFFFFF', size: 56 });
    } });
    cue(st, 'whoosh', { gain: 0.6 }); cue(wk, 'ding', { gain: 0.6 }); cue(wcam, 'pop', { gain: 0.6 }); }

  // ── 6 · "Now, that bakery had a habit, where it named its cookies after places nearby." (pan along the shop names) ──
  { const st = cut(5), K = shop('KENNEDY'), N = shop('NEWTON');
    add({ id: 'S06', at: st, note: 'slow pan down the boardwalk past the shop names', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d)); stHide(); const z0 = K.z + 4, z1 = N.z - 2;
      shoot(ST.scene, stPeople, V3(-1.0, 2.7, z0 + 8), V3(-1.0, 2.7, z1 + 8), V3(-6.2, 3.2, z0), V3(-6.2, 3.2, z1), k, { ...LOOKS.street, fov: 40 });
      blit();
    } });
    cue(st, 'whoosh', { gain: 0.6 }); }

  // ── 7-9 · "Beacon Hill cookies," / "Harvard cookies," / "and Shrewsbury cookies." (one shop each, name label on its word) ──
  const shopShot = (id, i, name, key, dir, col) => {
    const B = shop(name), st = cut(i), w0 = W(key, i, 0.3);
    add({ id, at: st, note: `${name} shop front, the kid with a cookie; "${name} COOKIES" label pops on "${key}"`, draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d)); const z = B.z; stHide(); stKid.group.visible = true;
      stKid.at(-5.1, 0.18, z + 0.8 * dir - k * 0.5 * dir); stKid.set({ legs: 'walk', phase: t * 8, mood: t > w0 ? 'happy' : 'smug', armR: [60, -70], holdR: COOKIE, v: 'cookie', blink: blink(t, i) });
      shoot(ST.scene, stPeople, V3(-0.4, 2.3, z + dir * 7.5), V3(-1.8, 1.8, z + dir * 4.4), V3(-6.0, 2.5, z + dir * 0.3), V3(-6.0, 2.3, z), k, LOOKS.street);
      blit(); pill(name + ' COOKIES', 540, 430, seg(t, w0 - 0.05, w0 + 0.2), { bg: col, fg: '#1F1C33', size: 58 });
    } });
    cue(st, 'whoosh', { gain: 0.6 }); cue(w0, 'pop', { gain: 0.8 });
  };
  shopShot('S07', 6, 'BEACON HILL', 'beacon', 1, '#BFE4F7');
  shopShot('S08', 7, 'HARVARD', 'harvard', -1, '#F2C9D6');
  shopShot('S09', 8, 'SHREWSBURY', 'shrew', 1, '#F2E6A0');

  // ── 10 · "So when plant manager James Hazen needed a name for the fig one," (the boss stumped) ──
  { const st = cut(9), wn = W('name', 9, 1.6);
    add({ id: 'S10', at: st, note: 'the plant manager scratches his head, sweating, "???" poster behind him', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d)); inHide(); inHazen.group.visible = true; pile.visible = true; inHazen.at(3.55, 0, -2.5);
      inHazen.set({ mood: 'worried', sweat: 1, armR: [130, -110], armL: [30, -20], look: [-0.4, 0.5], blink: blink(t) });
      shoot(IN.scene, inPeople, V3(-0.2, 1.9, 1.5), V3(0.8, 1.85, 0.5), V3(2.6, 1.8, -2.4), V3(3.3, 1.8, -2.4), k, LOOKS.room);
      blit(); pill('JAMES HAZEN', 540, 430, seg(t, st + 0.5, st + 0.8) * (t < wn + 1 ? 1 : 0), { bg: '#F4EFE4', size: 56 });
    } });
    cue(st, 'whoosh'); cue(wn, 'ding', { gain: 0.6 }); }

  // ── 11 · "he picked a town nearby: Newton." (he points at the NEWTON shop, the name slams) ──
  { const st = cut(10), wnw = W('newton', 10, 1.4); const N = shop('NEWTON');
    add({ id: 'S11', at: st, note: 'the manager points at the NEWTON shop, big NEWTON stamp on "Newton"', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d)); const z = N.z; stHide(); stHazen.group.visible = true;
      stHazen.at(-5.0, 0.18, z + 1.6); stHazen.set({ mood: t > wnw ? 'happy' : 'smug', armL: [110, -10], armR: [20, 10], blink: blink(t) });
      shoot(ST.scene, stPeople, V3(-0.2, 2.2, z + 8.0), V3(-2.2, 1.9, z + 4.8), V3(-5.6, 2.3, z + 0.8), V3(-6.0, 2.6, z), k, LOOKS.street);
      blit();
      const sp = clamp((t - wnw) / 0.18);
      if (sp > 0) { ctx.save(); ctx.translate(540, 520); ctx.rotate(-0.1); const s = lerp(2.4, 1.2, eo(sp)); ctx.scale(s, s); ctx.globalAlpha = Math.min(1, sp * 1.5);
        ctx.strokeStyle = '#C8283A'; ctx.lineWidth = 14; ctx.beginPath(); ctx.roundRect(-300, -90, 600, 180, 22); ctx.stroke();
        ctx.fillStyle = '#C8283A'; ctx.font = '900 120px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('NEWTON', 0, 6); ctx.restore(); }
    } });
    cue(st, 'whoosh'); cue(wnw, 'stamp', { gain: 1 }); cue(wnw + 0.02, 'slam', { gain: 0.6 }); }

  // ── 12 · "Which means every Fig Newton you've ever eaten" (a kid munching at the counter) ──
  { const st = cut(11), we = W('eaten', 11, 1.6);
    add({ id: 'S12', at: st, note: 'a kid takes a bite of a fig cookie at the counter, the clerk happy', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d)); inHide(); inKid.group.visible = inClerk.group.visible = true; pile.visible = true;
      inKid.at(1.3, 0, -1.9); inClerk.at(3.55, 0, -2.5);
      const bite = t > we - 0.2;
      inKid.set({ mood: bite ? 'happy' : 'smug', armR: [bite ? 120 : 60, -70], holdR: COOKIE, v: 'cookie', blink: blink(t, 0.4) });
      inClerk.set({ mood: 'happy', armL: [40, -30], armR: [30, -20], blink: blink(t, 1) });
      shoot(IN.scene, inPeople, V3(-0.4, 1.7, 1.6), V3(0.5, 1.6, 0.8), V3(2.4, 1.55, -2.2), null, k, LOOKS.room);
      blit();
    } });
    cue(st, 'whoosh'); cue(we - 0.1, 'pop', { gain: 0.8 }); }

  // ── 13 · "is basically a tiny map of Boston." (pull up over the street, a cookie map with the four names) ──
  { const st = cut(12), wt = W('tiny', 12, 0.4), wm = W('map', 12, 0.9), wb = W('boston', 12, 1.3); const K = shop('KENNEDY');
    add({ id: 'S13', at: st, note: 'crane up over the street; a big cookie with the four names pinned around it', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d)); const z = K.z; stHide();
      shoot(ST.scene, stPeople, V3(0.5, 2.6, z + 12), V3(0.5, 15, z + 22), V3(-4.0, 2.5, z - 8), V3(-4.0, 0.0, z - 16), k, { ...LOOKS.street, fov: 46 });
      blit();
      bigCookie(540, 700, 1.0, seg(t, wt - 0.1, wt + 0.25));
      pill('BEACON HILL', 300, 450, seg(t, wt, wt + 0.2), { bg: '#BFE4F7', size: 46 }); pill('HARVARD', 790, 450, seg(t, wt + 0.15, wt + 0.35), { bg: '#F2C9D6', size: 46 });
      pill('SHREWSBURY', 300, 950, seg(t, wm, wm + 0.2), { bg: '#F2E6A0', size: 46 }); pill('NEWTON', 790, 950, seg(t, wm + 0.15, wm + 0.35), { bg: seg(t, wb, wb + 0.1) > 0 ? '#F2C230' : '#7FA36A', fg: seg(t, wb, wb + 0.1) > 0 ? '#1F1C33' : '#FFFFFF', size: 46 });
    } });
    cue(st, 'whoosh', { gain: 0.6 }); cue(wt, 'pop', { gain: 0.8 }); cue(wt + 0.15, 'pop', { gain: 0.7 }); cue(wm, 'pop', { gain: 0.8 }); cue(wm + 0.15, 'pop', { gain: 0.7 }); cue(wb, 'ding', { gain: 0.9 }); }

  return { shots: S, cues: CUES };
}
