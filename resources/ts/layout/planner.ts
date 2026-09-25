import { fillWidths } from './fill';
import type {
    InventoryItem, Kind, PlacedUnit, PlanResult, Product, Room, Run, RunId, ShoppingLine, Worktop,
} from '../types';

/** METOD system measurements (cm). */
export const METOD = {
    plinth: 8,
    baseHeight: 80,
    carcassDepth: 60,
    frontDepth: 2,
    worktopThickness: 3.8,
    worktopDepth: 63.5,
    wallBottom: 148,
    wallDepth: 37,
    cornerBase: 88,
    cornerWall: 68,
    hoodAboveHob: 65,
    plinthLength: 220,
    worktopLength: 246,
    minWalkway: 100,
    /** How much of a side wall to leave free (door, walkway) when no run length is given. */
    sideRunClearance: 100,
} as const;

export const COUNTER_TOP = METOD.plinth + METOD.baseHeight + METOD.worktopThickness;

export interface PlanOptions {
    /** Standard items to fill gaps with and to complete the kitchen. */
    catalog: Product[];
    /** Fill gaps and add missing essentials (sink, hob, fridge…) from the catalog. */
    autofill: boolean;
}

type Slot = 'fillL' | 'sink' | 'dw' | 'fillM' | 'cook' | 'fillR' | 'tall';
const SLOT_ORDER: Slot[] = ['fillL', 'sink', 'dw', 'fillM', 'cook', 'fillR', 'tall'];

interface Piece {
    product: Product;
    width: number;
    suggested: boolean;
    filler?: boolean;
    /** Index into the customer's inventory, so we can give it back if it doesn't fit. */
    stock?: number;
}

interface RunPlan {
    run: Run;
    slots: Record<Slot, Piece[]>;
    startsAtCorner: boolean;
    startsAtWall: boolean;
    endsAtWall: boolean;
    /** Where wall units may start on this run. */
    wallStart: number;
    wallEnd: number;
}

const FLOOR_KINDS: Kind[] = ['base', 'drawers', 'sink', 'corner', 'dishwasher', 'oven', 'tall', 'fridge'];
const WALL_KINDS: Kind[] = ['wall', 'wall_corner', 'hood'];

/** The customer's products, one entry per physical item. */
class Stock {
    private readonly entries: { product: Product; used: boolean }[] = [];

    constructor(items: InventoryItem[]) {
        for (const item of items) {
            for (let i = 0; i < Math.max(0, Math.floor(item.quantity)); i++) {
                this.entries.push({ product: item.product, used: false });
            }
        }
    }

    take(kinds: Kind[], accept: (p: Product) => boolean = () => true): Piece | null {
        const index = this.entries.findIndex((e) => !e.used && kinds.includes(e.product.kind) && accept(e.product));
        if (index < 0) return null;
        this.entries[index].used = true;
        const product = this.entries[index].product;

        return { product, width: product.dimensions.width, suggested: false, stock: index };
    }

    takeAll(kinds: Kind[]): Piece[] {
        const pieces: Piece[] = [];
        for (let p = this.take(kinds); p !== null; p = this.take(kinds)) pieces.push(p);

        return pieces;
    }

    giveBack(piece: Piece): void {
        if (piece.stock !== undefined) this.entries[piece.stock].used = false;
    }

    count(kind: Kind): number {
        return this.entries.filter((e) => e.product.kind === kind).length;
    }

    unused(kinds: Kind[]): InventoryItem[] {
        const byId = new Map<string, InventoryItem>();
        for (const e of this.entries) {
            if (e.used || !kinds.includes(e.product.kind)) continue;
            const line = byId.get(e.product.id) ?? { product: e.product, quantity: 0 };
            line.quantity++;
            byId.set(e.product.id, line);
        }

        return [...byId.values()];
    }

    accessories(): InventoryItem[] {
        const byId = new Map<string, InventoryItem>();
        for (const e of this.entries) {
            if (FLOOR_KINDS.includes(e.product.kind) || WALL_KINDS.includes(e.product.kind)) continue;
            const line = byId.get(e.product.id) ?? { product: e.product, quantity: 0 };
            line.quantity++;
            byId.set(e.product.id, line);
        }

        return [...byId.values()];
    }
}

