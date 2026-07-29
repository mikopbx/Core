#!/usr/bin/php
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Core\Asterisk\AGI;
use MikoPBX\Core\System\SystemMessages;

require_once 'Globals.php';

// Shared regex extractor for DID and CallerID parsing. Asterisk's REGEX() dialplan function
// only tests for a match (returns 1/0); it cannot extract a substring. This AGI applies PCRE
// to a source channel variable and writes the captured value into a destination variable.
//
//   ARG1 = base64-encoded regex (encoded so dialplan-special characters in the pattern —
//          the comma in {10,11}, semicolons, quotes — survive the extensions.conf parser)
//   ARG2 = source channel variable to read (e.g. tmpDidHeader / tmpCidHeader)
//   ARG3 = destination channel variable to write (e.g. didNum / fromCid)
$regex  = base64_decode($argv[1] ?? '', true);
$srcVar = $argv[2] ?? '';
$dstVar = $argv[3] ?? '';

$agi = new AGI();

if ($dstVar === '') {
    SystemMessages::sysLogMsg('ExtractDidCid', 'Missing destination variable argument', LOG_WARNING);
    exit;
}

// Always reset the target variable so a failed match never reuses a stale value.
$agi->set_variable($dstVar, '');

if ($regex === false || $regex === '' || $srcVar === '') {
    SystemMessages::sysLogMsg('ExtractDidCid', 'Empty or invalid base64 regex / source argument', LOG_WARNING);
    exit;
}

// The header value is read from the channel rather than passed as an AGI argument so that
// untrusted, comma-bearing header contents never get split across argv.
$header = (string)$agi->get_variable($srcVar, true);
if ($header === '') {
    exit;
}

// The header is attacker-controlled (it comes from the inbound SIP message). Bound its
// length before matching so a pathological admin regex cannot be driven into catastrophic
// backtracking (ReDoS) that stalls call setup. A DID/CID never needs more than this prefix.
const MAX_HEADER_LENGTH = 256;
if (strlen($header) > MAX_HEADER_LENGTH) {
    $header = substr($header, 0, MAX_HEADER_LENGTH);
}

// PCRE needs delimiters; escape the chosen delimiter inside the user-supplied pattern. A
// pattern ending in a dangling backslash escapes the closing delimiter and fails to
// compile — that is reported below and treated as "no match" (fail-safe), never as a match.
$pattern = '#' . str_replace('#', '\#', $regex) . '#';
$matches = [];
if (@preg_match($pattern, $header, $matches) !== 1) {
    if (preg_last_error() !== PREG_NO_ERROR) {
        SystemMessages::sysLogMsg('ExtractDidCid', "Invalid regex '{$regex}': " . preg_last_error_msg(), LOG_WARNING);
    }
    exit;
}

// Prefer the first capture group when it actually participated in the match, otherwise the
// whole match. Note: ?? only guards against an unset group, so an optional group that matched
// empty ($matches[1] === '') must fall back to $matches[0] explicitly.
$value = (isset($matches[1]) && $matches[1] !== '') ? $matches[1] : $matches[0];

// Defense in depth: the value is interpolated into a dialplan Goto extension (DID) or a
// Set(CALLERID(...)) (CID). Reject anything outside the inbound-extension charset so an
// attacker-controlled header cannot inject a comma/newline that splits the dialplan
// arguments. The DID dialplan guard re-checks this, but keeping the AGI self-contained
// avoids trusting a single layer. The /D modifier is required so $ does not match before a
// trailing newline (without it "123\n" would pass and corrupt the channel variable).
if (preg_match('/^[0-9*#+a-zA-Z]+$/D', $value) !== 1) {
    if ($value !== '') {
        SystemMessages::sysLogMsg('ExtractDidCid', "Discarded value with unexpected characters: '{$value}'", LOG_WARNING);
    }
    exit;
}

$agi->set_variable($dstVar, $value);
