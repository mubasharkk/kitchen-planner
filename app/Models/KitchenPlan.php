<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\KitchenPlanFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A saved kitchen: the room, the products the customer brought and their
 * choices. The layout itself is recomputed from these in the browser, so it
 * always matches the current engine.
 *
 * @property string $id
 * @property string $name
 * @property array<string, mixed> $room
 * @property list<array{product: array<string, mixed>, quantity: int}> $items
 * @property array<string, mixed> $settings
 */
class KitchenPlan extends Model
{
    /** @use HasFactory<KitchenPlanFactory> */
    use HasFactory, HasUuids;

    protected $fillable = ['name', 'room', 'items', 'settings'];

    protected function casts(): array
    {
        return [
            'room' => 'array',
            'items' => 'array',
            'settings' => 'array',
        ];
    }
}
