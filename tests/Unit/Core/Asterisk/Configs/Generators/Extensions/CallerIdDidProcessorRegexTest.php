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

namespace MikoPBX\Tests\Unit\Core\Asterisk\Configs\Generators\Extensions;

require_once 'Globals.php';

use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\CallerIdDidProcessor;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for the regex DID parser of CallerIdDidProcessor.
 *
 * Regression guard for the bug where the generated dialplan used Asterisk's REGEX()
 * function to *extract* a DID. REGEX() only returns 1/0 (match/no-match), so didNum
 * was set to "1" instead of the actual number. Extraction is now delegated to the
 * extract_did_cid.php AGI, with the pattern passed base64-encoded so dialplan-special
 * characters in it survive the extensions.conf parser.
 *
 * @package MikoPBX\Tests\Unit\Core\Asterisk\Configs\Generators\Extensions
 */
class CallerIdDidProcessorRegexTest extends TestCase
{
    /**
     * Build a processor configured for custom-header DID extraction via regex.
     *
     * @param string $regex The DID parser regex value
     * @return string Generated dialplan context
     */
    private function generateForRegex(string $regex): string
    {
        $processor = new CallerIdDidProcessor('SIP-TRUNK-TEST', [
            'did_source'       => Sip::DID_SOURCE_CUSTOM,
            'did_custom_header' => 'X-ES-R',
            'did_parser_regex' => $regex,
        ]);

        return $processor->generateIncomingProcessingContext();
    }

    /**
     * The regex branch must NOT emit Asterisk's REGEX() function, which cannot extract.
     */
    public function testRegexBranchDoesNotUseAsteriskRegexFunction(): void
    {
        $dialplan = $this->generateForRegex('[0-9]{10,11}');

        $this->assertStringNotContainsString(
            'Set(didNum=${REGEX(',
            $dialplan,
            'REGEX() returns 1/0 and cannot extract a substring; it must not be used to set didNum.'
        );
    }

    /**
     * The regex branch must call the extract_did_cid.php AGI with the base64-encoded pattern
     * plus the source/destination channel variables.
     */
    public function testRegexBranchEmitsAgiWithEncodedPattern(): void
    {
        $regex    = '[0-9]{10,11}';
        $dialplan = $this->generateForRegex($regex);
        $encoded  = base64_encode($regex);

        $this->assertStringContainsString(
            "AGI(extract_did_cid.php,{$encoded},tmpDidHeader,didNum)",
            $dialplan,
            'Regex extraction must be delegated to the extract_did_cid.php AGI.'
        );
        $this->assertSame(
            $regex,
            base64_decode($encoded),
            'The encoded argument must round-trip back to the original regex.'
        );
    }

    /**
     * The encoded AGI argument must contain no comma, otherwise Asterisk would split the
     * regex (e.g. "[0-9]{10,11}") across two AGI arguments and corrupt the pattern. This
     * is exactly why the delimiter (";") and raw-regex approaches failed in extensions.conf.
     */
    public function testEncodedRegexArgumentHasNoDialplanSpecialChars(): void
    {
        // {10,11} contains a comma; a ';'-terminated value contains the comment char.
        $regex   = '(\d{10,11});privind';
        $encoded = base64_encode($regex);

        $this->assertStringNotContainsString(',', $encoded, 'base64 output must not contain commas (AGI arg separator).');
        $this->assertStringNotContainsString(';', $encoded, 'base64 output must not contain semicolons (dialplan comment char).');

        $dialplan = $this->generateForRegex($regex);
        $this->assertStringContainsString("AGI(extract_did_cid.php,{$encoded},tmpDidHeader,didNum)", $dialplan);
    }

    /**
     * The redirect Goto must target the provider's full incoming context, not a truncated
     * one. The old code used ${CUT(CONTEXT,-,1-2)}, which assumes a 2-segment provider id
     * and produced "SIP-TRUNK" instead of "SIP-TRUNK-TEST-incoming" for multi-segment ids.
     */
    public function testRedirectGotoTargetsFullProviderIncomingContext(): void
    {
        $dialplan = $this->generateForRegex('[0-9]{10,11}');

        $this->assertStringNotContainsString(
            'CUT(CONTEXT',
            $dialplan,
            'Provider id is known at generation time; the runtime CUT(CONTEXT,...) is fragile and must be removed.'
        );
        $this->assertStringContainsString(
            'Goto(SIP-TRUNK-TEST-incoming,${didNum},1)',
            $dialplan,
            'Redirect must go to the full {providerId}-incoming context.'
        );
    }

