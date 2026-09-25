<?php

declare(strict_types=1);

namespace App\Services\Catalog;

use App\Data\Dimensions;
use App\Enums\ProductKind;

/**
 * Reads a size written the IKEA way — "60x60 cm", "60x37x80 cm",
 * "246x63.5 cm", "40x60-cm" in a slug — and maps it onto the axes that
 * kind of product uses.
 */
final class SizeReader
{
    public function read(string $text, ProductKind $kind): Dimensions
    {
        // "60x37x80" or "60x60 cm"; slugs spell the decimal point as "-" or "."
        if (! preg_match('/(?<![\d.,])(\d{1,3}(?:[.,]\d)?)\s*[x×]\s*(\d{1,3}(?:[.,]\d)?)(?:\s*[x×]\s*(\d{1,3}(?:[.,]\d)?))?\s*(?:cm)?/iu', $text, $m)) {
            return Dimensions::unknown();
        }

        $numbers = array_values(array_filter(
            [$m[1], $m[2], $m[3] ?? null],
            static fn (?string $n): bool => $n !== null && $n !== '',
        ));
        $numbers = array_map(static fn (string $n): float => (float) str_replace(',', '.', $n), $numbers);

        if (count($numbers) === 3) {
            return self::safe($numbers[0], $numbers[1], $numbers[2]);
        }

        if ($kind === ProductKind::Worktop) {
            // Worktops are length × depth.
            return self::safe($numbers[0], $numbers[1], null);
        }

        [$first, $second] = $kind->twoNumberAxes();
        $axes = ['width' => null, 'depth' => null, 'height' => null];
        $axes[$first] = $numbers[0];
        $axes[$second] = $numbers[1];

        return self::safe($axes['width'], $axes['depth'], $axes['height']);
    }

    private static function safe(?float $w, ?float $d, ?float $h): Dimensions
    {
        foreach ([$w, $d, $h] as $v) {
            if ($v !== null && ($v <= 0 || $v > 1000)) {
                return Dimensions::unknown();
            }
        }

        return new Dimensions($w, $d, $h);
    }
}
