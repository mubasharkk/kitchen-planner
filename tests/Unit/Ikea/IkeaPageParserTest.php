<?php

declare(strict_types=1);

namespace Tests\Unit\Ikea;

use App\Enums\ProductKind;
use App\Enums\ProductSource;
use App\Services\Ikea\IkeaLinkParser;
use App\Services\Ikea\IkeaPageParser;
use App\Services\Ikea\IkeaProductBuilder;
use PHPUnit\Framework\TestCase;

final class IkeaPageParserTest extends TestCase
{
    private static function fixture(string $name): string
    {
        return (string) file_get_contents(__DIR__.'/../../Fixtures/'.$name);
    }

    public function test_it_reads_json_ld_meta_and_measurements(): void
    {
        $page = (new IkeaPageParser)->parse(self::fixture('ikea-metod-wall-cabinet.html'));

        $this->assertNotNull($page);
        $this->assertSame('METOD Wandschrank mit Böden, weiß/Veddinge weiß, 40x80 cm', $page->name);
        $this->assertSame('094.556.29', $page->articleNumber?->formatted());
        $this->assertSame(['amount' => 69.0, 'currency' => 'EUR'], $page->price?->toArray());
        $this->assertSame('https://www.ikea.com/de/de/images/products/metod-wandschrank.jpg', $page->imageUrl);
        $this->assertSame(['width' => 40.0, 'depth' => 38.6, 'height' => 80.0], $page->measurements->toArray());
    }

    public function test_it_falls_back_to_open_graph_when_there_is_no_json_ld(): void
    {
        $page = (new IkeaPageParser)->parse(self::fixture('ikea-og-only.html'));

        $this->assertSame('BEJUBLAD Induktionskochfeld, IKEA 500 schwarz, 59 cm', $page?->name);
        $this->assertSame(349.0, $page?->price?->amount);
    }

    public function test_a_bot_challenge_is_not_a_product(): void
    {
        $this->assertNull((new IkeaPageParser)->parse('<html><head><title>Access Denied</title></head><body>Reference #18</body></html>'));
    }

    public function test_the_factory_prefers_the_headline_size_and_fills_gaps_from_the_page(): void
    {
        $link = (new IkeaLinkParser)->parse('https://www.ikea.com/de/de/p/metod-wandschrank-mit-boeden-weiss-veddinge-weiss-s09455629/');
        $page = (new IkeaPageParser)->parse(self::fixture('ikea-metod-wall-cabinet.html'));

        $product = (new IkeaProductBuilder)->make($link, $page);

        $this->assertSame(ProductKind::Wall, $product->kind);
        $this->assertSame(ProductSource::Page, $product->source);
        $this->assertSame(['width' => 40.0, 'depth' => 38.6, 'height' => 80.0], $product->dimensions->toArray());
        $this->assertSame('ikea-09455629', $product->id);
    }

    public function test_without_the_page_the_link_still_makes_a_product(): void
    {
        $link = (new IkeaLinkParser)->parse('https://www.ikea.com/de/de/p/metod-unterschrank-fuer-spuele-2-tueren-weiss-veddinge-weiss-s69467598/');

        $product = (new IkeaProductBuilder)->make($link, null);

        $this->assertSame(ProductKind::Sink, $product->kind);
        $this->assertSame(ProductSource::Link, $product->source);
        $this->assertSame(['width' => 80.0, 'depth' => 60.0, 'height' => 80.0], $product->dimensions->toArray());
        $this->assertNull($product->price);
    }
}
