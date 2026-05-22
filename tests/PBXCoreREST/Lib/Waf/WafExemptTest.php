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

declare(strict_types=1);

namespace MikoPBX\Tests\PBXCoreREST\Lib\Waf;

use InvalidArgumentException;
use MikoPBX\PBXCoreREST\Lib\Waf\Attributes\WafExempt;
use PHPUnit\Framework\TestCase;

/**
 * Validates the construction-time scope check on the WafExempt attribute.
 *
 * Pure unit tests — no DI, no Redis, no reflection of real controllers.
 */
class WafExemptTest extends TestCase
{
    public function testAcceptsAllAllowedScopes(): void
    {
        $exempt = new WafExempt(scopes: ['body-scan', 'request-line', 'rate-limit']);
        $this->assertSame(['body-scan', 'request-line', 'rate-limit'], $exempt->scopes);
    }

    public function testAcceptsSingleScope(): void
    {
        $exempt = new WafExempt(scopes: ['body-scan'], reason: 'accepts SQL in body');
        $this->assertSame(['body-scan'], $exempt->scopes);
        $this->assertSame('accepts SQL in body', $exempt->reason);
    }

    public function testReasonDefaultsToEmptyString(): void
    {
        $exempt = new WafExempt(scopes: ['rate-limit']);
        $this->assertSame('', $exempt->reason);
    }

    public function testEmptyScopesIsRejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('at least one scope');
        new WafExempt(scopes: []);
    }

    public function testUnknownScopeIsRejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('unknown scope');
        // 'request-raw' is intentionally not exposed in v1 (see RFC §3.1).
        new WafExempt(scopes: ['body-scan', 'request-raw']);
    }

    public function testCompletelyInvalidScopeIsRejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        new WafExempt(scopes: ['firewall-bypass']);
    }

    public function testAllowedScopesConstantIsTheSourceOfTruth(): void
    {
        $this->assertSame(
            ['body-scan', 'request-line', 'rate-limit'],
            WafExempt::ALLOWED_SCOPES,
            'WAF allowed scopes have changed — update the Lua scope_exempt() callers '
            . 'and the RFC §3.1 table accordingly.'
        );
    }
}
