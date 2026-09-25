<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\ResolveIkeaProductLinks;
use App\Http\Controllers\Controller;
use App\Http\Requests\ResolveProductLinksRequest;
use Illuminate\Http\JsonResponse;

final class ProductLinkController extends Controller
{
    public function __invoke(ResolveProductLinksRequest $request, ResolveIkeaProductLinks $resolveLinks): JsonResponse
    {
        return response()->json($resolveLinks->handle($request->urls()));
    }
}
