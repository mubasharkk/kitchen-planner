import { describe, expect, it } from 'vitest';
import { catalogForSeries } from './series';
import type { Kind, Product, Series } from '../types';

function product(kind: Kind, series: Series | null): Product {
    return {
        id: `catalog-${kind}-${series ?? 'shared'}`,
        name: `${series ?? 'shared'} ${kind}`,
        kind,
        dimensions: { width: 60, depth: 60, height: 80 },
        source: 'catalog',
        articleNumber: null,
        price: null,
        priceIsEstimate: true,
        url: null,
        imageUrl: null,
        series,
    };
}

const items = [
    product('base', 'metod'), product('base', 'knoxhult'),
    product('sink', 'metod'),
    product('dishwasher', null),
];

const ids = (products: Product[]) => products.map((p) => p.id);

describe('catalogForSeries', () => {
    it('keeps the chosen series and shared items', () => {
        expect(ids(catalogForSeries(items, 'metod'))).toEqual(['catalog-base-metod', 'catalog-sink-metod', 'catalog-dishwasher-shared']);
    });

    it('borrows kinds the chosen series does not offer', () => {
        expect(ids(catalogForSeries(items, 'knoxhult'))).toEqual(['catalog-base-knoxhult', 'catalog-sink-metod', 'catalog-dishwasher-shared']);
    });
});
