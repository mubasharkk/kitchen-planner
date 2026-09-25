/** Shapes shared by the API client, the layout engine and the scene. All sizes in cm. */

export type Kind =
    | 'base' | 'drawers' | 'sink' | 'corner' | 'dishwasher' | 'oven' | 'tall' | 'fridge'
    | 'wall' | 'wall_corner' | 'hood'
    | 'hob' | 'sink_bowl' | 'tap' | 'worktop' | 'front' | 'handle' | 'panel' | 'other';

export const KIND_LABELS: Record<Kind, string> = {
    base: 'Base cabinet',
    drawers: 'Base cabinet with drawers',
    sink: 'Sink base cabinet',
    corner: 'Corner base cabinet',
    dishwasher: 'Dishwasher',
    oven: 'Oven / oven cabinet',
    tall: 'High cabinet',
    fridge: 'Fridge / freezer',
    wall: 'Wall cabinet',
    wall_corner: 'Corner wall cabinet',
    hood: 'Extractor hood',
    hob: 'Hob',
    sink_bowl: 'Sink',
    tap: 'Kitchen tap',
    worktop: 'Worktop',
    front: 'Door / drawer front',
    handle: 'Handle / knob',
    panel: 'Cover panel / plinth',
    other: 'Other',
};

/** The IKEA kitchen system a standard item belongs to. */
export type Series = 'metod' | 'knoxhult';

export const SERIES_LABELS: Record<Series, string> = {
    metod: 'METOD',
    knoxhult: 'KNOXHULT',
};

export interface Dimensions {
    width: number;
    depth: number;
    height: number;
}

export interface Price {
    amount: number;
    currency: string;
}

export interface Product {
    id: string;
    name: string;
    kind: Kind;
    dimensions: Dimensions;
    source: 'page' | 'link' | 'catalog' | 'custom';
    articleNumber: string | null;
    price: Price | null;
    priceIsEstimate: boolean;
    url: string | null;
    imageUrl: string | null;
    /** Set on standard catalog cabinets; null for shared items and linked products. */
    series?: Series | null;
}

export interface InventoryItem {
    product: Product;
    quantity: number;
}

export type Shape = 'I' | 'L' | 'U' | 'galley';

export interface Room {
    width: number;
    depth: number;
    height: number;
    shape: Shape;
    leftRunLength?: number | null;
    rightRunLength?: number | null;
}

export type RunId = 'back' | 'left' | 'right' | 'front';

export interface Run {
    id: RunId;
    /** Where offset 0 of the run is, on the floor (x, z). */
    origin: { x: number; z: number };
    /** Direction the run extends in. */
    dir: { x: number; z: number };
    /** Direction the cabinet fronts face (into the room). */
    normal: { x: number; z: number };
    /** First and last usable offset for floor units. */
    start: number;
    end: number;
}

export type Level = 'floor' | 'wall' | 'top';

export interface PlacedUnit {
    uid: string;
    product: Product;
    kind: Kind;
    run: RunId;
    level: Level;
    /** Offset along the run where the unit begins. */
    offset: number;
    width: number;
    depth: number;
    height: number;
    /** Height of the unit's underside above the floor. */
    elevation: number;
    /** True when the planner picked it from the catalog rather than the customer's links. */
    suggested: boolean;
    /** Which side the L of a corner unit opens to. */
    corner?: 'left' | 'right';
    /** For hob / sink bowl / tap: the unit it sits on. */
    hostUid?: string;
    /** Filler strips are cut to size, so they are not real catalog widths. */
    filler?: boolean;
    /** Sides left open (end of a run, next to a high cabinet) that get a cover panel. */
    coverSides?: ('start' | 'end')[];
}

export interface Worktop {
    run: RunId;
    offset: number;
    length: number;
    depth: number;
}

export interface ShoppingLine {
    product: Product;
    quantity: number;
    suggested: boolean;
    note?: string;
}

export interface PlanResult {
    room: Room;
    runs: Run[];
    units: PlacedUnit[];
    worktops: Worktop[];
    shopping: ShoppingLine[];
    unused: InventoryItem[];
    warnings: string[];
    total: { amount: number; currency: string; hasEstimates: boolean; missingPrices: number };
}

export interface Finish {
    id: string;
    name: string;
    color: string;
}

export interface Catalog {
    market: string;
    currency: string;
    items: Product[];
    finishes: { fronts: Finish[]; worktops: Finish[]; handles: Finish[]; floors: Finish[] };
}

export interface ResolveResult {
    products: Product[];
    errors: { url: string; message: string }[];
}
