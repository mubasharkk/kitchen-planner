import type { Product, Series } from '../types';

/**
 * The catalog items a kitchen in the given series may use: that series'
 * cabinets plus the shared items (appliances, worktops, handles…). Where
 * the series has nothing of a kind — KNOXHULT has no sink or oven cabinet —
 * the other series' items stand in, so the kitchen can still be completed.
 */
export function catalogForSeries(items: Product[], series: Series): Product[] {
    const offered = new Set(items.filter((p) => p.series === series).map((p) => p.kind));

    return items.filter((p) => !p.series || p.series === series || !offered.has(p.kind));
}
