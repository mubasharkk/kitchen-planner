<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class ProductLinksTest extends TestCase
{
    public function test_it_resolves_links_from_the_ikea_page(): void
    {
        Http::fake([
            'www.ikea.com/*' => Http::response((string) file_get_contents(base_path('tests/Fixtures/ikea-metod-wall-cabinet.html'))),
        ]);

        $this->postJson('/api/products/resolve', ['urls' => [
            'https://www.ikea.com/de/de/p/metod-wandschrank-mit-boeden-weiss-veddinge-weiss-s09455629/',
            'https://example.com/not-ikea',
        ]])
            ->assertOk()
            ->assertJsonPath('products.0.kind', 'wall')
            ->assertJsonPath('products.0.source', 'page')
            // json_encode() drops the zero fraction, so compare numerically.
            ->assertJsonPath('products.0.dimensions.width', fn (int|float $width): bool => (float) $width === 40.0)
            ->assertJsonPath('products.0.price.amount', fn (int|float $price): bool => (float) $price === 69.0)
            ->assertJsonPath('errors.0.url', 'https://example.com/not-ikea');
    }

    public function test_it_falls_back_to_the_link_when_ikea_blocks_the_request(): void
    {
        Http::fake(['www.ikea.com/*' => Http::response('Access Denied', 403)]);

        $this->postJson('/api/products/resolve', ['urls' => [
            'https://www.ikea.com/de/de/p/metod-unterschrank-fuer-spuele-2-tueren-weiss-veddinge-weiss-s69467598/',
        ]])
            ->assertOk()
            ->assertJsonPath('products.0.kind', 'sink')
            ->assertJsonPath('products.0.source', 'link');
    }

    public function test_it_validates_the_input(): void
    {
        $this->postJson('/api/products/resolve', ['urls' => []])->assertUnprocessable();
    }
}
