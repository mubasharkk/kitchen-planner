<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\KitchenPlan;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin KitchenPlan */
final class KitchenPlanResource extends JsonResource
{
    /** The planner reads these fields at the top level, so don't wrap them in "data". */
    public static $wrap = null;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'room' => $this->room,
            'items' => $this->items,
            'settings' => (object) $this->settings,
            'createdAt' => $this->created_at?->toAtomString(),
        ];
    }
}
