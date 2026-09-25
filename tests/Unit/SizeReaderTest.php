<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Enums\ProductKind;
use App\Services\Catalog\SizeReader;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class SizeReaderTest extends TestCase
{
    /** @return array<string, array{string, ProductKind, array{width: ?float, depth: ?float, height: ?float}}> */
    public static function sizes(): array
    {
        return [
            'base is width x depth' => ['Unterschrank, 60x60 cm', ProductKind::Base, ['width' => 60.0, 'depth' => 60.0, 'height' => null]],
            'wall is width x height' => ['Wandschrank, 40x80 cm', ProductKind::Wall, ['width' => 40.0, 'depth' => null, 'height' => 80.0]],
            'three numbers' => ['Hochschrank, 60x60x200 cm', ProductKind::Tall, ['width' => 60.0, 'depth' => 60.0, 'height' => 200.0]],
            'unicode times' => ['Wall cabinet 60×37×80 cm', ProductKind::Wall, ['width' => 60.0, 'depth' => 37.0, 'height' => 80.0]],
            'decimal comma worktop' => ['Arbeitsplatte, 246x63,5 cm', ProductKind::Worktop, ['width' => 246.0, 'depth' => 63.5, 'height' => null]],
            'none' => ['Küchenmischer, Edelstahl', ProductKind::Tap, ['width' => null, 'depth' => null, 'height' => null]],
        ];
    }

    /** @param array{width: ?float, depth: ?float, height: ?float} $expected */
    #[DataProvider('sizes')]
    public function test_it_reads_ikea_sizes(string $text, ProductKind $kind, array $expected): void
    {
        $this->assertSame($expected, (new SizeReader)->read($text, $kind)->toArray());
    }
}
