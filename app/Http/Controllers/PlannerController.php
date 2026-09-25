<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\KitchenPlan;
use Illuminate\Contracts\View\View;

final class PlannerController extends Controller
{
    public function index(): View
    {
        return view('planner', ['planId' => null]);
    }

    /** A shared plan opens the same planner, preloaded. */
    public function show(KitchenPlan $plan): View
    {
        return view('planner', ['planId' => $plan->id]);
    }
}
