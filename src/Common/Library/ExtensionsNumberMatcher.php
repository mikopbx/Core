<?php

declare(strict_types=1);

namespace MikoPBX\Common\Library;

/**
 * Exact-match candidates for looking a phone number up in the Extensions table.
 *
 * The same number can be stored with either the 7 or the 8 long-distance prefix
 * (an 11-digit mobile typed by an admin vs. the same number reported by a provider),
 * and sometimes without any prefix. A tail LIKE match must not be used on purpose:
 * it also hits unrelated numbers that merely share the last 9 digits - e.g. a client
 * mobile and an employee mobile registered as an external extension - and pins the
 * wrong display name onto the call.
 */
final class ExtensionsNumberMatcher
{
    /**
     * Spellings of the number that mean the same extension and must be matched exactly.
     *
     * @param string $phoneNumber The number as it appears in a CDR or an API request.
     *
     * @return array<string> Digit-only candidates, empty when the input has no digits.
     */
    public static function candidateNumbers(string $phoneNumber): array
    {
        $digits = preg_replace('/\D+/', '', $phoneNumber);
        if ($digits === '' || $digits === null) {
            return [];
        }
        $candidates = [$digits];
        $length = strlen($digits);
        if ($length === 11 && ($digits[0] === '7' || $digits[0] === '8')) {
            // The same number with the other long-distance prefix, and without one.
            $candidates[] = ($digits[0] === '7' ? '8' : '7') . substr($digits, 1);
            $candidates[] = substr($digits, 1);
        } elseif ($length === 10) {
            // A stored 11-digit spelling of a number given without a prefix.
            $candidates[] = '7' . $digits;
            $candidates[] = '8' . $digits;
        }

        return array_values(array_unique($candidates));
    }
}
