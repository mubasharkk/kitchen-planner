<?php

declare(strict_types=1);

namespace App\Actions;

use App\Contracts\IkeaProductResolver;
use App\Exceptions\UnsupportedProductLink;

/**
 * Turn the links a customer pasted into products, explaining the ones we
 * can't use instead of failing the whole batch.
 */
final class ResolveIkeaProductLinks
{
    public function __construct(private readonly IkeaProductResolver $resolver) {}

    /**
     * @param  list<string>  $urls
     * @return array{products: list<array<string, mixed>>, errors: list<array{url: string, message: string}>}
     */
    public function handle(array $urls): array
    {
        $products = [];
        $errors = [];
        $seen = [];

        foreach ($urls as $url) {
            $url = trim($url);
            if ($url === '' || isset($seen[$url])) {
                continue;
            }
            $seen[$url] = true;

            try {
                $products[] = $this->resolver->resolve($url)->toArray();
            } catch (UnsupportedProductLink $e) {
                $errors[] = ['url' => $url, 'message' => $e->getMessage()];
            }
        }

        return ['products' => $products, 'errors' => $errors];
    }
}