/** Standard items from the catalog. */
class Catalog {
    constructor(private readonly items: Product[]) {}

    pick(kind: Kind, width?: number, accept: (p: Product) => boolean = () => true): Product | null {
        const candidates = this.items.filter((p) => p.kind === kind && accept(p));
        if (candidates.length === 0) return null;
        if (width === undefined) return candidates.find((p) => p.dimensions.width === 60) ?? candidates[0];

        return candidates.find((p) => p.dimensions.width === width)
            ?? [...candidates].sort((a, b) => Math.abs(a.dimensions.width - width) - Math.abs(b.dimensions.width - width))[0];
    }

    piece(kind: Kind, width?: number, accept?: (p: Product) => boolean): Piece | null {
        const product = this.pick(kind, width, accept);

        return product ? { product, width: product.dimensions.width, suggested: true } : null;
    }

    widths(kind: Kind): number[] {
        return this.items.filter((p) => p.kind === kind).map((p) => p.dimensions.width);
    }

    coverPanel(): Product {
        return this.pick('panel', undefined, (p) => p.dimensions.height >= 60) ?? customProduct('panel', 'Cover panel', 62, 1.3, 80);
    }

    plinth(): Product {
        return this.pick('panel', undefined, (p) => p.dimensions.height < 20) ?? customProduct('panel', 'Plinth', 220, 1.3, 8);
    }
}

function customProduct(kind: Kind, name: string, width: number, depth: number, height: number): Product {
    return {
        id: `custom-${kind}-${width}x${depth}x${height}`, name, kind,
        dimensions: { width, depth, height }, source: 'custom', articleNumber: null,
        price: null, priceIsEstimate: false, url: null, imageUrl: null,
    };
}

function emptySlots(): Record<Slot, Piece[]> {
    return { fillL: [], sink: [], dw: [], fillM: [], cook: [], fillR: [], tall: [] };
}

const sum = (pieces: Piece[]): number => pieces.reduce((total, p) => total + p.width, 0);
const runLabel = (id: RunId): string => ({ back: 'back', left: 'left', right: 'right', front: 'opposite' })[id];
const round = (n: number): number => Math.round(n * 10) / 10;

/**
 * Lay out a METOD kitchen in the room from the customer's products,
 * optionally completing it with standard catalog items.
 *
 * Coordinates: x along the back wall from the left corner, z from the back
 * wall into the room. Each run is a line of cabinets along one wall.
 */
