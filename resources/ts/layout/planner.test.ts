import { describe, expect, it } from 'vitest';
import { fillWidths } from './fill';
import { METOD, planKitchen, unitTransform } from './planner';
import type { InventoryItem, Kind, PlacedUnit, PlanResult, Product, Room } from '../types';

function product(kind: Kind, width: number, depth: number, height: number, price = 100, id?: string): Product {
    return {
        id: id ?? `catalog-${kind}-${width}x${depth}x${height}`,
        name: `${kind} ${width}`,
        kind,
        dimensions: { width, depth, height },
        source: 'catalog',
        articleNumber: null,
        price: { amount: price, currency: 'EUR' },
        priceIsEstimate: true,
        url: null,
        imageUrl: null,
    };
}

const catalog: Product[] = [
    ...[20, 30, 40, 60, 80].map((w) => product('base', w, 60, 80)),
    ...[40, 60, 80].map((w) => product('drawers', w, 60, 80)),
    product('sink', 60, 60, 80), product('sink', 80, 60, 80),
    product('corner', 88, 88, 80),
    product('dishwasher', 60, 57, 80),
    product('oven', 60, 60, 80),
    product('tall', 60, 60, 220), product('fridge', 60, 60, 220),
    ...[20, 30, 40, 60, 80].map((w) => product('wall', w, 37, 80)),
    product('wall_corner', 68, 68, 80),
    product('hood', 60, 50, 60),
    product('hob', 59, 52, 5), product('sink_bowl', 56, 46, 20), product('tap', 20, 20, 35),
    product('worktop', 246, 63.5, 3.8),
    product('panel', 62, 1.3, 80), product('panel', 220, 1.3, 8),
    product('handle', 16, 3, 2, 6),
];

const mine = (kind: Kind, width: number, quantity = 1, depth = 60, height = 80): InventoryItem => ({
    product: { ...product(kind, width, depth, height, 150, `ikea-${kind}-${width}`), source: 'page', priceIsEstimate: false },
    quantity,
});

const room = (shape: Room['shape'], width = 360, depth = 300, height = 250): Room => ({ shape, width, depth, height });

function runLength(plan: PlanResult, run: string): number {
    return run === 'back' || run === 'front' ? plan.room.width : plan.room.depth;
}

/** No two units on the same run and level overlap, and all stay inside the wall. */
function expectNoOverlaps(plan: PlanResult): void {
    const groups = new Map<string, PlacedUnit[]>();
    for (const u of plan.units.filter((u) => u.level !== 'top')) {
        const key = `${u.run}/${u.level}`;
        groups.set(key, [...(groups.get(key) ?? []), u]);
    }
    for (const [key, units] of groups) {
        const sorted = [...units].sort((a, b) => a.offset - b.offset);
        for (let i = 0; i < sorted.length; i++) {
            const u = sorted[i];
            expect(u.offset, `${key} ${u.product.name} starts inside the wall`).toBeGreaterThanOrEqual(-0.01);
            expect(u.offset + u.width, `${key} ${u.product.name} ends inside the wall`).toBeLessThanOrEqual(runLength(plan, u.run) + 0.01);
            if (i > 0) {
                const prev = sorted[i - 1];
                expect(u.offset, `${key}: ${prev.product.name} overlaps ${u.product.name}`).toBeGreaterThanOrEqual(prev.offset + prev.width - 0.01);
            }
        }
    }
}

const floorWidth = (plan: PlanResult, run: string) =>
    plan.units.filter((u) => u.run === run && u.level === 'floor').reduce((n, u) => n + u.width, 0);
const kinds = (plan: PlanResult, level = 'floor') => plan.units.filter((u) => u.level === level).map((u) => u.kind);

