<?php

use App\Http\Controllers\PlannerController;
use Illuminate\Support\Facades\Route;

Route::get('/', [PlannerController::class, 'index'])->name('planner');
Route::get('/plans/{plan}', [PlannerController::class, 'show'])->whereUuid('plan')->name('planner.plan');
