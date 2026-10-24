<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Http;

/**
 * Resolves the trusted REST route from the nginx-supplied _url (GHSA-343m-2899-5qh3).
 *
 * nginx rewrites /pbxcore/* to /pbxcore/index.php?_url=/<normalized-path>, so the
 * first _url in QUERY_STRING is the trusted route. A client-supplied _url (a second
 * query occurrence, or a body field) is an injection attempt and is rejected.
 */
final class TrustedRouteResolver
{
    /**
     * Resolve the absolute route beginning with /pbxcore, or null when the
     * request must be rejected with 400:
     *  - no server-supplied _url (request did not pass through the rewrite),
     *  - more than one _url in the query (client appended their own),
     *  - a _url present in the request body (POST injection),
     *  - a _url value that is not an absolute path.
     *
     * @param string               $queryString Raw $_SERVER['QUERY_STRING'].
     * @param array<string, mixed>  $postParams  Raw $_POST.
     * @return string|null
     */
    public static function resolve(string $queryString, array $postParams): ?string
    {
        $urlValues = self::extractUrlValues($queryString);

        // Exactly one _url is expected (the one nginx injected). Zero or several = reject.
        if (count($urlValues) !== 1) {
            return null;
        }

        // A _url in the body would win in $_REQUEST (request_order=GP); reject it.
        if (array_key_exists('_url', $postParams)) {
            return null;
        }

        $path = $urlValues[0];
        if ($path === '' || $path[0] !== '/') {
            return null;
        }

        return '/pbxcore' . $path;
    }

    /**
     * Collect every _url occurrence from the raw query string, in order.
     *
     * @param string $queryString
     * @return array<int, string>
     */
    private static function extractUrlValues(string $queryString): array
    {
        $values = [];
        foreach (explode('&', $queryString) as $pair) {
            if ($pair === '') {
                continue;
            }
            $eqPos = strpos($pair, '=');
            $rawKey = $eqPos === false ? $pair : substr($pair, 0, $eqPos);
            if (urldecode($rawKey) !== '_url') {
                continue;
            }
            $rawVal = $eqPos === false ? '' : substr($pair, $eqPos + 1);
            // '+' is a space in application/x-www-form-urlencoded query syntax.
            $values[] = urldecode(str_replace('+', '%20', $rawVal));
        }

        return $values;
    }
}
