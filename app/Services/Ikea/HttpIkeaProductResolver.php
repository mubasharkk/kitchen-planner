<?php

declare(strict_types=1);

namespace App\Services\Ikea;

use App\Contracts\IkeaProductResolver;
use App\Data\Product;
use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Http\Client\Factory as Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Fetches the IKEA page and reads it. If IKEA can't be reached or answers
 * with something that isn't a product page (bot protection, a changed
 * layout), the product is still built from the link, marked as such, so
 * the customer can correct its size in the planner.
 */
final class HttpIkeaProductResolver implements IkeaProductResolver
{
    public function __construct(
        private readonly Http $http,
        private readonly Cache $cache,
        private readonly IkeaLinkParser $links,
        private readonly IkeaPageParser $pages,
        private readonly IkeaProductBuilder $builder,
        private readonly bool $fetchEnabled = true,
        private readonly int $timeoutSeconds = 8,
        private readonly int $cacheSeconds = 86400,
    ) {}

    public function resolve(string $url): Product
    {
        $link = $this->links->parse($url);
        $page = $this->fetchEnabled ? $this->fetchPage($link) : null;

        return $this->builder->make($link, $page);
    }

    private function fetchPage(IkeaLink $link): ?IkeaPage
    {
        $key = 'ikea-page:'.sha1($link->url);
        $html = $this->cache->get($key);
        if (is_string($html) && $html !== '') {
            return $this->pages->parse($html);
        }

        // Only successful pages are cached, so a temporary block is retried next time.
        $html = (function () use ($link): string {
            try {
                $response = $this->http
                    ->timeout($this->timeoutSeconds)
                    ->withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
                        'Accept' => 'text/html,application/xhtml+xml',
                        'Accept-Language' => str_replace('/', '-', $link->market).',en;q=0.8',
                    ])
                    ->get($link->url);

                return $response->successful() ? $response->body() : '';
            } catch (Throwable $e) {
                Log::info('IKEA page fetch failed', ['url' => $link->url, 'error' => $e->getMessage()]);

                return '';
            }
        })();

        $page = $html === '' ? null : $this->pages->parse($html);
        if ($page !== null) {
            $this->cache->put($key, $html, $this->cacheSeconds);
        }

        return $page;
    }
}
