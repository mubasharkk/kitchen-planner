<?php

declare(strict_types=1);

namespace App\Data;

use InvalidArgumentException;

/**
 * Width × depth × height in centimetres. Any axis may be unknown (null)
 * until it is completed from a fallback.
 */
final readonly class Dimensions
{
    public function __construct(
        public ?float $width = null,
        public ?float $depth = null,
        public ?float $height = null,
    ) {
        foreach (['width' => $width, 'depth' => $depth, 'height' => $height] as $axis => $value) {
            if ($value !== null && ($value <= 0 || $value > 1000)) {
                throw new InvalidArgumentException("Implausible {$axis}: {$value} cm");
            }
        }
    }

    public static function unknown(): self
    {
        return new self;
    }

    public function isComplete(): bool
    {
        return $this->width !== null && $this->depth !== null && $this->height !== null;
    }

    public function isEmpty(): bool
    {
        return $this->width === null && $this->depth === null && $this->height === null;
    }

    /** Fill the unknown axes from another set of dimensions. */
    public function completeWith(self $fallback): self
    {
        return new self(
            $this->width ?? $fallback->width,
            $this->depth ?? $fallback->depth,
            $this->height ?? $fallback->height,
        );
    }

    /** @return array{width: ?float, depth: ?float, height: ?float} */
    public function toArray(): array
    {
        return ['width' => $this->width, 'depth' => $this->depth, 'height' => $this->height];
    }
}
