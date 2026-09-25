<?php

declare(strict_types=1);

namespace App\Services\Ikea;

use App\Data\Product;
use App\Enums\ProductSource;
use App\Services\Catalog\ProductClassifier;
use App\Services\Catalog\SizeReader;

/** Combines what the link and (if we got it) the page say into one Product. */
final class IkeaProductBuilder
{
    public function __construct(
        private readonly ProductClassifier $classifier = new ProductClassifier,
        private readonly SizeReader $sizes = new SizeReader,
    ) {}

    public function make(IkeaLink $link, ?IkeaPage $page): Product
    {
        $name = $page?->name ?? $link->nameGuess;
        $kind = $this->classifier->classify($name.' '.str_replace('-', ' ', $link->slug));

        // The size in the product name is IKEA's headline size and the most
        // reliable; labelled page measurements fill in what it leaves out.
        $dimensions = $this->sizes->read($name, $kind);
        if ($page !== null) {
            $dimensions = $dimensions->completeWith($page->measurements);
        }
        $dimensions = $dimensions->completeWith($this->sizes->read($link->slug, $kind));

        $article = $page?->articleNumber ?? $link->articleNumber;

        return new Product(
            id: 'ikea-'.($article?->digits ?? substr(sha1($link->url), 0, 10)),
            name: $name,
            kind: $kind,
            dimensions: $dimensions,
            source: $page !== null ? ProductSource::Page : ProductSource::Link,
            articleNumber: $article,
            price: $page?->price,
            url: $link->url,
            imageUrl: $page?->imageUrl,
        );
    }
}
