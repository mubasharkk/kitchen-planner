import { api } from './api';
import { planKitchen } from './layout/planner';
import { catalogForSeries } from './layout/series';
import { KitchenScene, type View } from './scene/KitchenScene';
import { type Catalog, type InventoryItem, KIND_LABELS, type Kind, type PlacedUnit, type PlanResult, type Product, type Room, type Series, SERIES_LABELS, type Shape } from './types';

interface State {
    name: string;
    planId: string | null;
    room: Room;
    items: InventoryItem[];
    autofill: boolean;
    series: Series;
    front: string;
    worktop: string;
    handle: string;
    floor: string;
}

const STORAGE_KEY = 'kitchen-planner:last';
const EDITABLE_KINDS: Kind[] = ['base', 'drawers', 'sink', 'corner', 'dishwasher', 'oven', 'tall', 'fridge', 'wall', 'wall_corner', 'hood', 'hob', 'sink_bowl', 'tap', 'worktop', 'front', 'handle', 'panel', 'other'];

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`#${id} missing`);
    return el as T;
};

const escape = (text: string): string =>
    text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const safeUrl = (url: string | null): string | null => (url && /^https:\/\//.test(url) ? url : null);

let catalog: Catalog;
let scene: KitchenScene;
let plan: PlanResult;
let money: Intl.NumberFormat;
let selectedUnit: PlacedUnit | null = null;

const state: State = {
    name: 'My kitchen',
    planId: null,
    room: { width: 360, depth: 300, height: 250, shape: 'L', leftRunLength: null, rightRunLength: null },
    items: [],
    autofill: false,
    series: 'metod',
    front: 'white',
    worktop: 'oak',
    handle: 'steel',
    floor: 'natural',
};

// --- startup ------------------------------------------------------------------

async function start(): Promise<void> {
    const root = $('app');
    scene = new KitchenScene($('scene'));
    scene.onHover = showTooltip;
    scene.onSelect = (unit) => { selectedUnit = unit; };
    document.addEventListener('keydown', onKeyDown);

    try {
        catalog = await api.catalog();
    } catch (e) {
        toast(`Could not load the catalog: ${(e as Error).message}`, 8000);
        return;
    }
    money = new Intl.NumberFormat(undefined, { style: 'currency', currency: catalog.currency });

    const planId = root.dataset.planId;
    if (planId) {
        try {
            const saved = await api.loadPlan(planId);
            Object.assign(state, {
                planId: saved.id,
                name: saved.name,
                room: saved.room,
                items: saved.items,
                ...pickSettings(saved.settings),
            });
        } catch (e) {
            toast(`Could not load that plan: ${(e as Error).message}`, 6000);
        }
    } else {
        restoreLocal();
    }

    buildStaticControls();
    buildStandardItems();
    bindEvents();
    syncControls();
    render({ resetCamera: true });
}

function pickSettings(settings: Record<string, unknown>): Partial<State> {
    const out: Partial<State> = {};
    if (typeof settings.autofill === 'boolean') out.autofill = settings.autofill;
    if (typeof settings.series === 'string' && settings.series in SERIES_LABELS) out.series = settings.series as Series;
    for (const key of ['front', 'worktop', 'handle', 'floor'] as const) {
        if (typeof settings[key] === 'string') out[key] = settings[key] as string;
    }
    return out;
}

function restoreLocal(): void {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<State>;
        if (saved.room && Array.isArray(saved.items)) Object.assign(state, saved, { planId: null });
    } catch {
        // Private mode or corrupted data: start fresh.
    }
}

function saveLocal(): void {
    try {
        const { planId: _ignored, ...rest } = state;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    } catch {
        // Storage unavailable; the plan still works for this visit.
    }
}

// --- controls -------------------------------------------------------------------

function buildStaticControls(): void {
    $('fronts').innerHTML = catalog.finishes.fronts
        .map((f) => `<button type="button" data-front="${escape(f.id)}" title="${escape(f.name)}" aria-label="${escape(f.name)}" style="background:${escape(f.color)}"></button>`)
        .join('');
    $('worktop').innerHTML = catalog.finishes.worktops.map((f) => `<option value="${escape(f.id)}">${escape(f.name)}</option>`).join('');
    $('handles').innerHTML = catalog.finishes.handles.map((f) => `<option value="${escape(f.id)}">${escape(f.name)}</option>`).join('');
    $('floor').innerHTML = catalog.finishes.floors.map((f) => `<option value="${escape(f.id)}">${escape(f.name)}</option>`).join('');
}

