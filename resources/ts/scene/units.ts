import * as THREE from 'three';
import type { PlacedUnit } from '../types';
import type { Materials } from './materials';

/**
 * Meshes for one placed unit, in centimetres. The group's origin is the
 * centre of the unit's footprint on the floor; +z is the front, +x runs
 * along the wall.
 */
const FRONT = 1.8;
const GAP = 0.3;
const PLINTH_RECESS = 5;

type Box = { w: number; h: number; d: number; x: number; y: number; z: number };

function box(group: THREE.Group, material: THREE.Material, b: Box): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(b.w, 0.1), Math.max(b.h, 0.1), Math.max(b.d, 0.1)), material);
    mesh.position.set(b.x, b.y, b.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
}

/** A door/drawer front on the plane z = frontZ, spanning x0..x1 and y0..y1. */
function front(
    group: THREE.Group, m: Materials, frontZ: number,
    x0: number, x1: number, y0: number, y1: number,
    handle: 'top' | 'bottom' | 'vertical-left' | 'vertical-right' | 'none' = 'top',
): void {
    const w = x1 - x0 - GAP;
    const h = y1 - y0 - GAP;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    box(group, m.front, { w, h, d: FRONT, x: cx, y: cy, z: frontZ + FRONT / 2 });

    const hz = frontZ + FRONT + 1;
    const length = Math.min(w - 8, 16);
    if (handle === 'top' || handle === 'bottom') {
        const hy = handle === 'top' ? y1 - 5 : y0 + 5;
        box(group, m.handle, { w: Math.max(length, 4), h: 1, d: 1.6, x: cx, y: hy, z: hz });
    } else if (handle !== 'none') {
        const hx = handle === 'vertical-left' ? x0 + 4 : x1 - 4;
        box(group, m.handle, { w: 1, h: Math.min(h - 10, 32), d: 1.6, x: hx, y: cy, z: hz });
    }
}

/** Doors side by side; 60 cm and wider get two. */
function doors(group: THREE.Group, m: Materials, w: number, frontZ: number, y0: number, y1: number, handle: 'top' | 'bottom'): void {
    const count = w >= 60 ? 2 : 1;
    for (let i = 0; i < count; i++) {
        const x0 = -w / 2 + (w / count) * i;
        front(group, m, frontZ, x0, x0 + w / count, y0, y1, handle);
    }
}

function plinth(group: THREE.Group, m: Materials, w: number, d: number, height: number, x = 0, z = 0): void {
    box(group, m.plinth, { w, h: height, d: d - PLINTH_RECESS, x, y: height / 2, z: z - PLINTH_RECESS / 2 });
}

/**
 * @param runSign +1 when the unit's local +x points the way its run's
 *                offsets grow, -1 when it points back towards the start.
 */
export function buildUnit(unit: PlacedUnit, m: Materials, runSign = 1): THREE.Group {
    const group = new THREE.Group();
    for (const side of unit.coverSides ?? []) {
        const x = (side === 'end' ? 1 : -1) * runSign * (unit.width / 2 + 0.65);
        const bottom = unit.level === 'floor' ? 0 : unit.elevation;
        const top = unit.elevation + unit.height;
        box(group, m.front, { w: 1.3, h: top - bottom, d: unit.depth + FRONT, x, y: (top + bottom) / 2, z: FRONT / 2 });
    }
    const w = unit.width;
    const d = unit.depth;
    const h = unit.height;
    const y0 = unit.elevation;
    const y1 = y0 + h;
    const frontZ = d / 2;

    if (unit.filler) {
        box(group, m.front, { w: w - GAP, h: unit.level === 'floor' ? y1 : h, d: FRONT, x: 0, y: unit.level === 'floor' ? y1 / 2 : y0 + h / 2, z: frontZ + FRONT / 2 });
        box(group, m.carcass, { w: w - GAP, h, d: d - 1, x: 0, y: y0 + h / 2, z: -0.5 });
        return group;
    }

    switch (unit.kind) {
        case 'corner':
            return cornerUnit(group, m, unit, 60);
        case 'wall_corner':
            return cornerUnit(group, m, unit, 37);
        case 'hob':
            return hob(group, m, unit);
        case 'sink_bowl':
            return sinkBowl(group, m, unit);
        case 'tap':
            return tap(group, m, unit);
        case 'hood':
            return hood(group, m, unit);
        default:
            break;
    }

    if (unit.level === 'floor') plinth(group, m, w - GAP, d, y0);
    box(group, m.carcass, { w: w - GAP, h, d, x: 0, y: y0 + h / 2, z: 0 });

    switch (unit.kind) {
        case 'drawers': {
            const heights = [0.5, 0.25, 0.25];
            let y = y0;
            for (const share of heights) {
                front(group, m, frontZ, -w / 2, w / 2, y, y + h * share, 'top');
                y += h * share;
            }
            break;
        }
        case 'oven': {
            front(group, m, frontZ, -w / 2, w / 2, y0, y0 + 18, 'top');
            box(group, m.glass, { w: w - 2, h: h - 20, d: FRONT, x: 0, y: y0 + 18 + (h - 18) / 2, z: frontZ + FRONT / 2 });
            box(group, m.steel, { w: w - 12, h: 1.4, d: 2.5, x: 0, y: y1 - 7, z: frontZ + FRONT + 1.2 });
            box(group, m.steel, { w: w - 2, h: 4, d: 0.4, x: 0, y: y1 - 2.5, z: frontZ + FRONT + 0.1 });
            break;
        }
        case 'dishwasher':
            front(group, m, frontZ, -w / 2, w / 2, y0, y1, 'top');
            break;
        case 'tall':
        case 'fridge': {
            const split = y0 + (unit.kind === 'fridge' ? 80 : h * 0.36);
            front(group, m, frontZ, -w / 2, w / 2, y0, split, 'vertical-right');
            front(group, m, frontZ, -w / 2, w / 2, split, y1, 'vertical-right');
            break;
        }
        case 'wall':
            doors(group, m, w, frontZ, y0, y1, 'bottom');
            break;
        case 'sink':
        case 'base':
        default:
            if (unit.level === 'wall') doors(group, m, w, frontZ, y0, y1, 'bottom');
            else doors(group, m, w, frontZ, y0, y1, 'top');
            break;
    }

    return group;
}