export function planKitchen(room: Room, inventory: InventoryItem[], options: PlanOptions): PlanResult {
    const stock = new Stock(inventory);
    const catalog = new Catalog(options.catalog);
    const autofill = options.autofill;
    const warnings: string[] = [];
    const W = room.width;
    const D = room.depth;
    const hasLeft = room.shape === 'L' || room.shape === 'U';
    const hasRight = room.shape === 'U';
    const sideDefault = Math.max(0, D - METOD.sideRunClearance);

    // --- corners ------------------------------------------------------------
    const takeOrSuggest = (kind: Kind, width?: number): Piece | null =>
        stock.take([kind]) ?? (autofill ? catalog.piece(kind, width) : null);

    const cornerLeft = hasLeft ? takeOrSuggest('corner') : null;
    const cornerRight = hasRight ? takeOrSuggest('corner') : null;
    const wallCornerLeft = hasLeft ? takeOrSuggest('wall_corner') : null;
    const wallCornerRight = hasRight ? takeOrSuggest('wall_corner') : null;
    const cornerSize = (p: Piece | null) => p?.product.dimensions.width ?? METOD.cornerBase;
    const blindStart = METOD.carcassDepth + METOD.frontDepth;

    // --- runs ---------------------------------------------------------------
    const plans = new Map<RunId, RunPlan>();
    const addRun = (plan: Omit<RunPlan, 'slots'>) => plans.set(plan.run.id, { ...plan, slots: emptySlots() });

    addRun({
        run: {
            id: 'back', origin: { x: 0, z: 0 }, dir: { x: 1, z: 0 }, normal: { x: 0, z: 1 },
            start: cornerLeft ? cornerSize(cornerLeft) : 0,
            end: W - (cornerRight ? cornerSize(cornerRight) : 0),
        },
        startsAtCorner: hasLeft, startsAtWall: !hasLeft, endsAtWall: !hasRight,
        wallStart: wallCornerLeft ? wallCornerLeft.width : 0,
        wallEnd: W - (wallCornerRight ? wallCornerRight.width : 0),
    });
    if (hasLeft) {
        const end = Math.min(D, room.leftRunLength ?? sideDefault);
        addRun({
            run: {
                id: 'left', origin: { x: 0, z: 0 }, dir: { x: 0, z: 1 }, normal: { x: 1, z: 0 },
                start: cornerLeft ? cornerSize(cornerLeft) : blindStart, end,
            },
            startsAtCorner: true, startsAtWall: false, endsAtWall: end >= D - 1,
            wallStart: wallCornerLeft ? wallCornerLeft.width : METOD.wallDepth, wallEnd: end,
        });
    }
    if (hasRight) {
        const end = Math.min(D, room.rightRunLength ?? sideDefault);
        addRun({
            run: {
                id: 'right', origin: { x: W, z: 0 }, dir: { x: 0, z: 1 }, normal: { x: -1, z: 0 },
                start: cornerRight ? cornerSize(cornerRight) : blindStart, end,
            },
            startsAtCorner: true, startsAtWall: false, endsAtWall: end >= D - 1,
            wallStart: wallCornerRight ? wallCornerRight.width : METOD.wallDepth, wallEnd: end,
        });
    }
    if (room.shape === 'galley') {
        addRun({
            run: { id: 'front', origin: { x: 0, z: D }, dir: { x: 1, z: 0 }, normal: { x: 0, z: -1 }, start: 0, end: W },
            startsAtCorner: false, startsAtWall: true, endsAtWall: true, wallStart: 0, wallEnd: W,
        });
    }

    const usable = (id: RunId): number => {
        const p = plans.get(id);
        return p ? Math.max(0, p.run.end - p.run.start) : 0;
    };
    const used = (id: RunId): number => {
        const p = plans.get(id);
        return p ? SLOT_ORDER.reduce((t, s) => t + sum(p.slots[s]), 0) : 0;
    };
    const free = (id: RunId): number => usable(id) - used(id);

    // Walkways
    if (room.shape === 'U' && W - 2 * blindStart < METOD.minWalkway) {
        warnings.push(`Only ${round(W - 2 * blindStart)} cm between the left and right runs — at least ${METOD.minWalkway} cm is comfortable.`);
    }
    if (room.shape === 'galley' && D - 2 * blindStart < METOD.minWalkway) {
        warnings.push(`Only ${round(D - 2 * blindStart)} cm between the two runs — at least ${METOD.minWalkway} cm is comfortable.`);
    }
    for (const side of ['left', 'right'] as const) {
        if (plans.has(side) && usable(side) < 20) {
            warnings.push(`The ${side} run is too short for any cabinet; everything goes on the back wall.`);
        }
    }

    // --- which run gets what -------------------------------------------------
    const sinkRun: RunId = 'back';
    let cookRun: RunId = room.shape === 'I' ? 'back' : room.shape === 'galley' ? 'front' : 'left';
    let tallRun: RunId = room.shape === 'U' ? 'right' : room.shape === 'galley' ? 'front' : 'back';
    if (usable(cookRun) < 60) cookRun = 'back';
    if (usable(tallRun) < 60) tallRun = 'back';

    // --- essentials -----------------------------------------------------------
    const sink = stock.take(['sink']) ?? (autofill ? catalog.piece('sink', W >= 300 ? 80 : 60) : null);
    const dishwasher = stock.take(['dishwasher']) ?? (autofill ? catalog.piece('dishwasher') : null);
    const oven = stock.take(['oven']) ?? (autofill ? catalog.piece('oven') : null);
    const hobPiece = stock.take(['hob']) ?? (autofill ? catalog.piece('hob') : null);
    const carrier = oven
        ?? (hobPiece
            ? stock.take(['drawers'], (p) => p.dimensions.width >= 60)
                ?? stock.take(['base'], (p) => p.dimensions.width >= 60)
                ?? catalog.piece('drawers', 60)
            : null);
    let hood = stock.take(['hood']) ?? (autofill && carrier ? catalog.piece('hood') : null);
    const talls = stock.takeAll(['fridge', 'tall']).sort((a, b) => Number(b.product.kind === 'fridge') - Number(a.product.kind === 'fridge'));
    if (autofill && !talls.some((t) => t.product.kind === 'fridge')) {
        const fridge = catalog.piece('fridge');
        if (fridge) talls.unshift(fridge);
    }

    const slotsOf = (id: RunId) => (plans.get(id) as RunPlan).slots;
    if (sink) slotsOf(sinkRun).sink.push(sink);
    if (dishwasher) slotsOf(sinkRun).dw.push(dishwasher);
    if (carrier) slotsOf(cookRun).cook.push(carrier);
    slotsOf(tallRun).tall.push(...talls);

    const dropped: Piece[] = [];
    const drop = (piece: Piece, why: string) => {
        dropped.push(piece);
        stock.giveBack(piece);
        if (!piece.suggested) warnings.push(`${piece.product.name} doesn't fit (${why}).`);
    };

    // Too much for the wall? Give up the least important things first.
    for (const plan of plans.values()) {
        const s = plan.slots;
        const over = () => used(plan.run.id) > usable(plan.run.id) + 0.01;
        const where = `${runLabel(plan.run.id)} wall`;
        while (over() && s.tall.some((t) => t.product.kind !== 'fridge')) {
            const i = s.tall.map((t) => t.product.kind).lastIndexOf('tall');
            drop(s.tall.splice(i, 1)[0], where);
        }
        if (over() && s.dw.length) drop(s.dw.pop() as Piece, where);
        while (over() && s.tall.length) drop(s.tall.pop() as Piece, where);
        if (over() && s.cook.length) drop(s.cook.pop() as Piece, where);
        if (over() && s.sink.length) drop(s.sink.pop() as Piece, where);
    }
    const cookPlaced = [...plans.values()].some((p) => p.slots.cook.length > 0);
    const sinkPlaced = [...plans.values()].some((p) => p.slots.sink.length > 0);
    if (!cookPlaced) {
        if (hobPiece && !hobPiece.suggested) warnings.push(`${hobPiece.product.name} has no cabinet to sit on.`);
        if (hood && !hood.suggested) stock.giveBack(hood);
        hood = null;
    }

    // --- the customer's own base cabinets -------------------------------------
    const bases = stock.takeAll(['base', 'drawers']).sort((a, b) => b.width - a.width);
    const hasMiddle = (plan: RunPlan) => plan.slots.sink.length > 0 && plan.slots.cook.length > 0;
    const pickSlot = (plan: RunPlan): Slot => {
        const s = plan.slots;
        if (hasMiddle(plan) && sum(s.fillM) < 60) return 'fillM';
        // Keep the corner side filled first on side runs, so the open end stays tidy.
        const candidates: Slot[] = ['fillL', 'fillR'];
        return candidates.sort((a, b) => sum(s[a]) - sum(s[b]))[0];
    };
    for (const piece of bases) {
        const target = [...plans.values()]
            .filter((p) => free(p.run.id) >= piece.width - 0.01)
            .sort((a, b) => free(b.run.id) - free(a.run.id))[0];
        if (!target) {
            drop(piece, 'no wall has room left');
            continue;
        }
        target.slots[pickSlot(target)].push(piece);
    }

    // --- fill the gaps ---------------------------------------------------------
    const baseWidths = catalog.widths('base');
    for (const plan of plans.values()) {
        const id = plan.run.id;
        let gap = free(id);
        if (gap < 1) continue;

        if (autofill) {
            for (const width of fillWidths(gap, baseWidths)) {
                const slot = pickSlot(plan);
                // A drawer unit next to the hob is where pans go.
                const nextToHob = plan.slots.cook.length > 0 && !plan.slots[slot].some((p) => p.product.kind === 'drawers')
                    && (slot === 'fillM' || slot === 'fillR' || (slot === 'fillL' && !plan.slots.sink.length));
                const piece = (nextToHob ? catalog.piece('drawers', width, (p) => p.dimensions.width === width) : null)
                    ?? catalog.piece('base', width);
                if (piece) plan.slots[slot].push(piece);
            }
            gap = free(id);
        }

        if (gap >= 1) {
            if (autofill && gap < 20 + 0.01 && (plan.endsAtWall || plan.startsAtWall || plan.startsAtCorner)) {
                const filler: Piece = { product: catalog.coverPanel(), width: round(gap), suggested: true, filler: true };
                if (plan.endsAtWall) plan.slots.tall.push(filler);
                else plan.slots.fillL.unshift(filler);
            } else if (plan.endsAtWall || !autofill) {
                warnings.push(`${round(gap)} cm of the ${runLabel(id)} wall is left empty${autofill ? '' : ' — turn on auto-fill or add cabinets'}.`);
            }
        }
    }

    // --- place floor units -------------------------------------------------------
    const units: PlacedUnit[] = [];
    let uid = 0;
    const place = (piece: Piece, run: RunId, level: PlacedUnit['level'], offset: number, extra: Partial<PlacedUnit> = {}): PlacedUnit => {
        const d = piece.product.dimensions;
        const unit: PlacedUnit = {
            uid: `u${++uid}`,
            product: piece.product,
            kind: piece.product.kind,
            run,
            level,
            offset: round(offset),
            width: piece.width,
            // Floor units line up at the carcass depth (a 57 cm dishwasher still sits flush).
            depth: level === 'wall' ? Math.min(d.depth, 70) : level === 'top' ? d.depth : piece.filler ? METOD.carcassDepth : Math.min(Math.max(d.depth, METOD.carcassDepth), 70),
            height: piece.filler ? (level === 'wall' ? 80 : METOD.baseHeight) : d.height,
            elevation: level === 'floor' ? METOD.plinth : level === 'wall' ? METOD.wallBottom : COUNTER_TOP,
            suggested: piece.suggested,
            ...(piece.filler ? { filler: true } : {}),
            ...extra,
        };
        units.push(unit);
        return unit;
    };

    if (cornerLeft) place(cornerLeft, 'back', 'floor', 0, { depth: cornerSize(cornerLeft), corner: 'left' });
    if (cornerRight) place(cornerRight, 'back', 'floor', W - cornerSize(cornerRight), { depth: cornerSize(cornerRight), corner: 'right' });

    const cookUnit: { unit?: PlacedUnit } = {};
    const sinkUnit: { unit?: PlacedUnit } = {};
    const tallStart = new Map<RunId, number>();
    const floorEnd = new Map<RunId, number>();

    for (const plan of plans.values()) {
        const id = plan.run.id;
        let offset = plan.run.start;
        // Tall units stand at the far end of the run, against the wall if there is one.
        const talls = plan.slots.tall.filter((p) => !p.filler);
        const endFiller = plan.slots.tall.filter((p) => p.filler);
        for (const slot of SLOT_ORDER) {
            if (slot === 'tall') continue;
            for (const piece of plan.slots[slot]) {
                const unit = place(piece, id, 'floor', offset);
                if (slot === 'cook') cookUnit.unit = unit;
                if (slot === 'sink') sinkUnit.unit = unit;
                offset += piece.width;
            }
        }
        const lowEnd = offset;
        if (talls.length) {
            const tallWidth = sum(talls) + sum(endFiller);
            offset = plan.endsAtWall ? Math.max(offset, plan.run.end - tallWidth) : offset;
            tallStart.set(id, offset);
            for (const piece of talls) {
                place(piece, id, 'floor', offset);
                offset += piece.width;
            }
        }
        for (const piece of endFiller) {
            place(piece, id, 'floor', offset);
            offset += piece.width;
        }
        floorEnd.set(id, lowEnd);
    }

    // --- things on the worktop ------------------------------------------------------
    const onTop = (piece: Piece | null, host: PlacedUnit | undefined): void => {
        if (!piece || !host) return;
        const width = Math.min(piece.width, host.width - 4);
        place({ ...piece, width }, host.run, 'top', host.offset + (host.width - width) / 2, { hostUid: host.uid });
    };
    if (cookPlaced) onTop(hobPiece, cookUnit.unit);
    if (sinkPlaced) {
        onTop(stock.take(['sink_bowl']) ?? (autofill ? catalog.piece('sink_bowl') : null), sinkUnit.unit);
        onTop(stock.take(['tap']) ?? (autofill ? catalog.piece('tap') : null), sinkUnit.unit);
    }

    // --- wall cabinets -------------------------------------------------------------------
    const wallHeight = (p: Product) => p.dimensions.height;
    const fitsUnderCeiling = (p: Product) => METOD.wallBottom + wallHeight(p) <= room.height - 1;
    let ceilingWarned = false;
    const ceilingOk = (p: Product): boolean => {
        if (fitsUnderCeiling(p)) return true;
        if (!ceilingWarned) {
            warnings.push(`The ceiling (${room.height} cm) is too low for ${wallHeight(p)} cm wall cabinets at the standard height.`);
            ceilingWarned = true;
        }
        return false;
    };

    if (wallCornerLeft && ceilingOk(wallCornerLeft.product)) place(wallCornerLeft, 'back', 'wall', 0, { depth: wallCornerLeft.width, corner: 'left' });
    if (wallCornerRight && ceilingOk(wallCornerRight.product)) place(wallCornerRight, 'back', 'wall', W - wallCornerRight.width, { depth: wallCornerRight.width, corner: 'right' });

    const wallStock = stock.takeAll(['wall']).sort((a, b) => b.width - a.width);
    const wallWidths = catalog.widths('wall');
    const segments: { run: RunId; from: number; to: number; pieces: Piece[]; closedEnd: boolean }[] = [];

    for (const plan of plans.values()) {
        const id = plan.run.id;
        const lowEnd = floorEnd.get(id) ?? plan.run.start;
        let from = plan.wallStart;
        let to = tallStart.get(id) ?? (plan.endsAtWall || id === 'back' ? plan.wallEnd : lowEnd);
        if (id !== 'back' && !plan.endsAtWall) to = Math.min(to, lowEnd);
        to = Math.min(to, plan.wallEnd);
        if (to - from < 20) continue;

        if (cookUnit.unit && cookUnit.unit.run === id && hood) {
            const centre = cookUnit.unit.offset + cookUnit.unit.width / 2;
            const hoodFrom = centre - hood.width / 2;
            place(hood, id, 'wall', hoodFrom, {
                elevation: COUNTER_TOP + METOD.hoodAboveHob,
                height: Math.max(20, room.height - COUNTER_TOP - METOD.hoodAboveHob),
            });
            segments.push({ run: id, from, to: hoodFrom, pieces: [], closedEnd: true });
            from = hoodFrom + hood.width;
        }
        segments.push({ run: id, from, to, pieces: [], closedEnd: tallStart.has(id) || plan.endsAtWall });
    }
    if (hood && !units.some((u) => u.kind === 'hood') && !hood.suggested) {
        stock.giveBack(hood);
    }

    const segFree = (s: (typeof segments)[number]) => s.to - s.from - sum(s.pieces);
    for (const piece of wallStock) {
        if (!ceilingOk(piece.product)) {
            drop(piece, 'ceiling too low');
            continue;
        }
        const target = segments.filter((s) => segFree(s) >= piece.width - 0.01).sort((a, b) => segFree(b) - segFree(a))[0];
        if (!target) {
            drop(piece, 'no wall space left above the worktop');
            continue;
        }
        target.pieces.push(piece);
    }
    for (const segment of segments) {
        if (autofill) {
            const sample = catalog.pick('wall');
            if (sample && ceilingOk(sample)) {
                for (const width of fillWidths(segFree(segment), wallWidths)) {
                    const piece = catalog.piece('wall', width);
                    if (piece) segment.pieces.push(piece);
                }
                const gap = segFree(segment);
                if (gap >= 1 && gap < 20 && segment.closedEnd) {
                    segment.pieces.push({ product: catalog.coverPanel(), width: round(gap), suggested: true, filler: true });
                }
            }
        }
        let offset = segment.from;
        for (const piece of segment.pieces) {
            place(piece, segment.run, 'wall', offset);
            offset += piece.width;
        }
    }

    // --- cover panels on exposed sides ------------------------------------------------
    const cover = (unit: PlacedUnit | undefined, side: 'start' | 'end') => {
        if (unit && !unit.filler && !unit.coverSides?.includes(side)) unit.coverSides = [...(unit.coverSides ?? []), side];
    };
    const onRun = (id: RunId, level: PlacedUnit['level']) =>
        units.filter((u) => u.run === id && u.level === level && !u.corner).sort((a, b) => a.offset - b.offset);
    for (const plan of plans.values()) {
        const id = plan.run.id;
        const floor = onRun(id, 'floor');
        if (!plan.endsAtWall) {
            cover(floor.at(-1), 'end');
            cover(onRun(id, 'wall').filter((u) => u.kind !== 'hood').at(-1), 'end');
        }
        if (plan.startsAtWall === false && plan.startsAtCorner === false) cover(floor[0], 'start');
        const firstTall = floor.findIndex((u) => u.kind === 'tall' || u.kind === 'fridge');
        if (firstTall > 0) cover(floor[firstTall], 'start');
        const lastTall = floor.map((u) => u.kind === 'tall' || u.kind === 'fridge').lastIndexOf(true);
        if (lastTall >= 0 && lastTall < floor.length - 1 && !floor[lastTall + 1].filler) cover(floor[lastTall], 'end');
    }

    // --- worktops -------------------------------------------------------------------------
    const worktops: Worktop[] = [];
    for (const plan of plans.values()) {
        const id = plan.run.id;
        const tallFrom = tallStart.get(id) ?? Infinity;
        const low = units.filter((u) => u.run === id && u.level === 'floor' && u.kind !== 'tall' && u.kind !== 'fridge' && u.offset < tallFrom);
        if (low.length === 0) continue;
        let from = Math.min(...low.map((u) => u.offset));
        const to = Math.max(...low.map((u) => u.offset + u.width));
        // Side runs butt against the back run's worktop.
        if (id === 'left' || id === 'right') from = Math.min(from, METOD.worktopDepth);
        if (id === 'back' && hasLeft && !cornerLeft) from = 0;
        worktops.push({ run: id, offset: round(from), length: round(to - from), depth: METOD.worktopDepth });
    }

    // --- shopping list ----------------------------------------------------------------------
    const lines = new Map<string, ShoppingLine>();
    const add = (product: Product, quantity: number, suggested: boolean, note?: string) => {
        if (quantity <= 0) return;
        const key = `${product.id}|${suggested}`;
        const line = lines.get(key) ?? { product, quantity: 0, suggested, ...(note ? { note } : {}) };
        line.quantity += quantity;
        lines.set(key, line);
    };

    let handles = 0;
    let fillers = 0;
    for (const u of units) {
        if (u.filler) {
            fillers++;
            continue;
        }
        add(u.product, 1, u.suggested);
        handles += handleCount(u);
    }
    for (const item of stock.accessories()) {
        // Accessories the customer linked are on the list whether or not they are drawn.
        const placedAlready = units.filter((u) => u.product.id === item.product.id && !u.suggested).length;
        add(item.product, item.quantity - placedAlready, false);
    }

    const coverPanel = catalog.coverPanel();
    const openEnds = [...plans.values()].filter((p) => p.run.id !== 'back' && !p.endsAtWall && used(p.run.id) > 0).length
        + [...tallStart.keys()].length;
    const panelsNeeded = fillers + openEnds - stock.count('panel');
    add(coverPanel, Math.max(0, panelsNeeded), true, 'Filler strips cut to size and cover panels for exposed sides');

    const worktopLength = inventory.find((i) => i.product.kind === 'worktop')?.product.dimensions.width ?? METOD.worktopLength;
    const worktopPieces = worktops.reduce((n, w) => n + Math.ceil(w.length / worktopLength - 0.001), 0) - stock.count('worktop');
    add(catalog.pick('worktop') ?? customProduct('worktop', 'Worktop 246 cm', 246, 63.5, 3.8), Math.max(0, worktopPieces), true, 'Cut to length on site');

    const plinthRun = units.filter((u) => u.level === 'floor').reduce((n, u) => n + u.width, 0);
    add(catalog.plinth(), Math.ceil(plinthRun / METOD.plinthLength - 0.001), true);

    const handleProduct = catalog.pick('handle');
    if (handleProduct) add(handleProduct, Math.max(0, handles - stock.count('handle')), true, 'One per door and drawer');

    const shopping = [...lines.values()].sort((a, b) => Number(a.suggested) - Number(b.suggested) || kindRank(a.product.kind) - kindRank(b.product.kind));

    // --- leftovers and totals -------------------------------------------------------------
    const unused = stock.unused([...FLOOR_KINDS, ...WALL_KINDS]);
    let amount = 0;
    let missingPrices = 0;
    let hasEstimates = false;
    for (const line of shopping) {
        if (line.product.price) {
            amount += line.product.price.amount * line.quantity;
            hasEstimates ||= line.product.priceIsEstimate;
        } else {
            missingPrices++;
        }
    }
    const currency = shopping.find((l) => l.product.price)?.product.price?.currency ?? 'EUR';

    for (const item of dropped.filter((p) => p.suggested)) {
        warnings.push(`No room for a ${item.product.name.toLowerCase()}.`);
    }
    for (const unit of units.filter((u) => u.level === 'floor' && (u.kind === 'tall' || u.kind === 'fridge'))) {
        if (METOD.plinth + unit.height > room.height) {
            warnings.push(`${unit.product.name} is taller than the room.`);
        }
    }

    return {
        room,
        runs: [...plans.values()].map((p) => p.run),
        units,
        worktops,
        shopping,
        unused,
        warnings: [...new Set(warnings)],
        total: { amount: Math.round(amount * 100) / 100, currency, hasEstimates, missingPrices },
    };
}

