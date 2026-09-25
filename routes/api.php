<?php

use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\KitchenPlanController;
use App\Http\Controllers\Api\ProductLinkController;
use Illuminate\Support\Facades\Route;

Route::get('/catalog', CatalogController::class)->name('api.catalog');

// Each call may fetch up to 40 IKEA pages, so keep it modest.
Route::post('/products/resolve', ProductLinkController::class)
    ->middleware('throttle:20,1')
    ->name('api.products.resolve');

Route::post('/plans', [KitchenPlanController::class, 'store'])->middleware('throttle:30,1')->name('api.plans.store');
Route::get('/plans/{plan}', [KitchenPlanController::class, 'show'])->whereUuid('plan')->name('api.plans.show');
Route::put('/plans/{plan}', [KitchenPlanController::class, 'update'])->whereUuid('plan')->middleware('throttle:30,1')->name('api.plans.update');
