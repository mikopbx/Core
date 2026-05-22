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

use MikoPBX\PBXCoreREST\Lib\Waf\WafRegistry;
use PHPUnit\Framework\TestCase;

/**
 * Verifies that {@see WafRegistry::collectCore()} actually finds the four
 * Core controllers carrying `#[WafExempt]` after Step 2 of the rollout
 * (system:executeSqlRequest, system:executeBashCommand, dialplan-applications,
 * custom-files). Acts as a regression guard if any of those attributes
 * is later moved or removed.
 *
 * No DI container is constructed — `collectCore()` is reflection-only and
 * does not touch Redis.
 */
class WafRegistryTest extends TestCase
{
    private WafRegistry $registry;

    protected function setUp(): void
    {
        parent::setUp();
        // collectCore() reflects every REST controller, which extends
        // Phalcon\Mvc\Controller through BaseRestController. Loading those
        // classes requires the ext-phalcon extension to be available in CLI.
        // Skip cleanly when the extension is not loaded so the suite still
        // runs on development hosts without Phalcon installed.
        if (!extension_loaded('phalcon')) {
            $this->markTestSkipped(
                'ext-phalcon is required to reflect REST controllers. '
                . 'Run inside the mikopbx-php83 container or install ext-phalcon locally.'
            );
        }
        // collectCore() is pure reflection; Di is needed only for Redis access.
        // Pass null to keep the test free of DI / Phalcon dependencies for
        // unit testing.
        $this->registry = new WafRegistry(null);
    }

    public function testCollectCoreReturnsExpectedCoreExemptions(): void
    {
        $entries = $this->registry->collectCore();
        $uris = array_keys($entries);

        $expected = [
            '/pbxcore/api/v3/system:executeSqlRequest',
            '/pbxcore/api/v3/system:executeBashCommand',
            '/pbxcore/api/v3/dialplan-applications',
            '/pbxcore/api/v3/custom-files',
        ];

        foreach ($expected as $uri) {
            $this->assertContains(
                $uri,
                $uris,
                sprintf(
                    'Core WAF exemption for %s is missing — its #[WafExempt] attribute '
                    . 'must be re-added or its URI mapping has changed.',
                    $uri
                )
            );
            $this->assertSame(
                ['body-scan'],
                $entries[$uri]['scopes'],
                sprintf('Expected only body-scan scope on %s', $uri)
            );
            $this->assertSame(
                WafRegistry::CORE_OWNER,
                $entries[$uri]['owner'],
                sprintf('Expected owner "core" on %s', $uri)
            );
        }
    }

    public function testCollectCoreDoesNotProduceDuplicates(): void
    {
        $entries = $this->registry->collectCore();
        $this->assertSame(
            count($entries),
            count(array_unique(array_keys($entries))),
            'collectCore() must not return duplicate URIs'
        );
    }

}