/**
 * L-shaped corner cabinet. The unit's footprint is size × size; the carcass
 * is `depth` deep along both walls and the doors face the inner corner.
 */
function cornerUnit(group: THREE.Group, m: Materials, unit: PlacedUnit, depth: number): THREE.Group {
    const size = unit.width;
    const half = size / 2;
    const s = unit.corner === 'right' ? -1 : 1;
    const inner = -half + depth; // where the carcass stops, measured from the walls
    const y0 = unit.elevation;
    const h = unit.height;
    const y1 = y0 + h;
    const handle = unit.level === 'wall' ? 'bottom' : 'top';

    // Along the back wall: full width, `depth` deep.
    box(group, m.carcass, { w: size, h, d: depth, x: 0, y: y0 + h / 2, z: -half + depth / 2 });
    // Along the side wall: `depth` wide, the rest of the footprint long.
    box(group, m.carcass, { w: depth, h, d: size - depth, x: s * (-half + depth / 2), y: y0 + h / 2, z: inner + (size - depth) / 2 });

    if (unit.level === 'floor') {
        plinth(group, m, size, depth, y0, 0, -half + depth / 2);
        const side = new THREE.Group();
        plinth(side, m, size - depth, depth, y0);
        side.rotation.y = s * Math.PI / 2;
        side.position.set(s * (-half + depth / 2), 0, inner + (size - depth) / 2);
        group.add(side);
    }

    // Door facing the room from the back part…
    const a = new THREE.Group();
    front(a, m, 0, 0, size - depth, y0, y1, handle);
    a.position.set(s * inner + (s > 0 ? 0 : -(size - depth)), 0, inner);
    group.add(a);
    // …and one from the side part, turned 90°.
    const b = new THREE.Group();
    if (s > 0) front(b, m, 0, -(size - depth), 0, y0, y1, handle);
    else front(b, m, 0, 0, size - depth, y0, y1, handle);
    b.rotation.y = s * Math.PI / 2;
    b.position.set(s * inner, 0, inner);
    group.add(b);

    return group;
}

function hob(group: THREE.Group, m: Materials, unit: PlacedUnit): THREE.Group {
    const y = unit.elevation;
    box(group, m.glass, { w: unit.width, h: 0.6, d: unit.depth, x: 0, y: y + 0.3, z: 0 });
    const rings: [number, number, number][] = [[-0.25, -0.22, 9], [0.25, -0.22, 7.5], [-0.25, 0.22, 7.5], [0.25, 0.22, 9.5]];
    for (const [fx, fz, r] of rings) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.5, r, 40), m.ring);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(fx * unit.width, y + 0.65, fz * unit.depth * 1.6);
        group.add(ring);
    }
    return group;
}

function sinkBowl(group: THREE.Group, m: Materials, unit: PlacedUnit): THREE.Group {
    const y = unit.elevation;
    box(group, m.steel, { w: unit.width, h: 0.5, d: unit.depth, x: 0, y: y + 0.25, z: 0 });
    box(group, m.basin, { w: unit.width - 8, h: 0.4, d: unit.depth - 8, x: 0, y: y + 0.55, z: 0 });
    const drain = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), m.ring);
    drain.rotation.x = -Math.PI / 2;
    drain.position.set(0, y + 0.8, 0);
    group.add(drain);
    return group;
}

function tap(group: THREE.Group, m: Materials, unit: PlacedUnit): THREE.Group {
    const y = unit.elevation;
    const back = -24; // towards the wall, behind the bowl
    const column = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 28, 20), m.steel);
    column.position.set(0, y + 14, back);
    group.add(column);
    const spout = new THREE.Mesh(new THREE.TorusGeometry(9, 1.1, 12, 24, Math.PI), m.steel);
    spout.rotation.y = Math.PI / 2;
    spout.position.set(0, y + 28, back + 9);
    group.add(spout);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 9), m.steel);
    lever.position.set(3, y + 22, back - 1);
    lever.rotation.y = -0.6;
    group.add(lever);
    group.traverse((o) => { o.castShadow = true; });
    return group;
}

function hood(group: THREE.Group, m: Materials, unit: PlacedUnit): THREE.Group {
    const y0 = unit.elevation;
    const canopy = 7;
    box(group, m.steel, { w: unit.width, h: canopy, d: unit.depth, x: 0, y: y0 + canopy / 2, z: 0 });
    const chimney = Math.max(unit.height - canopy, 5);
    box(group, m.steel, { w: 26, h: chimney, d: 24, x: 0, y: y0 + canopy + chimney / 2, z: -unit.depth / 2 + 12 });
    box(group, m.glass, { w: unit.width - 6, h: 0.4, d: unit.depth - 6, x: 0, y: y0 - 0.1, z: 0 });
    return group;
}
