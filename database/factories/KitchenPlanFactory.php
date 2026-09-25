<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\KitchenPlan;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<KitchenPlan> */
final class KitchenPlanFactory extends Factory
{
    protected $model = KitchenPlan::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'name' => fake()->streetName().' kitchen',
            'room' => [
                'width' => fake()->numberBetween(240, 480),
                'depth' => fake()->numberBetween(240, 420),
                'height' => 250,
                'shape' => fake()->randomElement(['I', 'L', 'U', 'galley']),
                'leftRunLength' => null,
                'rightRunLength' => null,
            ],
            'items' => [],
            'settings' => ['autofill' => true, 'front' => 'white', 'worktop' => 'oak', 'handle' => 'steel'],
        ];
    }

    /** A plan with one linked IKEA product. */
    public function withProduct(): self
    {
        return $this->state(fn (): array => ['items' => [[
            'quantity' => 1,
            'product' => [
                'id' => 'ikea-09455629',
                'name' => 'METOD Wandschrank mit Böden, weiß/Veddinge weiß, 40x80 cm',
                'kind' => 'wall',
                'url' => 'https://www.ikea.com/de/de/p/metod-wandschrank-s09455629/',
                'dimensions' => ['width' => 40, 'depth' => 37, 'height' => 80],
            ],
        ]]]);
    }
}
