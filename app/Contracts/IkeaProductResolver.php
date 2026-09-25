<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Data\Product;
use App\Exceptions\UnsupportedProductLink;

/**
 * Turns a link the customer pasted into a product. IKEA is an external
 * boundary, so it sits behind a contract and can be faked in tests.
 */
interface IkeaProductResolver
{
    /** @throws UnsupportedProductLink when the link is not a product page we can read */
    public function resolve(string $url): Product;
}