    /**
     * The redirect Goto must be guarded by a FILTER() charset check so an attacker-influenced
     * extracted value containing a comma/newline cannot split the Goto arguments and reroute
     * the call into an arbitrary context/extension.
     */
    public function testRedirectGotoIsGuardedByCharsetFilter(): void
    {
        $dialplan = $this->generateForRegex('[0-9]{10,11}');

        $this->assertStringContainsString(
            '${FILTER(0-9a-zA-Z*#+,${didNum})}" == "${didNum}"',
            $dialplan,
            'Goto must only fire when didNum contains only inbound-extension characters.'
        );
    }

    /**
     * The CallerID regex parser must use the same AGI (writing fromCid) and never Asterisk's
     * REGEX(), which has the identical "returns 1/0, cannot extract" bug as the DID path.
     */
    public function testCallerIdRegexBranchEmitsAgiAndAvoidsRegexFunction(): void
    {
        $regex     = '\+?([0-9]{10,11})';
        $processor = new CallerIdDidProcessor('SIP-TRUNK-TEST', [
            'cid_source'        => Sip::CALLERID_SOURCE_CUSTOM,
            'cid_custom_header' => 'P-Asserted-Identity',
            'cid_parser_regex'  => $regex,
        ]);
        $dialplan = $processor->generateIncomingProcessingContext();
        $encoded  = base64_encode($regex);

        $this->assertStringNotContainsString(
            'Set(fromCid=${REGEX(',
            $dialplan,
            'REGEX() returns 1/0 and cannot extract; it must not be used to set fromCid.'
        );
        $this->assertStringContainsString(
            "AGI(extract_did_cid.php,{$encoded},tmpCidHeader,fromCid)",
            $dialplan,
            'CallerID regex extraction must be delegated to the extract_did_cid.php AGI.'
        );
    }

    /**
     * Sanity check that the PCRE pattern the AGI builds extracts the expected DID from a
     * realistic X-ES-R header value, and that an optional non-participating capture group
     * falls back to the whole match rather than yielding an empty string. Mirrors the
     * extraction logic in extract_did_cid.php.
     */
    public function testExtractionLogicReturnsDidFromRealHeader(): void
    {
        $header = 'rnum=+79037986353;privind=f;ri=3;orr=3;rc=1;rr=3;rid=0';
        $regex  = '[0-9]{10,11}';

        $pattern = '#' . str_replace('#', '\#', $regex) . '#';
        $matches = [];
        $this->assertSame(1, preg_match($pattern, $header, $matches));

        // Replicates extract_did_cid.php: prefer group 1 only when it participated.
        $value = (isset($matches[1]) && $matches[1] !== '') ? $matches[1] : $matches[0];
        $this->assertSame('79037986353', $value);

        // A leading group that participates but matches the empty string ($matches[1] === '')
        // must fall back to the whole match, not blank out the result. This is the #2 fix:
        // `$matches[1] ?? $matches[0]` alone would return the empty string here.
        $matches2 = [];
        $this->assertSame(1, preg_match('#(a*)([0-9]{10,11})#', $header, $matches2));
        $this->assertSame('', $matches2[1], 'precondition: leading group participated and matched empty');
        $value2 = (isset($matches2[1]) && $matches2[1] !== '') ? $matches2[1] : $matches2[0];
        $this->assertSame('79037986353', $value2);
    }

    /**
     * The AGI value whitelist must use the /D modifier so a trailing newline cannot pass
     * (without /D, "$" matches before a final "\n" and a corrupt value reaches the channel).
     */
    public function testValueWhitelistRejectsTrailingNewline(): void
    {
        $whitelist = '/^[0-9*#+a-zA-Z]+$/D';
        $this->assertSame(0, preg_match($whitelist, "79037986353\n"), 'trailing newline must be rejected');
        $this->assertSame(1, preg_match($whitelist, '79037986353'), 'clean digits must pass');
        $this->assertSame(0, preg_match($whitelist, '1,evil-ctx,1'), 'comma must be rejected');
    }
}
