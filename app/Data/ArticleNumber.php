<?php

declare(strict_types=1);

namespace App\Data;

use InvalidArgumentException;

/**
 * An IKEA article number: eight digits, shown as 123.456.78. Combinations
 * (a cabinet sold with its doors) carry an "S" prefix in IKEA's URLs.
 */
final readonly class ArticleNumber
{
    private function __construct(
        public string $digits,
        public bool $isCombination,
    ) {}

    public static function fromString(string $value): self
    {
        $trimmed = strtolower(trim($value));
        $isCombination = str_starts_with($trimmed, 's');
        $digits = preg_replace('/\D/', '', $trimmed) ?? '';

        if (strlen($digits) !== 8) {
            throw new InvalidArgumentException("Not an IKEA article number: {$value}");
        }

        return new self($digits, $isCombination);
    }

    public static function tryFromString(?string $value): ?self
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return self::fromString($value);
        } catch (InvalidArgumentException) {
            return null;
        }
    }

    public function formatted(): string
    {
        return sprintf('%s.%s.%s', substr($this->digits, 0, 3), substr($this->digits, 3, 3), substr($this->digits, 6, 2));
    }

    public function equals(self $other): bool
    {
        return $this->digits === $other->digits;
    }

    public function __toString(): string
    {
        return $this->formatted();
    }
}
