<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Enums\ProductKind;
use App\Services\Catalog\ProductClassifier;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class ProductClassifierTest extends TestCase
{
    /** @return array<string, array{string, ProductKind}> */
    public static function names(): array
    {
        return [
            'german base' => ['METOD Unterschrank mit 2 Türen, weiß/Veddinge weiß, 60x60 cm', ProductKind::Base],
            'slug base' => ['metod unterschrank mit 2 tueren weiss veddinge weiss', ProductKind::Base],
            'english base' => ['METOD Base cabinet with shelves, white/Voxtorp matt white, 40x60 cm', ProductKind::Base],
            'german drawers' => ['METOD / MAXIMERA Unterschrank mit 3 Schubladen, weiß/Stensund hellgrün, 60x60 cm', ProductKind::Drawers],
            'english drawers' => ['METOD / MAXIMERA Base cabinet with 2 drawers, white, 80x60 cm', ProductKind::Drawers],
            'sink cabinet' => ['METOD Unterschrank für Spüle + 2 Türen, weiß/Veddinge weiß, 80x60 cm', ProductKind::Sink],
            'english sink cabinet' => ['METOD Base cabinet for sink + 2 doors, white, 60x60 cm', ProductKind::Sink],
            'sink bowl' => ['HAVSEN Einbauspüle, 1 Becken, weiß, 62x48 cm', ProductKind::SinkBowl],
            'dishwasher' => ['MEDELSTOR Integrierter Geschirrspüler, IKEA 500 integriert, 60 cm', ProductKind::Dishwasher],
            'fridge' => ['METOD Hochschrank für Kühl-/Gefrierschrank, weiß, 60x60x200 cm', ProductKind::Fridge],
            'fridge slug' => ['metod hochschrank fuer kuehl gefrierschrank weiss', ProductKind::Fridge],
            'tall' => ['METOD Hochschrank mit Böden, weiß/Veddinge weiß, 60x60x200 cm', ProductKind::Tall],
            'tall oven' => ['METOD Hochschrank für Backofen, weiß, 60x60x200 cm', ProductKind::Tall],
            'oven base' => ['METOD Unterschrank für Backofen, weiß, 60x60 cm', ProductKind::Oven],
            'oven appliance' => ['MATTRADITION Heißluftbackofen, Edelstahl', ProductKind::Oven],
            'wall' => ['METOD Wandschrank mit Böden, weiß/Veddinge weiß, 60x80 cm', ProductKind::Wall],
            'english wall' => ['METOD Wall cabinet with 2 doors, white, 80x80 cm', ProductKind::Wall],
            'corner wall' => ['METOD Eckwandschrank mit Karussell, weiß, 68x80 cm', ProductKind::WallCorner],
            'corner base' => ['METOD Eckunterschrank mit Karussell, weiß, 88x88 cm', ProductKind::Corner],
            'hood' => ['MATTRADITION Wandhaube, Edelstahl, 60 cm', ProductKind::Hood],
            'hob' => ['BEJUBLAD Induktionskochfeld, IKEA 500 schwarz, 59 cm', ProductKind::Hob],
            'english hob' => ['LAGAN Induction hob, black, 59 cm', ProductKind::Hob],
            'tap' => ['GLYPEN Küchenmischer, Edelstahleffekt', ProductKind::Tap],
            'english tap' => ['INSJÖN Kitchen mixer tap, silver colour', ProductKind::Tap],
            'worktop' => ['EKBACKEN Arbeitsplatte, Marmoreffekt weiß/Laminat, 246x2.8 cm', ProductKind::Worktop],
            'plinth' => ['FÖRBÄTTRA Sockel, weiß, 220x8 cm', ProductKind::Panel],
            'handle' => ['BAGGANÄS Griff, schwarz, 143 mm', ProductKind::Handle],
            'door' => ['VOXTORP Tür, Hochglanz weiß, 60x80 cm', ProductKind::Front],
            'unknown' => ['SKÅDIS Lochplatte, weiß', ProductKind::Other],
        ];
    }

    #[DataProvider('names')]
    public function test_it_classifies_ikea_product_names(string $name, ProductKind $expected): void
    {
        $this->assertSame($expected, (new ProductClassifier)->classify($name));
    }
}
