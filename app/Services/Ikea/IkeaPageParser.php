<?php

declare(strict_types=1);

namespace App\Services\Ikea;

use App\Data\ArticleNumber;
use App\Data\Dimensions;
use App\Data\Money;

/**
 * Pulls name, article number, price, image and measurements out of an
 * IKEA product page. It tries several sources, because IKEA's markup
 * changes: schema.org JSON-LD, Open Graph / product meta tags, and the
 * labelled measurements in the product details ("Breite: 60 cm").
 */
final class IkeaPageParser
{
    private const AXIS_LABELS = [
        'width' => ['width', 'breite', 'largeur', 'bredd', 'breedte', 'larghezza', 'anchura', 'ancho'],
        'depth' => ['depth', 'tiefe', 'profondeur', 'djup', 'diepte', 'profondità', 'fondo', 'profundidad'],
        'height' => ['height', 'höhe', 'hauteur', 'höjd', 'hoogte', 'altezza', 'altura', 'alto'],
    ];

    /** Returns null when the HTML is not a product page (e.g. a bot challenge). */
    public function parse(string $html): ?IkeaPage
    {
        $product = $this->jsonLdProduct($html);
        $meta = $this->metaTags($html);

        $name = $this->cleanTitle($product['name'] ?? null) ?? $this->cleanTitle($meta['og:title'] ?? null);
        if ($name === null) {
            return null;
        }
        if (isset($product['description'], $product['name']) && ! str_contains((string) $product['name'], ' ')) {
            // Some markets put only the series ("METOD") in name and the type in description.
            $name = trim($product['name'].' '.$this->cleanTitle((string) $product['description']));
        }

        $offer = $product['offers'] ?? [];
        if (is_array($offer) && array_is_list($offer)) {
            $offer = $offer[0] ?? [];
        }
        $price = Money::parse(
            $offer['price'] ?? $offer['lowPrice'] ?? $meta['product:price:amount'] ?? null,
            $offer['priceCurrency'] ?? $meta['product:price:currency'] ?? 'EUR',
        );

        $image = $product['image'] ?? $meta['og:image'] ?? null;
        if (is_array($image)) {
            $image = $image[0] ?? null;
        }

        return new IkeaPage(
            name: $name,
            articleNumber: ArticleNumber::tryFromString(isset($product['sku']) ? (string) $product['sku'] : ($product['productID'] ?? null)),
            price: $price,
            imageUrl: is_string($image) && str_starts_with($image, 'https://') ? $image : null,
            measurements: $this->measurements($html),
        );
    }

    /** @return array<string, mixed> */
    private function jsonLdProduct(string $html): array
    {
        preg_match_all('#<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>#is', $html, $blocks);

        foreach ($blocks[1] as $json) {
            $data = json_decode(html_entity_decode(trim($json)), true);
            if (! is_array($data)) {
                continue;
            }
            $found = $this->findProduct($data);
            if ($found !== null) {
                return $found;
            }
        }

        return [];
    }

    /**
     * @param  array<mixed>  $node
     * @return array<string, mixed>|null
     */
    private function findProduct(array $node): ?array
    {
        $type = $node['@type'] ?? null;
        if ($type === 'Product' || (is_array($type) && in_array('Product', $type, true))) {
            return $node;
        }
        foreach ($node as $child) {
            if (is_array($child) && ($found = $this->findProduct($child)) !== null) {
                return $found;
            }
        }

        return null;
    }

    /** @return array<string, string> */
    private function metaTags(string $html): array
    {
        $meta = [];
        preg_match_all('#<meta\s+[^>]*>#i', $html, $tags);
        foreach ($tags[0] as $tag) {
            if (preg_match('#(?:property|name)=["\']([^"\']+)["\']#i', $tag, $key)
                && preg_match('#content=["\']([^"\']*)["\']#i', $tag, $content)) {
                $meta[strtolower($key[1])] ??= html_entity_decode($content[1], ENT_QUOTES | ENT_HTML5);
            }
        }

        return $meta;
    }

    private function measurements(string $html): Dimensions
    {
        $text = preg_replace('#<(script|style)\b.*?</\1>#is', ' ', $html) ?? $html;
        $text = html_entity_decode(strip_tags(str_replace('<', ' <', $text)), ENT_QUOTES | ENT_HTML5);
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;

        $found = [];
        foreach (self::AXIS_LABELS as $axis => $labels) {
            $pattern = '/\b(?:'.implode('|', array_map('preg_quote', $labels)).')\s*:?\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*cm\b/iu';
            if (preg_match($pattern, $text, $m)) {
                $found[$axis] = (float) str_replace(',', '.', $m[1]);
            }
        }

        return new Dimensions($found['width'] ?? null, $found['depth'] ?? null, $found['height'] ?? null);
    }

    private function cleanTitle(?string $title): ?string
    {
        if ($title === null) {
            return null;
        }
        $title = html_entity_decode($title, ENT_QUOTES | ENT_HTML5);
        $title = preg_replace('/\s+[-–|]\s+IKEA.*$/iu', '', $title) ?? $title;
        $title = trim(preg_replace('/\s+/u', ' ', $title) ?? $title);

        return $title === '' ? null : $title;
    }
}