function handleCount(u: PlacedUnit): number {
    if (u.filler) return 0;
    switch (u.kind) {
        case 'base':
        case 'sink':
            return u.width >= 60 ? 2 : 1;
        case 'drawers':
            return 3;
        case 'corner':
        case 'oven':
        case 'dishwasher':
        case 'wall_corner':
            return 1;
        case 'tall':
        case 'fridge':
            return 2;
        case 'wall':
            return u.width >= 60 ? 2 : 1;
        default:
            return 0;
    }
}

const RANK: Kind[] = ['sink', 'dishwasher', 'oven', 'hob', 'hood', 'fridge', 'tall', 'corner', 'drawers', 'base', 'wall_corner', 'wall', 'sink_bowl', 'tap', 'worktop', 'front', 'panel', 'handle', 'other'];
function kindRank(kind: Kind): number {
    const i = RANK.indexOf(kind);
    return i < 0 ? RANK.length : i;
}

/** World position (cm) of a unit's footprint centre and the rotation that turns its front to the room. */
export function unitTransform(unit: Pick<PlacedUnit, 'offset' | 'width' | 'depth'>, run: Run): { x: number; z: number; rotation: number } {
    const along = unit.offset + unit.width / 2;
    const out = unit.depth / 2;

    return {
        x: run.origin.x + run.dir.x * along + run.normal.x * out,
        z: run.origin.z + run.dir.z * along + run.normal.z * out,
        rotation: Math.atan2(run.normal.x, run.normal.z),
    };
}
