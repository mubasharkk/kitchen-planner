<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Catalog\KitchenCatalog;
use Illuminate\Http\JsonResponse;

final class CatalogController extends Controller
{
    public function __invoke(KitchenCatalog $catalog): JsonResponse
    {
        return response()->json($catalog->payload());
    }
}