/** Standard items in the kitchen series the customer picked. */
function seriesCatalog(): Product[] {
    return catalogForSeries(catalog.items, state.series);
}

function buildStandardItems(): void {
    const groups = new Map<Kind, Product[]>();
    for (const p of seriesCatalog()) groups.set(p.kind, [...(groups.get(p.kind) ?? []), p]);
    $('add-standard').innerHTML = '<option value="">+ Standard item…</option>'
        + [...groups].map(([kind, products]) => `<optgroup label="${escape(KIND_LABELS[kind])}">${products
            .map((p) => `<option value="${escape(p.id)}">${escape(p.name)}</option>`).join('')}</optgroup>`).join('');
}

function syncControls(): void {
    $<HTMLInputElement>('room-width').value = String(state.room.width);
    $<HTMLInputElement>('room-depth').value = String(state.room.depth);
    $<HTMLInputElement>('room-height').value = String(state.room.height);
    $<HTMLInputElement>('left-run').value = state.room.leftRunLength ? String(state.room.leftRunLength) : '';
    $<HTMLInputElement>('right-run').value = state.room.rightRunLength ? String(state.room.rightRunLength) : '';
    $<HTMLInputElement>('autofill').checked = state.autofill;
    $<HTMLSelectElement>('worktop').value = state.worktop;
    $<HTMLSelectElement>('handles').value = state.handle;
    $<HTMLSelectElement>('floor').value = state.floor;
    $<HTMLInputElement>('plan-name').value = state.name;
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-shape]')) {
        b.setAttribute('aria-checked', String(b.dataset.shape === state.room.shape));
    }
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-front]')) {
        b.setAttribute('aria-pressed', String(b.dataset.front === state.front));
    }
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-series]')) {
        b.setAttribute('aria-checked', String(b.dataset.series === state.series));
    }
    const shape = state.room.shape;
    $('side-runs').hidden = shape === 'I' || shape === 'galley';
    $('side-hint').hidden = shape === 'I' || shape === 'galley';
    $('right-run-field').hidden = shape !== 'U';
    if (state.planId) showShare(state.planId);
}

function bindEvents(): void {
    const number = (id: string, apply: (n: number | null) => void) => {
        $<HTMLInputElement>(id).addEventListener('change', (e) => {
            const input = e.target as HTMLInputElement;
            const value = input.value.trim() === '' ? null : Number(input.value);
            apply(value !== null && Number.isFinite(value) ? value : null);
            render();
        });
    };
    const clamp = (n: number | null, min: number, max: number, fallback: number) => (n === null ? fallback : Math.min(max, Math.max(min, n)));
    number('room-width', (n) => { state.room.width = clamp(n, 120, 2000, state.room.width); });
    number('room-depth', (n) => { state.room.depth = clamp(n, 120, 2000, state.room.depth); });
    number('room-height', (n) => { state.room.height = clamp(n, 200, 500, state.room.height); });
    number('left-run', (n) => { state.room.leftRunLength = n === null ? null : clamp(n, 0, state.room.depth, 0); });
    number('right-run', (n) => { state.room.rightRunLength = n === null ? null : clamp(n, 0, state.room.depth, 0); });

    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-shape]')) {
        b.addEventListener('click', () => {
            state.room.shape = b.dataset.shape as Shape;
            render({ resetCamera: true });
        });
    }
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-series]')) {
        b.addEventListener('click', () => {
            state.series = b.dataset.series as Series;
            buildStandardItems();
            render();
        });
    }
    $('fronts').addEventListener('click', (e) => {
        const button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-front]');
        if (!button) return;
        state.front = button.dataset.front as string;
        render();
    });
    $('worktop').addEventListener('change', (e) => { state.worktop = (e.target as HTMLSelectElement).value; render(); });
    $('handles').addEventListener('change', (e) => { state.handle = (e.target as HTMLSelectElement).value; render(); });
    $('floor').addEventListener('change', (e) => { state.floor = (e.target as HTMLSelectElement).value; render(); });
    $('autofill').addEventListener('change', (e) => { state.autofill = (e.target as HTMLInputElement).checked; render(); });
    $('plan-name').addEventListener('change', (e) => { state.name = (e.target as HTMLInputElement).value.trim() || 'My kitchen'; saveLocal(); });

    $('add-links').addEventListener('click', addLinks);
    $<HTMLTextAreaElement>('links').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addLinks();
    });
    $('add-standard').addEventListener('change', (e) => {
        const select = e.target as HTMLSelectElement;
        const product = seriesCatalog().find((p) => p.id === select.value);
        select.value = '';
        if (product) addProducts([product]);
    });

    $('items').addEventListener('click', onItemClick);
    $('items').addEventListener('change', onItemChange);

    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) {
        b.addEventListener('click', () => {
            document.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('active', x === b));
            scene.setView(b.dataset.view as View);
        });
    }

    $('shopping').addEventListener('mouseover', (e) => {
        const row = (e.target as HTMLElement).closest<HTMLElement>('[data-product]');
        const unit = row ? plan.units.find((u) => u.product.id === row.dataset.product && String(u.suggested) === row.dataset.suggested) : undefined;
        scene.focusUnit(unit?.uid ?? null);
    });
    $('shopping').addEventListener('mouseleave', () => scene.focusUnit(null));

    $('export-csv').addEventListener('click', exportCsv);
    $('export-png').addEventListener('click', () => download(`${slug(state.name)}.png`, scene.snapshot()));
    $('save').addEventListener('click', savePlan);
    $('copy-link').addEventListener('click', async () => {
        const url = $<HTMLInputElement>('share-url').value;
        try {
            await navigator.clipboard.writeText(url);
            toast('Link copied');
        } catch {
            $<HTMLInputElement>('share-url').select();
        }
    });
}

