<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\KitchenPlan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class PlannerApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // The page tests shouldn't need a frontend build.
        $this->withoutVite();
    }

    /** @return array<string, mixed> */
    private function payload(): array
    {
        return [
            'name' => 'Berlin flat',
            'room' => ['width' => 360, 'depth' => 280, 'height' => 250, 'shape' => 'L', 'leftRunLength' => 200],
            'items' => [[
                'quantity' => 2,
                'product' => [
                    'id' => 'ikea-09455629',
                    'name' => 'METOD Wandschrank 40x80',
                    'kind' => 'wall',
                    'url' => 'https://www.ikea.com/de/de/p/metod-wandschrank-s09455629/',
                    'dimensions' => ['width' => 40, 'depth' => 37, 'height' => 80],
                ],
            ]],
            'settings' => ['front' => 'green', 'autofill' => true],
        ];
    }

    public function test_the_catalog_lists_standard_items_and_finishes(): void
    {
        $this->getJson('/api/catalog')
            ->assertOk()
            ->assertJsonPath('currency', 'EUR')
            ->assertJsonPath('items.0.source', 'catalog')
            ->assertJsonPath('items.0.priceIsEstimate', true)
            ->assertJsonStructure(['finishes' => ['fronts', 'worktops', 'handles', 'floors']]);
    }

    public function test_catalog_items_say_which_kitchen_series_they_belong_to(): void
    {
        $items = collect($this->getJson('/api/catalog')->assertOk()->json('items'));

        $this->assertSame('metod', $items->firstWhere('name', 'METOD base cabinet with door 20x60')['series']);
        $this->assertSame('knoxhult', $items->firstWhere('name', 'KNOXHULT base cabinet with drawers 40x60')['series']);
        $this->assertNull($items->firstWhere('name', 'Integrated dishwasher 60 cm')['series']);
    }

    public function test_the_planner_page_renders(): void
    {
        $this->get('/')->assertOk()->assertSee('id="app"', false);
    }

    public function test_a_plan_can_be_saved_loaded_and_updated(): void
    {
        $id = $this->postJson('/api/plans', $this->payload())
            ->assertCreated()
            ->assertJsonPath('name', 'Berlin flat')
            ->json('id');

        $this->assertDatabaseHas('kitchen_plans', ['id' => $id, 'name' => 'Berlin flat']);

        $this->getJson("/api/plans/{$id}")
            ->assertOk()
            ->assertJsonPath('room.shape', 'L')
            ->assertJsonPath('items.0.quantity', 2)
            ->assertJsonPath('settings.front', 'green');

        $this->putJson("/api/plans/{$id}", [...$this->payload(), 'name' => 'Berlin flat v2'])
            ->assertOk()
            ->assertJsonPath('id', $id)
            ->assertJsonPath('name', 'Berlin flat v2');
    }

    public function test_a_saved_plan_opens_in_the_planner(): void
    {
        $plan = KitchenPlan::factory()->withProduct()->create();

        $this->get("/plans/{$plan->id}")->assertOk()->assertSee($plan->id);
        $this->getJson("/api/plans/{$plan->id}")->assertOk()->assertJsonPath('items.0.product.kind', 'wall');
    }

    public function test_invalid_plans_are_rejected(): void
    {
        $this->postJson('/api/plans', ['name' => 'x', 'room' => ['width' => 50, 'depth' => 280, 'height' => 250, 'shape' => 'Z'], 'items' => []])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['room.width', 'room.shape']);

        $this->getJson('/api/plans/not-a-uuid')->assertNotFound();
        $this->getJson('/api/plans/'.fake()->uuid())->assertNotFound();
    }
}
