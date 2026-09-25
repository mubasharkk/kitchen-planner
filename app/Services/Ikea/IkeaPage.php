<?php

declare(strict_types=1);

namespace App\Services\Ikea;

use App\Data\ArticleNumber;
use App\Data\Dimensions;
use App\Data\Money;

/** What we could read from an IKEA product page. */
final readonly class IkeaPage
{
    public function __construct(
        public ?string $name,
        public ?ArticleNumber $articleNumber,
        public ?Money $price,
        public ?string $imageUrl,
        public Dimensions $measurements,
    ) {}
}
