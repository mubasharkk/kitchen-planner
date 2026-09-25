<?php

declare(strict_types=1);

namespace App\Enums;

/** The IKEA kitchen system a standard catalog item belongs to. */
enum KitchenSeries: string
{
    /** Modular frames with separate fronts, drawers and legs. */
    case Metod = 'metod';

    /** Ready-to-hang budget cabinets in fixed widths. */
    case Knoxhult = 'knoxhult';
}
