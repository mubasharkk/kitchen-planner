<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\LayoutShape;
use App\Enums\ProductKind;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SaveKitchenPlanRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'room' => ['required', 'array'],
            'room.width' => ['required', 'numeric', 'between:120,2000'],
            'room.depth' => ['required', 'numeric', 'between:120,2000'],
            'room.height' => ['required', 'numeric', 'between:200,500'],
            'room.shape' => ['required', Rule::enum(LayoutShape::class)],
            'room.leftRunLength' => ['nullable', 'numeric', 'min:0', 'lte:room.depth'],
            'room.rightRunLength' => ['nullable', 'numeric', 'min:0', 'lte:room.depth'],
            'items' => ['present', 'array', 'max:200'],
            'items.*.quantity' => ['required', 'integer', 'between:1,50'],
            'items.*.product' => ['required', 'array'],
            'items.*.product.id' => ['required', 'string', 'max:80'],
            'items.*.product.name' => ['required', 'string', 'max:300'],
            'items.*.product.kind' => ['required', Rule::enum(ProductKind::class)],
            'items.*.product.url' => ['nullable', 'url', 'max:500'],
            'items.*.product.dimensions' => ['required', 'array'],
            'items.*.product.dimensions.width' => ['required', 'numeric', 'between:1,1000'],
            'items.*.product.dimensions.depth' => ['required', 'numeric', 'between:1,1000'],
            'items.*.product.dimensions.height' => ['required', 'numeric', 'between:1,1000'],
            'settings' => ['sometimes', 'array'],
        ];
    }

    /** The validated payload in the shape the model stores. @return array<string, mixed> */
    public function planAttributes(): array
    {
        return [
            'name' => (string) $this->validated('name'),
            'room' => (array) $this->validated('room'),
            'items' => array_values(array_map(static fn (array $item): array => [
                'product' => $item['product'],
                'quantity' => (int) $item['quantity'],
            ], $this->validated('items'))),
            'settings' => (array) $this->input('settings', []),
        ];
    }
}