// --- products ---------------------------------------------------------------------

async function addLinks(): Promise<void> {
    const textarea = $<HTMLTextAreaElement>('links');
    const urls = textarea.value.split(/[\s,]+/).map((u) => u.trim()).filter(Boolean);
    if (urls.length === 0) {
        toast('Paste one or more IKEA product links first');
        return;
    }
    const button = $<HTMLButtonElement>('add-links');
    button.disabled = true;
    button.textContent = 'Reading IKEA…';
    try {
        const result = await api.resolve(urls.slice(0, 40));
        addProducts(result.products);
        const errors = $('link-errors');
        errors.hidden = result.errors.length === 0;
        errors.innerHTML = result.errors.map((e) => `<p>${escape(e.message)}</p>`).join('');
        textarea.value = result.errors.map((e) => e.url).join('\n');
        const estimated = result.products.filter((p) => p.source === 'link').length;
        if (estimated) toast(`${estimated} product${estimated > 1 ? 's' : ''} read from the link only — check the width`, 5000);
    } catch (e) {
        toast((e as Error).message, 6000);
    } finally {
        button.disabled = false;
        button.textContent = 'Add products';
    }
}

function addProducts(products: Product[]): void {
    for (const product of products) {
        const existing = state.items.find((i) => i.product.id === product.id);
        if (existing) existing.quantity = Math.min(50, existing.quantity + 1);
        else state.items.push({ product, quantity: 1 });
    }
    render();
}

function onItemClick(e: Event): void {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    const index = Number(button?.closest<HTMLElement>('[data-index]')?.dataset.index);
    if (!button || Number.isNaN(index)) return;
    const item = state.items[index];
    if (button.dataset.action === 'inc') item.quantity = Math.min(50, item.quantity + 1);
    if (button.dataset.action === 'dec') item.quantity = Math.max(1, item.quantity - 1);
    if (button.dataset.action === 'remove') state.items.splice(index, 1);
    render();
}

function onItemChange(e: Event): void {
    const field = e.target as HTMLInputElement | HTMLSelectElement;
    const index = Number(field.closest<HTMLElement>('[data-index]')?.dataset.index);
    if (Number.isNaN(index)) return;
    const product = { ...state.items[index].product, dimensions: { ...state.items[index].product.dimensions } };
    if (field.dataset.field === 'kind') product.kind = field.value as Kind;
    if (field.dataset.field === 'width') {
        const width = Number(field.value);
        if (Number.isFinite(width) && width >= 5 && width <= 400) product.dimensions.width = width;
    }
    state.items[index] = { ...state.items[index], product };
    render();
}

function onKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    const target = e.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    if (!selectedUnit) return;
    e.preventDefault();
    removeSelectedUnit();
}

function removeSelectedUnit(): void {
    const unit = selectedUnit;
    if (!unit) return;
    if (unit.filler) {
        toast("Filler strips are sized automatically and can't be removed directly.");
        return;
    }
    const index = state.items.findIndex((i) => i.product.id === unit.product.id);
    if (index === -1) {
        toast(unit.suggested
            ? 'This is a suggested item — add it to your list, or turn off auto-fill, to remove it.'
            : "Couldn't find that item in your list.");
        return;
    }
    state.items.splice(index, 1);
    selectedUnit = null;
    scene.clearSelection();
    render();
}