describe('fillWidths', () => {
    it('fills a gap exactly with as few, wide cabinets as possible', () => {
        const widths = fillWidths(180, [20, 30, 40, 60, 80]);
        expect(widths.reduce((a, b) => a + b, 0)).toBe(180);
        expect(widths).toHaveLength(3);
        expect(widths.every((w) => w >= 40)).toBe(true);
    });

    it('leaves the unfillable rest', () => {
        expect(fillWidths(45, [20, 30, 40, 60, 80])).toEqual([40]);
        expect(fillWidths(15, [20, 30])).toEqual([]);
    });
});

describe('planKitchen', () => {
    it('completes a straight kitchen from the catalog alone', () => {
        const plan = planKitchen(room('I'), [], { catalog, autofill: true });

        expectNoOverlaps(plan);
        expect(floorWidth(plan, 'back')).toBeCloseTo(360, 1);
        for (const kind of ['sink', 'dishwasher', 'oven', 'fridge'] as Kind[]) expect(kinds(plan)).toContain(kind);
        expect(kinds(plan, 'top')).toEqual(expect.arrayContaining(['hob', 'sink_bowl', 'tap']));
        expect(kinds(plan, 'wall')).toContain('hood');
        expect(plan.units.every((u) => u.suggested)).toBe(true);
        expect(plan.worktops).toHaveLength(1);
        expect(plan.total.amount).toBeGreaterThan(0);
        expect(plan.total.hasEstimates).toBe(true);
    });

    it('keeps the fridge against the wall, the dishwasher next to the sink, and a cabinet between sink and hob', () => {
        const plan = planKitchen(room('I', 400), [], { catalog, autofill: true });
        const back = plan.units.filter((u) => u.run === 'back' && u.level === 'floor').sort((a, b) => a.offset - b.offset);
        const at = (kind: Kind) => back.findIndex((u) => u.kind === kind);

        expect(at('dishwasher')).toBe(at('sink') + 1);
        expect(at('oven') - at('dishwasher')).toBeGreaterThan(1);
        const fridge = back[at('fridge')];
        expect(fridge.offset + fridge.width).toBeGreaterThan(400 - 20);
    });

    it("uses the customer's products first and marks them as not suggested", () => {
        const plan = planKitchen(room('I'), [mine('base', 40, 2), mine('sink', 80), mine('wall', 60, 2, 37, 80)], { catalog, autofill: true });

        expectNoOverlaps(plan);
        const own = plan.units.filter((u) => !u.suggested);
        expect(own.filter((u) => u.kind === 'base')).toHaveLength(2);
        expect(own.filter((u) => u.kind === 'sink')).toHaveLength(1);
        expect(own.filter((u) => u.kind === 'wall')).toHaveLength(2);
        expect(plan.units.filter((u) => u.kind === 'sink')).toHaveLength(1);
        expect(plan.unused).toEqual([]);
        expect(plan.shopping.find((l) => l.product.id === 'ikea-base-40')?.quantity).toBe(2);
    });

    it('plans an L-shape with a corner cabinet and the hob on the side wall', () => {
        const plan = planKitchen({ ...room('L', 320, 300), leftRunLength: 220 }, [], { catalog, autofill: true });

        expectNoOverlaps(plan);
        const corner = plan.units.find((u) => u.kind === 'corner');
        expect(corner).toMatchObject({ run: 'back', offset: 0, corner: 'left' });
        expect(plan.units.find((u) => u.kind === 'oven')?.run).toBe('left');
        expect(plan.units.find((u) => u.kind === 'sink')?.run).toBe('back');
        expect(plan.worktops.map((w) => w.run).sort()).toEqual(['back', 'left']);
        const left = plan.units.filter((u) => u.run === 'left' && u.level === 'floor');
        expect(Math.min(...left.map((u) => u.offset))).toBe(METOD.cornerBase);
        expect(Math.max(...left.map((u) => u.offset + u.width))).toBeLessThanOrEqual(220);
    });

    it('puts the tall units at the open end of the right run in a U-shape', () => {
        const plan = planKitchen(room('U', 380, 320), [mine('tall', 60)], { catalog, autofill: true });

        expectNoOverlaps(plan);
        const talls = plan.units.filter((u) => u.kind === 'tall' || u.kind === 'fridge');
        expect(talls.length).toBeGreaterThanOrEqual(2);
        expect(talls.every((u) => u.run === 'right')).toBe(true);
        expect(plan.units.filter((u) => u.kind === 'corner')).toHaveLength(2);
    });

    it('plans a galley with the cooking on the opposite wall', () => {
        const plan = planKitchen(room('galley', 300, 300), [], { catalog, autofill: true });

        expectNoOverlaps(plan);
        expect(plan.units.find((u) => u.kind === 'oven')?.run).toBe('front');
        expect(plan.units.find((u) => u.kind === 'sink')?.run).toBe('back');
    });

    it('drops what does not fit in a tiny room and says so', () => {
        const plan = planKitchen(room('I', 150), [mine('tall', 60, 2), mine('base', 80, 2)], { catalog, autofill: true });

        expectNoOverlaps(plan);
        expect(plan.warnings.length).toBeGreaterThan(0);
        expect(plan.unused.length).toBeGreaterThan(0);
        expect(floorWidth(plan, 'back')).toBeLessThanOrEqual(150);
    });

    it('without auto-fill only places what the customer brought', () => {
        const plan = planKitchen(room('I'), [mine('base', 60, 2), mine('dishwasher', 60, 1, 57)], { catalog, autofill: false });

        expectNoOverlaps(plan);
        const cabinets = plan.units.filter((u) => u.level !== 'top');
        expect(cabinets.every((u) => !u.suggested)).toBe(true);
        expect(cabinets).toHaveLength(3);
        expect(plan.warnings.some((w) => w.includes('left empty'))).toBe(true);
        // Worktop, plinth and handles are still needed.
        expect(plan.shopping.some((l) => l.suggested && l.product.kind === 'worktop')).toBe(true);
    });

    it('skips wall cabinets under a low ceiling', () => {
        const plan = planKitchen(room('I', 300, 300, 215), [], { catalog, autofill: true });

        expect(plan.units.filter((u) => u.kind === 'wall')).toHaveLength(0);
        expect(plan.warnings.some((w) => w.includes('ceiling'))).toBe(true);
    });

    it('puts a hob on its own drawer unit when there is no oven', () => {
        const plan = planKitchen(room('I'), [mine('hob', 59, 1, 52, 5)], { catalog, autofill: false });
        const hob = plan.units.find((u) => u.kind === 'hob');
        const host = plan.units.find((u) => u.uid === hob?.hostUid);

        expect(host?.kind).toBe('drawers');
        expect(host?.suggested).toBe(true);
    });

    it('turns the fronts of side runs into the room', () => {
        const plan = planKitchen(room('U', 380, 320), [], { catalog, autofill: true });
        const runs = Object.fromEntries(plan.runs.map((r) => [r.id, r]));

        const left = unitTransform({ offset: 100, width: 60, depth: 60 }, runs.left);
        expect(left).toMatchObject({ x: 30, z: 130 });
        expect(left.rotation).toBeCloseTo(Math.PI / 2);

        const right = unitTransform({ offset: 100, width: 60, depth: 60 }, runs.right);
        expect(right).toMatchObject({ x: 350, z: 130 });
        expect(right.rotation).toBeCloseTo(-Math.PI / 2);
    });
});

describe('cover panels', () => {
    it('marks the open end of a side run and the side of a high cabinet next to the worktop', () => {
        const plan = planKitchen(room('L', 360, 300), [], { catalog, autofill: true });
        const left = plan.units.filter((u) => u.run === 'left' && u.level === 'floor').sort((a, b) => a.offset - b.offset);
        expect(left.at(-1)?.coverSides).toContain('end');
        const fridge = plan.units.find((u) => u.kind === 'fridge');
        expect(fridge?.coverSides).toContain('start');
    });
});
