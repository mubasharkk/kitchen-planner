<?php

declare(strict_types=1);

namespace App\Exceptions;

use DomainException;

final class UnsupportedProductLink extends DomainException
{
    public static function because(string $url, string $reason): self
    {
        return new self("{$reason}: {$url}");
    }
}
