import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { COUNTER_TOP, METOD, unitTransform } from '../layout/planner';
import type { PlacedUnit, PlanResult, Run, RunId } from '../types';
import { type FinishColors, Materials } from './materials';
import { buildUnit } from './units';

export type View = 'perspective' | 'front' | 'top';

/** Renders a planned kitchen in a room you can orbit around. Units are centimetres. */
export class KitchenScene {
    private readonly renderer: THREE.WebGLRenderer;
    private readonly scene = new THREE.Scene();
    private readonly camera = new THREE.PerspectiveCamera(42, 1, 5, 8000);
    private readonly controls: OrbitControls;
    private readonly materials = new Materials();
    private readonly kitchen = new THREE.Group();
    private readonly roomGroup = new THREE.Group();
    private readonly sun = new THREE.DirectionalLight('#fff4e2', 2.1);
    private readonly raycaster = new THREE.Raycaster();
    private readonly pointer = new THREE.Vector2();
    private readonly unitGroups = new Map<string, THREE.Group>();
    private highlight: THREE.Box3Helper | null = null;
    private selection: THREE.Box3Helper | null = null;
    private readonly selectionColor = new THREE.Color('#f97316');
    private plan: PlanResult | null = null;
    private view: View = 'perspective';
    private hoveredUid: string | null = null;
    private selectedUid: string | null = null;
    private downPos: { x: number; y: number } | null = null;
    private frame = 0;

    /** Called with the unit under the pointer (or null) and the pointer position. */
    onHover: (unit: PlacedUnit | null, x: number, y: number) => void = () => {};
    /** Called with the clicked unit (or null, when the click missed) whenever the selection changes. */
    onSelect: (unit: PlacedUnit | null) => void = () => {};

    constructor(private readonly container: HTMLElement) {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.95;
        container.appendChild(this.renderer.domElement);

        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        this.scene.environmentIntensity = 0.55;
        this.scene.background = new THREE.Color('#e9e6e0');

        this.scene.add(new THREE.HemisphereLight('#ffffff', '#a89a86', 0.75));
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(2048, 2048);
        this.sun.shadow.bias = -0.0004;
        this.sun.shadow.normalBias = 0.6;
        this.scene.add(this.sun, this.sun.target);
        this.scene.add(this.roomGroup, this.kitchen);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
        this.controls.minDistance = 60;
        this.controls.maxDistance = 3000;

        this.renderer.domElement.addEventListener('pointermove', (e) => this.handlePointer(e));
        this.renderer.domElement.addEventListener('pointerleave', () => this.setHovered(null, 0, 0));
        this.renderer.domElement.addEventListener('pointerdown', (e) => { this.downPos = { x: e.clientX, y: e.clientY }; });
        this.renderer.domElement.addEventListener('pointerup', (e) => this.handleClick(e));
        new ResizeObserver(() => this.resize()).observe(container);
        this.resize();
        this.loop();
    }

    update(plan: PlanResult, colors: FinishColors, keepCamera = true): void {
        const roomChanged = !this.plan
            || this.plan.room.width !== plan.room.width
            || this.plan.room.depth !== plan.room.depth
            || this.plan.room.height !== plan.room.height;
        this.plan = plan;
        this.materials.apply(colors);
        this.buildRoom(plan);
        this.buildKitchen(plan);
        if (roomChanged || !keepCamera) this.setView(this.view);
    }

    setView(view: View): void {
        this.view = view;
        if (!this.plan) return;
        const { width: W, depth: D, height: H } = this.plan.room;
        const target = new THREE.Vector3(W / 2, 95, D * 0.35);
        const span = Math.max(W, D);
        this.controls.enableRotate = view !== 'top';
        if (view === 'top') {
            target.set(W / 2, 0, D / 2);
            this.camera.position.set(W / 2, span * 1.9 + H, D / 2 + 0.01);
        } else if (view === 'front') {
            this.camera.position.set(W / 2, 150, D + span * 1.15);
        } else {
            this.camera.position.set(W / 2 + span * 0.42, H * 1.3, D + span * 1.15);
        }
        this.controls.target.copy(target);
        this.controls.update();
    }

    /** PNG of what's on screen. */
    snapshot(): string {
        this.renderer.render(this.scene, this.camera);
        return this.renderer.domElement.toDataURL('image/png');
    }

    focusUnit(uid: string | null): void {
        this.setHovered(uid, 0, 0, false);
    }

    /** Clears the current selection, e.g. once the selected item has been removed. */
    clearSelection(): void {
        this.select(null, false);
    }

