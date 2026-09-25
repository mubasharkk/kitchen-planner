<?php

declare(strict_types=1);

namespace App\Data;

use InvalidArgumentException;

final readonly class Money
{
    public function __construct(
        public float $amount,
        public string $currency = 'EUR',
    ) {
        if ($amount < 0) {
            throw new InvalidArgumentException('A price cannot be negative.');
        }
        if (! preg_match('/^[A-Z]{3}$/', $currency)) {
            throw new InvalidArgumentException("Unknown currency code: {$currency}");
        }
    }

    /** Parse "1.234,56", "1,234.56", "249" or "249.–" into a Money. */
    public static function parse(string|int|float|null $amount, ?string $currency = 'EUR'): ?self
    {
        if ($amount === null || $amount === '') {
            return null;
        }
        if (is_int($amount) || is_float($amount)) {
            return $amount > 0 ? new self((float) $amount, $currency ?: 'EUR') : null;
        }

        $clean = preg_replace('/[^\d.,]/', '', $amount) ?? '';
        $clean = rtrim($clean, '.,');
        if ($clean === '') {
            return null;
        }

        $lastComma = strrpos($clean, ',');
        $lastDot = strrpos($clean, '.');
        if ($lastComma !== false && ($lastDot === false || $lastComma > $lastDot)) {
            // German style: dots group thousands, comma marks decimals.
            $clean = str_replace(['.', ','], ['', '.'], $clean);
        } else {
            $clean = str_replace(',', '', $clean);
        }

        $value = (float) $clean;

        return $value > 0 ? new self($value, strtoupper($currency ?: 'EUR')) : null;
    }

    /** @return array{amount: float, currency: string} */
    public function toArray(): array
    {
        return ['amount' => round($this->amount, 2), 'currency' => $this->currency];
    }
}
