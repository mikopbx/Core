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

namespace MikoPBX\Tests\AdminCabinet\Tests;

use Facebook\WebDriver\WebDriverBy;
use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

/**
 * Class to test the creation and deletion of firewall rules in the admin cabinet.
 */
class CreateFirewallRulesTest extends MikoPBXTestsBase
{
    /**
     * Set up before each test
     *
     * @throws GuzzleException
     * @throws \Exception
     */
    public function setUp(): void
    {
        parent::setUp();
        $this->setSessionName("Test: Changing Firewall rules");
    }

    /**
     * Test the deletion of all firewall rules.
     * @depends testLogin
     */
    public function testDeleteAllFirewallRules(): void
    {
        $this->clickSidebarMenuItemByHref("/admin-cabinet/firewall/index/");
        $tableId = 'firewall-table';
        $this->deleteAllRecordsOnTable($tableId);
        $xpath = "//table[@id='{$tableId}']//a[contains(@href,'delete') and not(contains(@class,'disabled'))]";
        $this->assertElementNotFound(WebDriverBy::xpath($xpath));
    }

    /**
     * Test the creation and modification of firewall rules.
     *
     * @depends testDeleteAllFirewallRules
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for creating the rule.
     */
    public function testFirewallRule(array $params): void
    {
        $this->clickSidebarMenuItemByHref("/admin-cabinet/firewall/index/");
        $this->clickButtonByHref('/admin-cabinet/firewall/modify');
        $this->changeInputField('description', $params['description']);
        $this->changeInputField('network', $params['network']);
        $this->selectDropdownItem('subnet', $params['subnet']);

        foreach ($params['rules'] as $key => $value) {
            $this->changeCheckBoxState('rule_' . $key, $value);
        }
        $this->changeCheckBoxState('local_network', $params['local_network']);
        $this->changeCheckBoxState('newer_block_ip', $params['newer_block_ip']);

        $this->submitForm('firewall-form');

        // Remember the ID
        $id = $this->getCurrentRecordID();
        $this->clickSidebarMenuItemByHref('/admin-cabinet/firewall/index/');
        $this->clickModifyButtonOnRowWithID($id);

        // Assert the rule parameters
        $this->assertInputFieldValueEqual('description', $params['description']);
        $this->assertInputFieldValueEqual('network', $params['network']);
        $this->assertMenuItemSelected('subnet', $params['subnet']);

        foreach ($params['rules'] as $key => $value) {
            $this->assertCheckBoxStageIsEqual('rule_' . $key, $value);
        }
        $this->assertCheckBoxStageIsEqual('local_network', $params['local_network']);
        $this->assertCheckBoxStageIsEqual('newer_block_ip', $params['newer_block_ip']);
    }

    /**
     * Dataset provider for firewall rule creation parameters.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params['MikoNetwork'] = [
            [
                'description' => 'MikoNetwork',
                'network' => '172.16.32.0',
                'subnet' => 24,
                'local_network' => true,
                'newer_block_ip' => true,
                'rules' => [
                    'SIP' => true,
                    'WEB' => true,
                    'SSH' => true,
                    'AMI' => true,
                    'AJAM' => true,
                    'ICMP' => true,
                ],
            ]
        ];
        $params['Nikolay macbook'] = [
            [
                'description' => 'Nikolay macbook',
                'network' => '172.16.32.69',
                'subnet' => 32,
                'local_network' => true,
                'newer_block_ip' => true,
                'rules' => [
                    'SIP' => true,
                    'WEB' => true,
                    'SSH' => true,
                    'AMI' => true,
                    'AJAM' => true,
                    'ICMP' => true,
                ],
            ]
        ];
        $params['MIKOVPN'] = [
            [
                'description' => 'MIKOVPN',
                'network' => '172.16.34.0',
                'subnet' => 24,
                'local_network' => true,
                'newer_block_ip' => true,
                'rules' => [
                    'SIP' => true,
                    'WEB' => false,
                    'SSH' => false,
                    'AMI' => false,
                    'AJAM' => false,
                    'ICMP' => true,
                ],
            ]
        ];
        return $params;
    }
}