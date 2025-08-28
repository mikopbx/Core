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
use MikoPBX\Tests\AdminCabinet\Tests\Traits\OutgoingCallRulesTrait;

abstract class CreateOutgoingCallRuleTest extends MikoPBXTestsBase
{
    use OutgoingCallRulesTrait;
    private static bool $isTableCleared = false;

    protected function setUp(): void
    {
        parent::setUp();
        if (!self::$isTableCleared) {
            $this->clearOutgoingRules();
            self::$isTableCleared = true;
        }

        $data = $this->getRuleData();
        $this->setSessionName("Test: Create Outgoing Call Rule - " . $data['rulename']);
    }

    /**
     * Clear outgoing rules table
     */
    protected function clearOutgoingRules(): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/outbound-routes/index/');
        $this->deleteAllRecordsOnTable('routingTable');
    }

    /**
     * Get rule data
     */
    abstract protected function getRuleData(): array;

    /**
     * Test creating outgoing call rule
     */
    public function testCreateOutgoingCallRule(): void
    {
        $params = $this->getRuleData();
        self::annotate("Creating outgoing call rule: " . $this->getRuleDescription($params));

        try {
            $this->createRule($params);
            $this->verifyRule($params);
            self::annotate("Successfully created outgoing call rule", 'success');
        } catch (\Exception $e) {
            self::annotate("Failed to create outgoing call rule", 'error');
            throw $e;
        }
    }

    /**
     * Create outgoing call rule
     */
    protected function createRule(array $params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/outbound-routes/index/');
        
        // Try to delete existing rule with the same name if it exists
        $this->clickDeleteButtonOnRowWithText($params['rulename']);
       

        $this->clickButtonByHref('/admin-cabinet/outbound-routes/modify');
        $this->fillRuleInfo($params);

        $this->submitForm('outbound-route-form');
    }

    /**
     * Verify rule creation
     */
    protected function verifyRule(array $params): void
    {
        $id = $this->getCurrentRecordID();

        $this->clickSidebarMenuItemByHref('/admin-cabinet/outbound-routes/index/');
        $this->clickModifyButtonOnRowWithID($id);

        $this->verifyRuleConfig($params);
    }
}
