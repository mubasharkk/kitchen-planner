<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ResolveProductLinksRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        $max = (int) config('kitchen.ikea.max_links_per_request', 40);

        return [
            'urls' => ['required', 'array', 'min:1', "max:{$max}"],
            'urls.*' => ['required', 'string', 'max:500'],
        ];
    }

    /** @return list<string> */
    public function urls(): array
    {
        return array_values(array_map('strval', $this->validated('urls')));
    }
}
