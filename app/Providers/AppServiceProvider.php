<?php

namespace App\Providers;

use App\Contracts\IkeaProductResolver;
use App\Services\Catalog\KitchenCatalog;
use App\Services\Ikea\HttpIkeaProductResolver;
use App\Services\Ikea\IkeaLinkParser;
use App\Services\Ikea\IkeaPageParser;
use App\Services\Ikea\IkeaProductBuilder;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Http\Client\Factory as Http;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(KitchenCatalog::class, fn (): KitchenCatalog => new KitchenCatalog(
            items: config('kitchen.catalog'),
            finishes: config('kitchen.finishes'),
            market: config('kitchen.ikea.default_market'),
            currency: config('kitchen.currency'),
        ));

        // IKEA is an external boundary, so it is bound behind a contract.
        $this->app->singleton(IkeaProductResolver::class, fn (Application $app): HttpIkeaProductResolver => new HttpIkeaProductResolver(
            http: $app->make(Http::class),
            cache: $app->make('cache.store'),
            links: new IkeaLinkParser,
            pages: new IkeaPageParser,
            builder: new IkeaProductBuilder,
            fetchEnabled: (bool) config('kitchen.ikea.fetch_pages'),
            timeoutSeconds: (int) config('kitchen.ikea.timeout'),
            cacheSeconds: (int) config('kitchen.ikea.cache_seconds'),
        ));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
