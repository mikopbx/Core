<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Tests\Unit\Common\Models;

require_once 'Globals.php';

use MikoPBX\Common\Models\PbxSettings;
use PHPUnit\Framework\TestCase;

class PbxSettingsCacheTest extends TestCase
{
    private const TEST_KEY = PbxSettings::RTP_STUN_SERVER;

    private string $originalValue = '';

    protected function setUp(): void
    {
        parent::setUp();
        $this->originalValue = PbxSettings::getValueByKey(self::TEST_KEY, false);
    }

    protected function tearDown(): void
    {
        $messages = [];
        PbxSettings::setValueByKey(self::TEST_KEY, $this->originalValue, $messages);
        PbxSettings::rebuildCache();
        parent::tearDown();
    }

    public function testClearCacheRebuildsDedicatedPbxSettingsHash(): void
    {
        $messages = [];
        self::assertTrue(PbxSettings::setValueByKey(self::TEST_KEY, 'stale.example.org:3478', $messages));
        PbxSettings::rebuildCache();

        $record = PbxSettings::findFirstByKey(self::TEST_KEY);
        self::assertNotNull($record);

        $connection = $record->getWriteConnection();
        self::assertTrue($connection->execute(
            'UPDATE m_PbxSettings SET value = :value WHERE key = :key',
            [
                'value' => 'fresh.example.org:3478',
                'key' => self::TEST_KEY,
            ]
        ));

        self::assertSame(
            'stale.example.org:3478',
            PbxSettings::getValueByKey(self::TEST_KEY),
            'Precondition: cached hash should still contain the stale value before explicit cache clear.'
        );

        PbxSettings::clearCache(PbxSettings::class);

        self::assertSame(
            'fresh.example.org:3478',
            PbxSettings::getValueByKey(self::TEST_KEY),
            'PbxSettings::clearCache() must rebuild the dedicated Redis hash from m_PbxSettings.'
        );
    }

    public function testModelEventClearCacheUsesPbxSettingsOverride(): void
    {
        $messages = [];
        self::assertTrue(PbxSettings::setValueByKey(self::TEST_KEY, 'event-stale.example.org:3478', $messages));
        PbxSettings::rebuildCache();

        $record = PbxSettings::findFirstByKey(self::TEST_KEY);
        self::assertNotNull($record);
        $record->value = 'event-fresh.example.org:3478';
        self::assertTrue($record->update());

        self::assertSame(
            'event-fresh.example.org:3478',
            PbxSettings::getValueByKey(self::TEST_KEY),
            'PbxSettings afterSave must dispatch to PbxSettings::clearCache() and rebuild the dedicated Redis hash.'
        );
    }
}
