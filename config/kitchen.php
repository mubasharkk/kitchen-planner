<?php

/*
|--------------------------------------------------------------------------
| Kitchen planner
|--------------------------------------------------------------------------
|
| All sizes are centimetres. Catalog prices are rough estimates for the
| German market so the planner can show a ballpark total; they are marked
| as estimates everywhere and the shopping list links to IKEA's search so
| the customer sees the real price.
|
*/

return [

    'ikea' => [
        // Turn off to plan purely from the links (e.g. offline development).
        'fetch_pages' => env('IKEA_FETCH_PAGES', true),
        'timeout' => (int) env('IKEA_FETCH_TIMEOUT', 8),
        'cache_seconds' => 60 * 60 * 24,
        'default_market' => env('IKEA_MARKET', 'de/de'),
        'max_links_per_request' => 40,
    ],

    'currency' => 'EUR',

    /*
    | Standard items the planner may use to fill the gaps the customer's own
    | products leave. "search" is what the shopping list searches IKEA for.
    | "series" ties a cabinet to METOD or KNOXHULT; items without one
    | (appliances, worktops, handles…) are offered for either series.
    */
    'catalog' => [
        // Base cabinets with doors (METOD frame + door + legs + shelf)
        ['kind' => 'base', 'size' => [20, 60, 80], 'price' => 65, 'series' => 'metod', 'name' => 'METOD base cabinet with door 20x60', 'search' => 'METOD Unterschrank 20x60'],
        ['kind' => 'base', 'size' => [30, 60, 80], 'price' => 75, 'series' => 'metod', 'name' => 'METOD base cabinet with door 30x60', 'search' => 'METOD Unterschrank 30x60'],
        ['kind' => 'base', 'size' => [40, 60, 80], 'price' => 85, 'series' => 'metod', 'name' => 'METOD base cabinet with door 40x60', 'search' => 'METOD Unterschrank 40x60'],
        ['kind' => 'base', 'size' => [60, 60, 80], 'price' => 105, 'series' => 'metod', 'name' => 'METOD base cabinet with 2 doors 60x60', 'search' => 'METOD Unterschrank 60x60'],
        ['kind' => 'base', 'size' => [80, 60, 80], 'price' => 130, 'series' => 'metod', 'name' => 'METOD base cabinet with 2 doors 80x60', 'search' => 'METOD Unterschrank 80x60'],

        // Base cabinets with drawers (MAXIMERA)
        ['kind' => 'drawers', 'size' => [40, 60, 80], 'price' => 180, 'series' => 'metod', 'name' => 'METOD/MAXIMERA base cabinet with 3 drawers 40x60', 'search' => 'METOD Unterschrank Schubladen 40x60'],
        ['kind' => 'drawers', 'size' => [60, 60, 80], 'price' => 210, 'series' => 'metod', 'name' => 'METOD/MAXIMERA base cabinet with 3 drawers 60x60', 'search' => 'METOD Unterschrank Schubladen 60x60'],
        ['kind' => 'drawers', 'size' => [80, 60, 80], 'price' => 250, 'series' => 'metod', 'name' => 'METOD/MAXIMERA base cabinet with 3 drawers 80x60', 'search' => 'METOD Unterschrank Schubladen 80x60'],

        ['kind' => 'sink', 'size' => [60, 60, 80], 'price' => 110, 'series' => 'metod', 'name' => 'METOD base cabinet for sink 60x60', 'search' => 'METOD Unterschrank für Spüle 60x60'],
        ['kind' => 'sink', 'size' => [80, 60, 80], 'price' => 130, 'series' => 'metod', 'name' => 'METOD base cabinet for sink 80x60', 'search' => 'METOD Unterschrank für Spüle 80x60'],
        ['kind' => 'corner', 'size' => [88, 88, 80], 'price' => 190, 'series' => 'metod', 'name' => 'METOD corner base cabinet 88x88', 'search' => 'METOD Eckunterschrank 88x88'],
        ['kind' => 'dishwasher', 'size' => [60, 57, 80], 'price' => 499, 'name' => 'Integrated dishwasher 60 cm', 'search' => 'integrierter Geschirrspüler 60 cm'],
        ['kind' => 'oven', 'size' => [60, 60, 80], 'price' => 449, 'name' => 'Built-in oven in METOD base cabinet 60x60', 'search' => 'METOD Unterschrank für Backofen 60x60'],

        ['kind' => 'tall', 'size' => [60, 60, 220], 'price' => 230, 'series' => 'metod', 'name' => 'METOD high cabinet with shelves 60x60x220', 'search' => 'METOD Hochschrank 60x60x220'],
        ['kind' => 'fridge', 'size' => [60, 60, 220], 'price' => 899, 'name' => 'Integrated fridge/freezer in METOD high cabinet 60x60x220', 'search' => 'METOD Hochschrank für Kühl-/Gefrierschrank 60x60x220'],

        ['kind' => 'wall', 'size' => [20, 37, 80], 'price' => 45, 'series' => 'metod', 'name' => 'METOD wall cabinet 20x80', 'search' => 'METOD Wandschrank 20x80'],
        ['kind' => 'wall', 'size' => [30, 37, 80], 'price' => 55, 'series' => 'metod', 'name' => 'METOD wall cabinet 30x80', 'search' => 'METOD Wandschrank 30x80'],
        ['kind' => 'wall', 'size' => [40, 37, 80], 'price' => 65, 'series' => 'metod', 'name' => 'METOD wall cabinet 40x80', 'search' => 'METOD Wandschrank 40x80'],
        ['kind' => 'wall', 'size' => [60, 37, 80], 'price' => 80, 'series' => 'metod', 'name' => 'METOD wall cabinet with 2 doors 60x80', 'search' => 'METOD Wandschrank 60x80'],
        ['kind' => 'wall', 'size' => [80, 37, 80], 'price' => 100, 'series' => 'metod', 'name' => 'METOD wall cabinet with 2 doors 80x80', 'search' => 'METOD Wandschrank 80x80'],
        ['kind' => 'wall_corner', 'size' => [68, 68, 80], 'price' => 140, 'series' => 'metod', 'name' => 'METOD corner wall cabinet 68x68x80', 'search' => 'METOD Eckwandschrank 68x80'],
        ['kind' => 'hood', 'size' => [60, 50, 60], 'price' => 199, 'name' => 'Wall-mounted extractor hood 60 cm', 'search' => 'Wandhaube 60 cm'],

        ['kind' => 'hob', 'size' => [59, 52, 5], 'price' => 349, 'name' => 'Induction hob 59 cm', 'search' => 'Induktionskochfeld 59 cm'],
        ['kind' => 'sink_bowl', 'size' => [56, 46, 20], 'price' => 99, 'name' => 'Inset sink, 1 bowl', 'search' => 'Einbauspüle 1 Becken'],
        ['kind' => 'tap', 'size' => [20, 20, 35], 'price' => 69, 'name' => 'Kitchen mixer tap', 'search' => 'Küchenmischer'],
        ['kind' => 'worktop', 'size' => [246, 63.5, 3.8], 'price' => 119, 'name' => 'Worktop 246x63.5 cm, laminate', 'search' => 'Arbeitsplatte 246x63,5'],
        ['kind' => 'panel', 'size' => [62, 1.3, 80], 'price' => 25, 'name' => 'Cover panel / filler strip 62x80', 'search' => 'METOD Abdeckseite 62x80'],
        ['kind' => 'panel', 'size' => [220, 1.3, 8], 'price' => 22, 'name' => 'Plinth 220x8 cm', 'search' => 'Sockel 220x8'],
        ['kind' => 'handle', 'size' => [16, 3, 2], 'price' => 6, 'name' => 'Handle', 'search' => 'Griff Küche'],

        // KNOXHULT — IKEA's ready-to-hang budget kitchen sets. Sold as complete
        // cabinets (no separate MAXIMERA/UTRUSTA build-out), so sizes come in
        // fewer, fixed widths than METOD's modular system.
        ['kind' => 'drawers', 'size' => [40, 60, 91], 'price' => 49, 'series' => 'knoxhult', 'name' => 'KNOXHULT base cabinet with drawers 40x60', 'search' => 'KNOXHULT Unterschrank mit Schubladen 40'],
        ['kind' => 'drawers', 'size' => [120, 60, 91], 'price' => 119, 'series' => 'knoxhult', 'name' => 'KNOXHULT base cabinet with doors and drawer 120x60', 'search' => 'KNOXHULT Unterschrank mit Türen und Schublade 120'],
        ['kind' => 'drawers', 'size' => [180, 60, 91], 'price' => 117, 'series' => 'knoxhult', 'name' => 'KNOXHULT base cabinet with doors and drawer 180x60', 'search' => 'KNOXHULT Unterschrank mit Türen und Schublade 180'],
        ['kind' => 'base', 'size' => [120, 61, 91], 'price' => 89, 'series' => 'knoxhult', 'name' => 'KNOXHULT base cabinet with door and open shelf 120x61', 'search' => 'KNOXHULT Unterschrank mit Tür und offenem Bereich 120'],
        ['kind' => 'corner', 'size' => [100, 60, 91], 'price' => 141, 'series' => 'knoxhult', 'name' => 'KNOXHULT base corner cabinet 100x91', 'search' => 'KNOXHULT Eckunterschrank 100'],

        ['kind' => 'wall', 'size' => [40, 35, 75], 'price' => 18, 'series' => 'knoxhult', 'name' => 'KNOXHULT wall cabinet with door 40x75', 'search' => 'KNOXHULT Wandschrank mit Tür 40x75'],
        ['kind' => 'wall', 'size' => [60, 35, 60], 'price' => 19, 'series' => 'knoxhult', 'name' => 'KNOXHULT wall cabinet with door 60x60', 'search' => 'KNOXHULT Wandschrank mit Tür 60x60'],
        ['kind' => 'wall', 'size' => [60, 35, 75], 'price' => 36, 'series' => 'knoxhult', 'name' => 'KNOXHULT wall cabinet with door 60x75', 'search' => 'KNOXHULT Wandschrank mit Tür 60x75'],
        ['kind' => 'wall', 'size' => [120, 35, 75], 'price' => 55, 'series' => 'knoxhult', 'name' => 'KNOXHULT wall cabinet with doors 120x75', 'search' => 'KNOXHULT Wandschrank mit Türen 120x75'],
        ['kind' => 'wall', 'size' => [120, 29, 37.5], 'price' => 59, 'series' => 'knoxhult', 'name' => 'KNOXHULT wall cabinet with sliding doors 120x37.5', 'search' => 'KNOXHULT Wandschrank mit Schiebetüren 120'],
        ['kind' => 'tall', 'size' => [60, 31, 153], 'price' => 69, 'series' => 'knoxhult', 'name' => 'KNOXHULT high cabinet with door 60x153', 'search' => 'KNOXHULT Hochschrank mit Tür 60x153'],
        ['kind' => 'tall', 'size' => [60, 31, 228], 'price' => 105, 'series' => 'knoxhult', 'name' => 'KNOXHULT high cabinet with doors 60x228', 'search' => 'KNOXHULT Hochschrank mit Türen 60x228'],
    ],

    /* Colours the 3D view uses; names follow IKEA front families. */
    'finishes' => [
        'fronts' => [
            ['id' => 'white', 'name' => 'White (VEDDINGE)', 'color' => '#f4f3ef'],
            ['id' => 'grey', 'name' => 'Dark grey (KUNGSBACKA)', 'color' => '#4a4d52'],
            ['id' => 'green', 'name' => 'Grey-green (STENSUND)', 'color' => '#8e9e8a'],
            ['id' => 'beige', 'name' => 'Beige (UPPLÖV)', 'color' => '#cdbfa6'],
            ['id' => 'oak', 'name' => 'Oak effect (FORSBACKA)', 'color' => '#b98e5f'],
            ['id' => 'blue', 'name' => 'Dark blue (AXSTAD)', 'color' => '#2f3e57'],
        ],
        'worktops' => [
            ['id' => 'oak', 'name' => 'Oak', 'color' => '#b08354'],
            ['id' => 'white', 'name' => 'White laminate', 'color' => '#ebe9e4'],
            ['id' => 'black', 'name' => 'Black mineral', 'color' => '#26272a'],
            ['id' => 'concrete', 'name' => 'Concrete effect', 'color' => '#9d9a95'],
        ],
        'handles' => [
            ['id' => 'steel', 'name' => 'BAGGANÄS, stainless steel', 'color' => '#b9bcc0'],
            ['id' => 'black', 'name' => 'BAGGANÄS, black', 'color' => '#1c1c1e'],
            ['id' => 'brass', 'name' => 'BAGGANÄS, brass', 'color' => '#b8923f'],
            ['id' => 'chrome', 'name' => 'ENERYDA, chrome', 'color' => '#d7dade'],
            ['id' => 'bronze', 'name' => 'NYDALA, bronze', 'color' => '#5b4632'],
            ['id' => 'oak', 'name' => 'HAMPHULT, oak', 'color' => '#b98e5f'],
            ['id' => 'white', 'name' => 'BILLSBRO, white', 'color' => '#f4f3ef'],
            ['id' => 'anthracite', 'name' => 'BILLSBRO, anthracite', 'color' => '#3a3d42'],
        ],
        /* Tints the 3D floor's plank texture, which is drawn in neutral greys. */
        'floors' => [
            ['id' => 'natural', 'name' => 'Natural oak', 'color' => '#d2a978'],
            ['id' => 'light', 'name' => 'Light ash', 'color' => '#e4d9c4'],
            ['id' => 'grey', 'name' => 'Grey-washed', 'color' => '#b7b3ac'],
            ['id' => 'walnut', 'name' => 'Dark walnut', 'color' => '#7a5236'],
            ['id' => 'concrete', 'name' => 'Polished concrete', 'color' => '#a9a6a0'],
            ['id' => 'white', 'name' => 'White-washed', 'color' => '#e8e4da'],
        ],
    ],
];
