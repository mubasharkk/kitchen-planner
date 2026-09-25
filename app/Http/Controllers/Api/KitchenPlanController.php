<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveKitchenPlanRequest;
use App\Http\Resources\KitchenPlanResource;
use App\Models\KitchenPlan;
use Illuminate\Http\JsonResponse;

final class KitchenPlanController extends Controller
{
    public function store(SaveKitchenPlanRequest $request): JsonResponse
    {
        $plan = KitchenPlan::create($request->planAttributes());

        return KitchenPlanResource::make($plan)->response()->setStatusCode(201);
    }

    public function show(KitchenPlan $plan): KitchenPlanResource
    {
        return KitchenPlanResource::make($plan);
    }

    public function update(SaveKitchenPlanRequest $request, KitchenPlan $plan): KitchenPlanResource
    {
        $plan->update($request->planAttributes());

        return KitchenPlanResource::make($plan);
    }
}
