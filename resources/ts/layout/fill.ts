/**
 * Pick cabinet widths that fill a gap as completely as possible.
 *
 * Unbounded knapsack over whole centimetres: maximise the filled length,
 * then use as few cabinets as possible, then avoid the narrow 20/30 cm
 * units, which are awkward to use. Returns widths, widest first.
 */
export function fillWidths(free: number, widths: number[]): number[] {
    const gap = Math.floor(free + 1e-6);
    const options = [...new Set(widths.map((w) => Math.round(w)))].filter((w) => w > 0).sort((a, b) => b - a);
    if (gap <= 0 || options.length === 0) return [];

    // score[f] for exactly filling f cm; null = impossible
    const count: (number | null)[] = new Array(gap + 1).fill(null);
    const narrow: number[] = new Array(gap + 1).fill(0);
    const choice: number[] = new Array(gap + 1).fill(0);
    count[0] = 0;

    for (let f = 1; f <= gap; f++) {
        for (const w of options) {
            const prev = f - w;
            if (prev < 0 || count[prev] === null) continue;
            const c = (count[prev] as number) + 1;
            const n = narrow[prev] + (w < 40 ? 1 : 0);
            const current = count[f];
            if (current === null || c < current || (c === current && n < narrow[f])) {
                count[f] = c;
                narrow[f] = n;
                choice[f] = w;
            }
        }
    }

    let best = gap;
    while (best > 0 && count[best] === null) best--;

    const result: number[] = [];
    for (let f = best; f > 0; f -= choice[f]) result.push(choice[f]);

    return result.sort((a, b) => b - a);
}
