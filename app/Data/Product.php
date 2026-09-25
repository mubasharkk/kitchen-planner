<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\KitchenSeries;
use App\Enums\ProductKind;
use App\Enums\ProductSource;

/**
 * A product that can go into a kitchen: either one the customer linked
 * from IKEA, or a standard item from the built-in catalog.
 */
final readonly class Product
{
    public Dimensions $dimensions;

    public function __construct(
        public string $id,
        public string $name,
        public ProductKind $kind,
        Dimensions $dimensions,
        public ProductSource $source,
        public ?ArticleNumber $articleNumber = null,
        public ?Money $price = null,
        public ?string $url = null,
        public ?string $imageUrl = null,
        public bool $priceIsEstimate = false,
        public ?KitchenSeries $series = null,
    ) {
        // Whatever we could not read falls back to the METOD standard size.
        $this->dimensions = $dimensions->completeWith($kind->defaultDimensions());
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'kind' => $this->kind->value,
            'kindLabel' => $this->kind->label(),
            'zone' => $this->kind->zone(),
            'dimensions' => $this->dimensions->toArray(),
            'source' => $this->source->value,
            'articleNumber' => $this->articleNumber?->formatted(),
            'price' => $this->price?->toArray(),
            'priceIsEstimate' => $this->priceIsEstimate,
            'url' => $this->url,
            'imageUrl' => $this->imageUrl,
            'series' => $this->series?->value,
        ];
    }
}
