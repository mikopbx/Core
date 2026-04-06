<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Tests\AdminCabinet\Tests;

use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;
use MikoPBX\Tests\AdminCabinet\Tests\Traits\IncomingCallRulesTrait;

/**
 * Base class for Incoming Call Rules creation tests
 */
abstract class CreateIncomingCallRuleTest extends MikoPBXTestsBase
{
    use IncomingCallRulesTrait;
    private static bool $isTableCleared = false;

    protected function setUp(): void
    {
        parent::setUp();
        if (!self::$isTableCleared) {
            $this->clearIncomingRules();
            self::$isTableCleared = true;
        }

        $data = $this->getRuleData();
        $this->setSessionName("Test: Create Incoming Call Rule - " . $data['rulename']);
    }

    /**
     * Clear incoming rules table
     */
    protected function clearIncomingRules(): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->deleteAllRecordsOnTable('routingTable');
    }

    /**
     * Get rule data
     */
    abstract protected function getRuleData(): array;

    /**
     * Test creating incoming call rule
     */
    public function testCreateIncomingCallRule(): void
    {
        $params = $this->getRuleData();
        self::annotate("Creating incoming call rule: " . $this->getRuleDescription($params));

        try {
            $this->createRule($params);
            $this->verifyRule($params);
            self::annotate("Successfully created incoming call rule", 'success');
        } catch (\Exception $e) {
            self::annotate("Failed to create incoming call rule", 'error');
            throw $e;
        }
    }

    /**
     * Create incoming call rule
     */
    protected function createRule(array $params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->clickButtonByHref('/admin-cabinet/incoming-routes/modify');

        $this->fillBasicInfo($params);
        $this->submitForm('incoming-route-form');
    }

    /**
     * Verify rule creation
     */
    protected function verifyRule(array $params): void
    {
        $id = $this->getCurrentRecordID();

        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->clickModifyButtonOnRowWithID($id);

        $this->verifyRuleConfig($params);
    }
}
