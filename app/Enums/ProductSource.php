<?php

declare(strict_types=1);

namespace App\Enums;

/** Where a product's details came from — and so how far to trust them. */
enum ProductSource: string
{
    /** Read from the IKEA product page itself. */
    case Page = 'page';

    /** Guessed from the link alone because the page could not be read. */
    case Link = 'link';

    /** A standard item from the built-in catalog. */
    case Catalog = 'catalog';
}
