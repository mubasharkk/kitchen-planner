<?php

declare(strict_types=1);

namespace App\Services\Ikea;

use App\Data\ArticleNumber;
use App\Exceptions\UnsupportedProductLink;

/**
 * Reads links like https://www.ikea.com/de/de/p/metod-unterschrank-mit-2-tueren-weiss-veddinge-weiss-s59451468/
 *
 * Only https links to ikea.com hosts are accepted: the resolver fetches
 * these URLs server-side, so this check is also the SSRF guard.
 */
final class IkeaLinkParser
{
    public function parse(string $input): IkeaLink
    {
        $url = trim($input);
        if (! preg_match('#^https?://#i', $url)) {
            $url = 'https://'.$url;
        }

        $parts = parse_url($url);
        $host = strtolower($parts['host'] ?? '');
        $path = $parts['path'] ?? '';

        if (($parts['scheme'] ?? '') === '' || isset($parts['user']) || isset($parts['port'])) {
            throw UnsupportedProductLink::because($input, 'Not a plain IKEA link');
        }
        if ($host !== 'ikea.com' && ! str_ends_with($host, '.ikea.com')) {
            throw UnsupportedProductLink::because($input, 'Only ikea.com links are supported');
        }
        if (! preg_match('#^/([a-z]{2})/([a-z]{2})/p/([a-z0-9-]+?)-?(s?\d{8})/?$#i', $path, $m)) {
            throw UnsupportedProductLink::because($input, 'This is not an IKEA product page link');
        }

        [, $country, $language, $slug, $article] = $m;
        $market = strtolower("{$country}/{$language}");
        $canonical = sprintf('https://www.ikea.com/%s/p/%s-%s/', $market, strtolower($slug), strtolower($article));

        return new IkeaLink(
            url: $canonical,
            market: $market,
            slug: strtolower($slug),
            articleNumber: ArticleNumber::tryFromString($article),
            nameGuess: self::nameFromSlug($slug),
        );
    }

    /** "metod-unterschrank-mit-2-tueren" → "METOD unterschrank mit 2 tueren" */
    private static function nameFromSlug(string $slug): string
    {
        $words = array_values(array_filter(explode('-', strtolower($slug))));
        if ($words === []) {
            return 'IKEA product';
        }
        $words[0] = strtoupper($words[0]);

        return implode(' ', $words);
    }
}