function renderItems(): void {
    $('items-empty').hidden = state.items.length > 0;
    const sourceBadge = (p: Product) => ({
        page: '<span class="badge page" title="Read from the IKEA product page">from IKEA</span>',
        link: '<span class="badge link" title="IKEA could not be read; size guessed from the link — check it">estimated</span>',
        catalog: '<span class="badge" title="Standard item with an estimated price">standard</span>',
        custom: '<span class="badge">custom</span>',
    })[p.source];

    $('items').innerHTML = state.items.map((item, i) => {
        const p = item.product;
        const url = safeUrl(p.url);
        const image = safeUrl(p.imageUrl);
        const name = url ? `<a href="${escape(url)}" target="_blank" rel="noopener">${escape(p.name)}</a>` : escape(p.name);
        const price = p.price ? `${money.format(p.price.amount)}${p.priceIsEstimate ? ' est.' : ''}` : 'price n/a';

        return `<li class="item" data-index="${i}">
            <div class="thumb" ${image ? `style="background-image:url('${escape(image)}')"` : ''}>${image ? '' : escape(KIND_LABELS[p.kind].split(' ')[0])}</div>
            <div>
                <div class="name" title="${escape(p.name)}">${name}</div>
                <div class="meta">
                    <select data-field="kind" aria-label="Type">${EDITABLE_KINDS.map((k) => `<option value="${k}" ${k === p.kind ? 'selected' : ''}>${escape(KIND_LABELS[k])}</option>`).join('')}</select>
                    <input type="number" data-field="width" value="${p.dimensions.width}" min="5" max="400" step="0.5" aria-label="Width in cm" title="Width (cm)">
                    <span class="qty"><button type="button" data-action="dec" aria-label="One less">−</button><span>${item.quantity}</span><button type="button" data-action="inc" aria-label="One more">+</button></span>
                    <button type="button" class="remove" data-action="remove" aria-label="Remove">✕</button>
                </div>
                <div class="meta">${sourceBadge(p)} <span class="badge">${escape(price)}</span> ${p.articleNumber ? `<span class="badge">${escape(p.articleNumber)}</span>` : ''}</div>
            </div>
        </li>`;
    }).join('');
}

// --- plan & output -------------------------------------------------------------------

function finishColor(list: { id: string; color: string }[], id: string): string {
    return (list.find((f) => f.id === id) ?? list[0])?.color ?? '#ffffff';
}

function render(options: { resetCamera?: boolean } = {}): void {
    plan = planKitchen(state.room, state.items, { catalog: seriesCatalog(), autofill: state.autofill });
    scene.update(plan, {
        front: finishColor(catalog.finishes.fronts, state.front),
        worktop: finishColor(catalog.finishes.worktops, state.worktop),
        handle: finishColor(catalog.finishes.handles, state.handle),
        floor: finishColor(catalog.finishes.floors, state.floor),
    }, !options.resetCamera);
    syncControls();
    renderItems();
    renderWarnings();
    renderShopping();
    renderSummary();
    saveLocal();
}

function renderWarnings(): void {
    const messages = [
        ...plan.warnings,
        ...plan.unused.map((u) => `Not used: ${u.quantity} × ${u.product.name}`),
    ];
    $('warnings-panel').hidden = messages.length === 0;
    $('warnings').innerHTML = messages.map((m) => `<li>${escape(m)}</li>`).join('');
}

function renderShopping(): void {
    const row = (line: PlanResult['shopping'][number]) => {
        const p = line.product;
        const url = safeUrl(p.url);
        const name = url ? `<a href="${escape(url)}" target="_blank" rel="noopener">${escape(p.name)}</a>` : escape(p.name);
        const sub = [p.articleNumber, line.note].filter(Boolean).map((s) => escape(s as string)).join(' · ');
        const price = p.price ? `${p.priceIsEstimate ? '≈ ' : ''}${money.format(p.price.amount * line.quantity)}` : '—';

        return `<tr data-product="${escape(p.id)}" data-suggested="${line.suggested}"><td>${line.quantity}×</td><td>${name}${sub ? `<span class="sub">${sub}</span>` : ''}</td><td class="num">${price}</td></tr>`;
    };
    const own = plan.shopping.filter((l) => !l.suggested);
    const suggested = plan.shopping.filter((l) => l.suggested);
    $('shopping').innerHTML = [
        own.length ? `<tr class="group"><td colspan="3">Your products</td></tr>${own.map(row).join('')}` : '',
        suggested.length ? `<tr class="group"><td colspan="3">Suggested to complete the kitchen</td></tr>${suggested.map(row).join('')}` : '',
    ].join('');
    $('total').textContent = `${plan.total.hasEstimates ? '≈ ' : ''}${money.format(plan.total.amount)}`;
    const notes: string[] = [];
    if (plan.total.hasEstimates) notes.push('Standard items use estimated prices — the links search IKEA for the current ones.');
    if (plan.total.missingPrices) notes.push(`${plan.total.missingPrices} item${plan.total.missingPrices > 1 ? 's have' : ' has'} no price and ${plan.total.missingPrices > 1 ? 'are' : 'is'} not in the total.`);
    $('total-note').textContent = notes.join(' ');
}

