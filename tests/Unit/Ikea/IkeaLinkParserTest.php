<?php

declare(strict_types=1);

namespace Tests\Unit\Ikea;

use App\Exceptions\UnsupportedProductLink;
use App\Services\Ikea\IkeaLinkParser;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class IkeaLinkParserTest extends TestCase
{
    public function test_it_reads_a_german_combination_link(): void
    {
        $link = (new IkeaLinkParser)->parse('https://www.ikea.com/de/de/p/metod-unterschrank-mit-2-tueren-weiss-veddinge-weiss-s59451468/?utm_source=x#reviews');

        $this->assertSame('https://www.ikea.com/de/de/p/metod-unterschrank-mit-2-tueren-weiss-veddinge-weiss-s59451468/', $link->url);
        $this->assertSame('de/de', $link->market);
        $this->assertSame('594.514.68', $link->articleNumber?->formatted());
        $this->assertSame('METOD unterschrank mit 2 tueren weiss veddinge weiss', $link->nameGuess);
    }

    public function test_it_accepts_links_without_scheme_and_other_markets(): void
    {
        $link = (new IkeaLinkParser)->parse('ikea.com/gb/en/p/lagan-induction-hob-black-00467971');

        $this->assertSame('gb/en', $link->market);
        $this->assertSame('004.679.71', $link->articleNumber?->formatted());
    }

    /** @return array<string, array{string}> */
    public static function rejected(): array
    {
        return [
            'other host' => ['https://evil.example.com/de/de/p/metod-s59451468/'],
            'lookalike host' => ['https://www.ikea.com.evil.example/de/de/p/metod-s59451468/'],
            'credentials' => ['https://user@www.ikea.com/de/de/p/metod-s59451468/'],
            'port' => ['https://www.ikea.com:8443/de/de/p/metod-s59451468/'],
            'not a product' => ['https://www.ikea.com/de/de/cat/kuechen-ka001/'],
            'no article number' => ['https://www.ikea.com/de/de/p/metod-unterschrank/'],
        ];
    }

    #[DataProvider('rejected')]
    public function test_it_rejects_anything_but_ikea_product_pages(string $url): void
    {
        $this->expectException(UnsupportedProductLink::class);
        (new IkeaLinkParser)->parse($url);
    }
}
