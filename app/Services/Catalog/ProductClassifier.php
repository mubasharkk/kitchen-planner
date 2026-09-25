<?php

declare(strict_types=1);

namespace App\Services\Catalog;

use App\Enums\ProductKind;

/**
 * Works out what kind of product a name describes, from English and German
 * IKEA wording. Rules are checked in order, so the specific ones
 * ("base cabinet for sink") come before the general ones ("base cabinet").
 */
final class ProductClassifier
{
    private const CABINET = ['unterschrank', 'base cabinet', 'base cab', 'korpus', 'cabinet'];

    public function classify(string $text): ProductKind
    {
        $t = self::normalise($text);

        return match (true) {
            self::has($t, ['geschirrspueler', 'spuelmaschine', 'dishwasher']) => ProductKind::Dishwasher,
            self::has($t, ['kuehlschrank', 'kuehl gefrier', 'gefrierschrank', 'kuehlgeraet', 'fridge', 'freezer', 'refrigerator']) => ProductKind::Fridge,
            self::has($t, ['dunstabzug', 'abzugshaube', 'wandhaube', 'inselhaube', 'extractor', 'cooker hood', 'wall mounted hood']) => ProductKind::Hood,
            self::has($t, ['kochfeld', 'induktionskochfeld', 'ceranfeld', 'cooktop', 'induction hob']) || self::word($t, 'hob') => ProductKind::Hob,
            self::has($t, self::CABINET) && self::has($t, ['spuele', 'spuelbecken', 'sink']) => ProductKind::Sink,
            self::has($t, ['einbauspuele', 'spuelbecken', 'spuele', 'inset sink', 'sink bowl', 'single bowl', 'double bowl', 'sink']) => ProductKind::SinkBowl,
            self::has($t, ['mischbatterie', 'kuechenmischer', 'wasserhahn', 'armatur', 'mixer tap']) || self::word($t, 'tap') => ProductKind::Tap,
            self::has($t, ['eckwandschrank', 'wall corner', 'corner wall']) || (self::has($t, ['wandschrank', 'wall cabinet']) && self::has($t, [' eck', 'corner'])) => ProductKind::WallCorner,
            self::has($t, ['hochschrank', 'high cabinet', 'tall cabinet']) => ProductKind::Tall,
            self::has($t, ['backofen', 'oven']) => ProductKind::Oven,
            self::has($t, ['wandschrank', 'oberschrank', 'haengeschrank', 'wall cabinet']) => ProductKind::Wall,
            self::has($t, ['eckunterschrank', 'corner base', 'corner cabinet']) => ProductKind::Corner,
            self::has($t, self::CABINET) && self::has($t, ['schublade', 'auszug', 'drawer']) => ProductKind::Drawers,
            self::has($t, ['unterschrank', 'base cabinet']) => ProductKind::Base,
            self::has($t, ['arbeitsplatte', 'worktop', 'countertop', 'benchtop']) => ProductKind::Worktop,
            self::has($t, ['abdeckseite', 'deckseite', 'sockel', 'blende', 'cover panel', 'plinth', 'filler', 'deckpaneel']) => ProductKind::Panel,
            self::has($t, ['griff', 'knauf', 'knob', 'handle']) => ProductKind::Handle,
            self::has($t, ['tuer', 'front', 'door']) => ProductKind::Front,
            default => ProductKind::Other,
        };
    }

    /** Lowercase, umlauts transliterated like IKEA's URL slugs, punctuation to spaces. */
    public static function normalise(string $text): string
    {
        $t = mb_strtolower($text, 'UTF-8');
        $t = strtr($t, ['ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue', 'ß' => 'ss', 'å' => 'a', 'é' => 'e']);
        $t = preg_replace('/[^a-z0-9]+/', ' ', $t) ?? $t;

        return ' '.trim($t).' ';
    }

    /** @param list<string> $needles */
    private static function has(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }

    private static function word(string $haystack, string $word): bool
    {
        return str_contains($haystack, " {$word} ");
    }
}