function renderSummary(): void {
    const cabinets = plan.units.filter((u) => (u.level === 'floor' || u.level === 'wall') && !u.filler && u.kind !== 'hood').length;
    const worktop = plan.worktops.reduce((n, w) => n + w.length, 0);
    $('summary').innerHTML = [
        `<span>Room <b>${plan.room.width} × ${plan.room.depth} cm</b></span>`,
        `<span><b>${cabinets}</b> cabinets</span>`,
        `<span><b>${(worktop / 100).toFixed(2)} m</b> worktop</span>`,
        `<span>Total <b>${plan.total.hasEstimates ? '≈ ' : ''}${money.format(plan.total.amount)}</b></span>`,
    ].join('');
}

function showTooltip(unit: PlacedUnit | null, x: number, y: number): void {
    const tip = $('tooltip');
    if (!unit) {
        tip.hidden = true;
        return;
    }
    const size = unit.filler ? `${unit.width} cm filler` : `${unit.product.dimensions.width} × ${unit.product.dimensions.depth} × ${unit.product.dimensions.height} cm`;
    const price = unit.product.price && !unit.filler ? ` · ${unit.product.priceIsEstimate ? '≈ ' : ''}${money.format(unit.product.price.amount)}` : '';
    const hint = unit.filler ? '' : unit.suggested ? ' · click to select' : ' · click to select, Backspace to remove';
    tip.innerHTML = `<strong>${escape(unit.filler ? 'Filler strip' : unit.product.name)}</strong><span>${escape(size + price)}</span><br><span>${(unit.suggested ? 'Suggested by the planner' : 'Your product') + hint}</span>`;
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
    tip.hidden = false;
}

async function savePlan(): Promise<void> {
    const button = $<HTMLButtonElement>('save');
    button.disabled = true;
    try {
        const saved = await api.savePlan(state.planId, {
            name: state.name,
            room: state.room,
            items: state.items,
            settings: { autofill: state.autofill, series: state.series, front: state.front, worktop: state.worktop, handle: state.handle, floor: state.floor },
        });
        state.planId = saved.id;
        history.replaceState(null, '', `/plans/${saved.id}`);
        showShare(saved.id);
        toast('Plan saved');
    } catch (e) {
        toast(`Could not save: ${(e as Error).message}`, 6000);
    } finally {
        button.disabled = false;
    }
}

function showShare(id: string): void {
    $('share').hidden = false;
    $<HTMLInputElement>('share-url').value = `${location.origin}/plans/${id}`;
}

function exportCsv(): void {
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows: (string | number)[][] = [['Quantity', 'Item', 'Article number', 'Unit price', 'Line total', 'Price is estimate', 'Source', 'Link']];
    for (const line of plan.shopping) {
        const p = line.product;
        rows.push([
            line.quantity, p.name, p.articleNumber ?? '',
            p.price ? p.price.amount.toFixed(2) : '', p.price ? (p.price.amount * line.quantity).toFixed(2) : '',
            p.priceIsEstimate ? 'yes' : 'no', line.suggested ? 'suggested' : 'your product', p.url ?? '',
        ]);
    }
    rows.push(['', 'Total', '', '', plan.total.amount.toFixed(2), plan.total.hasEstimates ? 'partly' : 'no', '', '']);
    const csv = rows.map((r) => r.map(cell).join(',')).join('\n');
    download(`${slug(state.name)}-shopping-list.csv`, `data:text/csv;charset=utf-8,${encodeURIComponent('﻿' + csv)}`);
}

function download(filename: string, href: string): void {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.click();
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'kitchen';

let toastTimer = 0;
function toast(message: string, ms = 2500): void {
    const el = $('toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { el.hidden = true; }, ms);
}

start();
