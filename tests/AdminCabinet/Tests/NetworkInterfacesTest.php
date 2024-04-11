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
 * Class NetworkInterfacesTest
 * This class contains test cases related to network interfaces.
 */
class NetworkInterfacesTest extends MikoPBXTestsBase
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
        $this->setSessionName("Test: Add new VLAN with settings");
    }

    /**
     * Test adding a new VLAN configuration.
     *
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for configuring a new VLAN.
     */
    public function testAddNewVLAN(array $params): void
    {
        // Click on the network modification page in the admin cabinet.
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");

        // Change to the appropriate tab on the current page.
        $this->changeTabOnCurrentPage('0');

        // Set various network configuration parameters.
        $this->selectDropdownItem('interface_0', $params['interface_0']);
        $this->changeInputField('name_0', $params['name_0']);
        $this->changeCheckBoxState('dhcp_0', $params['dhcp_0']);
        $this->changeInputField('ipaddr_0', $params['ipaddr_0']);
        $this->selectDropdownItem('subnet_0', $params['subnet_0']);
        $this->changeInputField('vlanid_0', $params['vlanid_0']);
        $this->selectDropdownItem('internet_interface', $params['internet_interface']);
        $this->changeInputField('gateway', $params['gateway']);
        $this->changeInputField('primarydns', $params['primarydns']);
        $this->changeInputField('secondarydns', $params['secondarydns']);
        $this->changeCheckBoxState('usenat', $params['usenat']);
        $this->changeInputField('extipaddr', $params['extipaddr']);
        $this->changeInputField('exthostname', $params['exthostname']);

        // Submit the network form.
        $this->submitForm('network-form');

        // Click on the network modification page again.
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");

        // Click on the newly created VLAN tab.
        $xpath = "//div[@id='eth-interfaces-menu']/a[contains(text(),'{$params['name_0']}')]";
        $newTab = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $newTab->click();
        $index = $newTab->getAttribute('data-tab');

        // Assert that the configured parameters match the expected values.
        $this->assertInputFieldValueEqual('interface_' . $index, $params['interface_0_check']);
        $this->assertInputFieldValueEqual('name_' . $index, $params['name_0']);
        $this->assertCheckBoxStageIsEqual('dhcp_' . $index, $params['dhcp_0']);
        $this->assertInputFieldValueEqual('ipaddr_' . $index, $params['ipaddr_0']);
        $this->assertMenuItemSelected('subnet_' . $index, $params['subnet_0']);
        $this->assertInputFieldValueEqual('vlanid_' . $index, $params['vlanid_0']);
        $this->assertMenuItemSelected('internet_interface', $params['internet_interface']);
        $this->assertInputFieldValueEqual('gateway', $params['gateway']);
        $this->assertInputFieldValueEqual('primarydns', $params['primarydns']);
        $this->assertInputFieldValueEqual('secondarydns', $params['secondarydns']);
        $this->assertCheckBoxStageIsEqual('usenat', $params['usenat']);
        $this->assertInputFieldValueEqual('extipaddr', $params['extipaddr']);
        $this->assertInputFieldValueEqual('exthostname', $params['exthostname']);
    }

    /**
     * Dataset provider for test cases.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params['eth0'] = [
            [
                'name_0' => 'vlan22',
                'interface_0' => '1',
                'interface_0_check' => 'eth0',
                'dhcp_0' => false,
                'ipaddr_0' => '172.16.39.12',
                'subnet_0' => 24,
                'vlanid_0' => 22,
                'internet_interface' => 1,
                'gateway' => '172.16.32.15',
                'primarydns' => '172.16.32.10',
                'secondarydns' => '172.16.32.5',
                'usenat' => true,
                'extipaddr' => '93.188.43.143',
                'exthostname' => 'testMikoPBX.miko.ru',
            ]
        ];
        return $params;
    }
}