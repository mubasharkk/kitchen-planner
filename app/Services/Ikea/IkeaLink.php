<?php

declare(strict_types=1);

namespace App\Services\Ikea;

use App\Data\ArticleNumber;

/** What a pasted IKEA product link tells us before we fetch anything. */
final readonly class IkeaLink
{
    public function __construct(
        public string $url,
        public string $market,
        public string $slug,
        public ?ArticleNumber $articleNumber,
        public string $nameGuess,
    ) {}
}
