<?php

declare(strict_types=1);

namespace App\Services\Catalog;

use App\Data\Dimensions;
use App\Data\Money;
use App\Data\Product;
use App\Enums\KitchenSeries;
use App\Enums\ProductKind;
use App\Enums\ProductSource;

/**
 * The standard METOD items and finishes from config/kitchen.php, which the
 * planner uses to fill gaps and complete a kitchen.
 */
final class KitchenCatalog
{
    /**
     * @param  list<array{kind: string, size: array{0: int|float, 1: int|float, 2: int|float}, price: int|float, name: string, search: string, series?: string}>  $items
     * @param  array<string, list<array<string, string>>>  $finishes
     */
    public function __construct(
        private readonly array $items,
        private readonly array $finishes,
        private readonly string $market = 'de/de',
        private readonly string $currency = 'EUR',
    ) {}

    /** @return list<Product> */
    public function products(): array
    {
        return array_map(function (array $item): Product {
            [$width, $depth, $height] = $item['size'];
            $kind = ProductKind::from($item['kind']);

            return new Product(
                id: sprintf('catalog-%s-%s', $kind->value, implode('x', array_map(
                    static fn ($n): string => str_replace('.', '_', (string) $n), $item['size'],
                ))),
                name: $item['name'],
                kind: $kind,
                dimensions: new Dimensions((float) $width, (float) $depth, (float) $height),
                source: ProductSource::Catalog,
                price: new Money((float) $item['price'], $this->currency),
                url: sprintf('https://www.ikea.com/%s/search/?q=%s', $this->market, rawurlencode($item['search'])),
                priceIsEstimate: true,
                series: isset($item['series']) ? KitchenSeries::from($item['series']) : null,
            );
        }, $this->items);
    }

    /** Everything the planner needs to start. @return array<string, mixed> */
    public function payload(): array
    {
        return [
            'market' => $this->market,
            'currency' => $this->currency,
            'items' => array_map(static fn (Product $p): array => $p->toArray(), $this->products()),
            'finishes' => $this->finishes,
        ];
    }
}
