<?php

declare(strict_types=1);

namespace App\Enums;

use App\Data\Dimensions;

/**
 * What a product is, as far as the kitchen layout is concerned.
 *
 * Floor units stand on the floor along a wall, wall units hang above the
 * worktop, and accessories are either drawn on top of a unit (hob, sink
 * bowl, tap, worktop) or only appear on the shopping list.
 */
enum ProductKind: string
{
    case Base = 'base';
    case Drawers = 'drawers';
    case Sink = 'sink';
    case Corner = 'corner';
    case Dishwasher = 'dishwasher';
    case Oven = 'oven';
    case Tall = 'tall';
    case Fridge = 'fridge';
    case Wall = 'wall';
    case WallCorner = 'wall_corner';
    case Hood = 'hood';
    case Hob = 'hob';
    case SinkBowl = 'sink_bowl';
    case Tap = 'tap';
    case Worktop = 'worktop';
    case Front = 'front';
    case Handle = 'handle';
    case Panel = 'panel';
    case Other = 'other';

    public function zone(): string
    {
        return match ($this) {
            self::Base, self::Drawers, self::Sink, self::Corner, self::Dishwasher,
            self::Oven, self::Tall, self::Fridge => 'floor',
            self::Wall, self::WallCorner, self::Hood => 'wall',
            default => 'accessory',
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Base => 'Base cabinet',
            self::Drawers => 'Base cabinet with drawers',
            self::Sink => 'Sink base cabinet',
            self::Corner => 'Corner base cabinet',
            self::Dishwasher => 'Dishwasher',
            self::Oven => 'Oven / oven cabinet',
            self::Tall => 'High cabinet',
            self::Fridge => 'Fridge / freezer',
            self::Wall => 'Wall cabinet',
            self::WallCorner => 'Corner wall cabinet',
            self::Hood => 'Extractor hood',
            self::Hob => 'Hob',
            self::SinkBowl => 'Sink',
            self::Tap => 'Kitchen tap',
            self::Worktop => 'Worktop',
            self::Front => 'Door / drawer front',
            self::Handle => 'Handle / knob',
            self::Panel => 'Cover panel / plinth',
            self::Other => 'Other',
        };
    }

    /**
     * METOD standard sizes in cm, used when neither the page nor the link
     * says how big the product is.
     */
    public function defaultDimensions(): Dimensions
    {
        return match ($this) {
            self::Base, self::Drawers, self::Oven => new Dimensions(60, 60, 80),
            self::Sink => new Dimensions(80, 60, 80),
            self::Corner => new Dimensions(88, 88, 80),
            self::Dishwasher => new Dimensions(60, 57, 80),
            self::Tall, self::Fridge => new Dimensions(60, 60, 220),
            self::Wall => new Dimensions(60, 37, 80),
            self::WallCorner => new Dimensions(68, 68, 80),
            self::Hood => new Dimensions(60, 50, 60),
            self::Hob => new Dimensions(59, 52, 5),
            self::SinkBowl => new Dimensions(56, 46, 20),
            self::Tap => new Dimensions(20, 20, 35),
            self::Worktop => new Dimensions(186, 63.5, 3.8),
            self::Front => new Dimensions(60, 2, 80),
            self::Handle => new Dimensions(16, 3, 2),
            self::Panel => new Dimensions(62, 1.3, 80),
            self::Other => new Dimensions(60, 60, 80),
        };
    }

    /**
     * How a two-number size ("60x80 cm") reads for this kind. IKEA writes
     * base cabinets as width × depth, wall and tall cabinets as width × height.
     *
     * @return array{0: string, 1: string}
     */
    public function twoNumberAxes(): array
    {
        return match ($this) {
            self::Wall, self::WallCorner, self::Tall, self::Fridge, self::Front, self::Panel => ['width', 'height'],
            default => ['width', 'depth'],
        };
    }
}