    private buildRoom(plan: PlanResult): void {
        disposeChildren(this.roomGroup);
        const { width: W, depth: D, height: H } = plan.room;
        const m = this.materials;

        const floorTexture = m.floor.map;
        if (floorTexture) floorTexture.repeat.set(W / 180, D / 180);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), m.floor);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(W / 2, 0, D / 2);
        floor.receiveShadow = true;
        this.roomGroup.add(floor);

        // Single-sided walls facing inwards: from outside the room you look
        // straight through the near walls, like a doll's house.
        const wall = (w: number, x: number, z: number, rotation: number) => {
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, H), m.wall);
            mesh.position.set(x, H / 2, z);
            mesh.rotation.y = rotation;
            mesh.receiveShadow = true;
            this.roomGroup.add(mesh);
        };
        wall(W, W / 2, 0, 0);
        wall(D, 0, D / 2, Math.PI / 2);
        wall(D, W, D / 2, -Math.PI / 2);
        wall(W, W / 2, D, Math.PI);

        // Outline of the floor, so the room's size reads even where walls are see-through.
        const outline = new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(W, 0.2, 0), new THREE.Vector3(W, 0.2, D), new THREE.Vector3(0, 0.2, D),
            ]),
            new THREE.LineBasicMaterial({ color: '#9c958a' }),
        );
        this.roomGroup.add(outline);

        const span = Math.max(W, D);
        this.sun.position.set(W * 0.75, H * 2.2, D * 1.6);
        this.sun.target.position.set(W / 2, 0, D / 2);
        const cam = this.sun.shadow.camera;
        cam.left = cam.bottom = -span;
        cam.right = cam.top = span;
        cam.near = 10;
        cam.far = span * 5 + H * 4;
        cam.updateProjectionMatrix();
    }

    private buildKitchen(plan: PlanResult): void {
        disposeChildren(this.kitchen);
        this.unitGroups.clear();
        this.highlight = null;
        this.selection = null;
        this.hoveredUid = null;
        const runs = new Map<RunId, Run>(plan.runs.map((r) => [r.id, r]));

        for (const unit of plan.units) {
            const run = runs.get(unit.run);
            if (!run) continue;
            // Things on the worktop are centred on its depth, not their own.
            const footprint = unit.level === 'top' ? { ...unit, depth: METOD.worktopDepth } : unit;
            const t = unitTransform(footprint, run);
            // Local +x in world space is (cos r, -sin r); compare it with the run's direction.
            const runSign = Math.sign(run.dir.x * Math.cos(t.rotation) - run.dir.z * Math.sin(t.rotation)) || 1;
            const group = buildUnit(unit, this.materials, runSign);
            group.position.set(t.x, 0, t.z);
            group.rotation.y = t.rotation;
            group.userData.uid = unit.uid;
            this.kitchen.add(group);
            this.unitGroups.set(unit.uid, group);
        }

        for (const top of plan.worktops) {
            const run = runs.get(top.run);
            if (!run) continue;
            const t = unitTransform({ offset: top.offset, width: top.length, depth: top.depth }, run);
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(top.length, METOD.worktopThickness, top.depth), this.materials.worktop);
            mesh.position.set(t.x, COUNTER_TOP - METOD.worktopThickness / 2, t.z);
            mesh.rotation.y = t.rotation;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.kitchen.add(mesh);
        }

        // The plan was rebuilt, so uids may no longer line up with what they meant before.
        // Keep the selection only if the same uid still identifies a unit.
        if (this.selectedUid && this.unitGroups.has(this.selectedUid)) {
            this.drawSelection(this.selectedUid);
        } else if (this.selectedUid) {
            this.select(null);
        }
    }

    /** Ray-picks the unit uid under a client-space point, or null when nothing was hit. */
    private pickUid(clientX: number, clientY: number): string | null {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const hit = this.raycaster.intersectObjects(this.kitchen.children, true)[0];
        for (let o: THREE.Object3D | null = hit?.object ?? null; o; o = o.parent) {
            if (o.userData.uid) return o.userData.uid as string;
        }
        return null;
    }

    private handlePointer(event: PointerEvent): void {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const uid = this.pickUid(event.clientX, event.clientY);
        this.setHovered(uid, event.clientX - rect.left, event.clientY - rect.top);
    }

    /** A click (pointerdown+up close together) selects the unit under the pointer; a drag doesn't. */
    private handleClick(event: PointerEvent): void {
        const down = this.downPos;
        this.downPos = null;
        if (!down) return;
        const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
        if (moved > 5) return;
        this.select(this.pickUid(event.clientX, event.clientY));
    }

    private select(uid: string | null, notify = true): void {
        this.selectedUid = uid;
        if (this.selection) {
            this.kitchen.remove(this.selection);
            this.selection.dispose();
            this.selection = null;
        }
        if (uid) this.drawSelection(uid);
        if (notify) this.onSelect(uid ? (this.plan?.units.find((u) => u.uid === uid) ?? null) : null);
    }

    private drawSelection(uid: string): void {
        const group = this.unitGroups.get(uid);
        if (!group) return;
        if (this.selection) {
            this.kitchen.remove(this.selection);
            this.selection.dispose();
        }
        const box = new THREE.Box3().setFromObject(group).expandByScalar(0.9);
        this.selection = new THREE.Box3Helper(box, this.selectionColor);
        this.kitchen.add(this.selection);
    }

    private setHovered(uid: string | null, x: number, y: number, notify = true): void {
        if (uid !== this.hoveredUid) {
            if (this.highlight) {
                this.kitchen.remove(this.highlight);
                this.highlight.dispose();
                this.highlight = null;
            }
            const group = uid && uid !== this.selectedUid ? this.unitGroups.get(uid) : undefined;
            if (group) {
                const box = new THREE.Box3().setFromObject(group).expandByScalar(0.6);
                this.highlight = new THREE.Box3Helper(box, this.materials.highlight);
                this.kitchen.add(this.highlight);
            }
            this.hoveredUid = uid;
        }
        if (notify) this.onHover(uid ? (this.plan?.units.find((u) => u.uid === uid) ?? null) : null, x, y);
    }

    private resize(): void {
        const { clientWidth: w, clientHeight: h } = this.container;
        if (w === 0 || h === 0) return;
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }

    private loop = (): void => {
        this.frame = requestAnimationFrame(this.loop);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    };

    dispose(): void {
        cancelAnimationFrame(this.frame);
        this.renderer.dispose();
    }
}

function disposeChildren(group: THREE.Group): void {
    for (const child of [...group.children]) {
        child.traverse((o) => {
            if (o instanceof THREE.Mesh || o instanceof THREE.Line) o.geometry.dispose();
        });
        group.remove(child);
    }
}
