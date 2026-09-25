<?php

declare(strict_types=1);

namespace App\Enums;

/** Which walls the kitchen runs along. */
enum LayoutShape: string
{
    /** One run along the back wall. */
    case Straight = 'I';

    /** Back wall plus the left wall. */
    case LShape = 'L';

    /** Back, left and right walls. */
    case UShape = 'U';

    /** Back wall and the wall opposite it. */
    case Galley = 'galley';
}
