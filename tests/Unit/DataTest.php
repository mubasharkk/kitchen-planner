<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Data\ArticleNumber;
use App\Data\Dimensions;
use App\Data\Money;
use App\Data\Product;
use App\Enums\ProductKind;
use App\Enums\ProductSource;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

final class DataTest extends TestCase
{
    public function test_article_numbers_are_normalised(): void
    {
        $combination = ArticleNumber::fromString('S59451468');
        $this->assertSame('594.514.68', $combination->formatted());
        $this->assertTrue($combination->isCombination);
        $this->assertTrue(ArticleNumber::fromString('594.514.68')->equals($combination));
        $this->assertNull(ArticleNumber::tryFromString('12345'));
    }

    public function test_money_parses_german_and_english_prices(): void
    {
        $this->assertSame(1234.56, Money::parse('1.234,56 €')?->amount);
        $this->assertSame(1234.56, Money::parse('1,234.56')?->amount);
        $this->assertSame(249.0, Money::parse('249.–')?->amount);
        $this->assertSame(95.0, Money::parse(95)?->amount);
        $this->assertNull(Money::parse(''));
    }

    public function test_products_fall_back_to_standard_sizes(): void
    {
        $product = new Product('x', 'Wall', ProductKind::Wall, new Dimensions(40.0), ProductSource::Link);

        $this->assertSame(['width' => 40.0, 'depth' => 37.0, 'height' => 80.0], $product->dimensions->toArray());
        $this->assertSame('wall', $product->toArray()['zone']);
    }

    public function test_dimensions_are_completed_from_a_fallback(): void
    {
        $completed = (new Dimensions(60.0))->completeWith(new Dimensions(80.0, 60.0, 80.0));

        $this->assertSame(['width' => 60.0, 'depth' => 60.0, 'height' => 80.0], $completed->toArray());
        $this->assertTrue($completed->isComplete());
        $this->assertTrue(Dimensions::unknown()->isEmpty());
    }

    public function test_implausible_dimensions_are_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        new Dimensions(0.0);
    }
}
