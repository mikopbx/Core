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
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for configuring a new VLAN.
     */
    public function testAddNewVLAN(array $params): void
    {
        // Click on the network modification page in the admin cabinet.
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");

        $this->waitForAjax();

        $this->changeCheckBoxState('usenat', $params['usenat']);
        $this->changeInputField('extipaddr', $params['extipaddr']);
        $this->changeInputField('exthostname', $params['exthostname']);
        $this->changeInputField('externalSIPPort', $params['externalSIPPort']);
        $this->changeInputField('externalTLSPort', $params['externalTLSPort']);
        $this->changeInputField('hostname_1', $params['hostname_1']);
        $this->changeInputField('domain_1', $params['domain_1']);

        // Change to the appropriate tab on the current page.
        $this->changeTabOnCurrentPage('0');

        // Set various network configuration parameters.
        $this->selectDropdownItem('interface_0', $params['interface_0']);
        $this->changeInputField('name_0', $params['name_0']);
        $this->changeCheckBoxState('dhcp_0', $params['dhcp_0']);
        $this->changeInputField('ipaddr_0', $params['ipaddr_0']);
        $this->selectDropdownItem('subnet_0', $params['subnet_0']);
        $this->changeInputField('vlanid_0', $params['vlanid_0']);
        


        // Submit the network form.
        $this->submitForm('network-form');

        // Click on the network modification page again.
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");

        $this->waitForAjax();

        // Click on the eth0 tab.
        $this->changeTabOnCurrentPage('1');
        $this->assertCheckBoxStageIsEqual('usenat', $params['usenat']);
        $this->assertInputFieldValueEqual('extipaddr', $params['extipaddr']);
        $this->assertInputFieldValueEqual('exthostname', $params['exthostname']);
        $this->assertInputFieldValueEqual('externalSIPPort', $params['externalSIPPort']);
        $this->assertInputFieldValueEqual('externalTLSPort', $params['externalTLSPort']);
        $this->assertInputFieldValueEqual('hostname_1', $params['hostname_1']);
        $this->assertInputFieldValueEqual('domain_1', $params['domain_1']);
        

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
                'name_1' => 'eth0',
                'interface_0' => '1',
                'interface_0_check' => 'eth0',
                'dhcp_0' => false,
                'ipaddr_0' => '172.16.39.12',
                'subnet_0' => 24,
                'vlanid_0' => 22,
                'usenat' => true,
                'extipaddr' => '93.188.43.143',
                'exthostname' => 'testMikoPBX.miko.ru',
                'externalSIPPort' => 5062,
                'externalTLSPort' => 5063,
                'hostname_1'=>'testMikoPBX',
                'domain_1'=>'local'
            ]
        ];
        return $params;
    }

    /**
     * Test IPv6 Manual configuration through web UI
     *
     * @depends testAddNewVLAN
     */
    public function testIPv6ManualConfiguration(): void
    {
        $this->setSessionName("Test: IPv6 Manual Configuration");

        // Navigate to network configuration page
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");
        $this->waitForAjax();

        // Switch to eth0 tab (ID 1)
        $this->changeTabOnCurrentPage('1');

        // Select IPv6 Mode = Manual (value '2')
        $this->selectDropdownItem('ipv6-mode-1', '2');

        // Wait for IPv6 fields to become visible
        sleep(1);

        // Fill IPv6 configuration
        $this->changeInputField('ipv6addr_1', '2001:db8::100');
        $this->selectDropdownItem('ipv6-subnet-1', '64');
        $this->changeInputField('ipv6gateway_1', '2001:db8::1');

        // Submit form
        $this->submitForm('network-form');

        // Reload page and verify settings
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");
        $this->waitForAjax();
        $this->changeTabOnCurrentPage('1');

        // Verify IPv6 settings
        $this->assertMenuItemSelected('ipv6-mode-1', '2');
        $this->assertInputFieldValueEqual('ipv6addr_1', '2001:db8::100');
        $this->assertMenuItemSelected('ipv6-subnet-1', '64');
        $this->assertInputFieldValueEqual('ipv6gateway_1', '2001:db8::1');

        // Reset to Off mode
        $this->selectDropdownItem('ipv6-mode-1', '0');
        $this->submitForm('network-form');
    }

    /**
     * Test IPv6 Auto configuration (SLAAC/DHCPv6)
     *
     * @depends testIPv6ManualConfiguration
     */
    public function testIPv6AutoConfiguration(): void
    {
        $this->setSessionName("Test: IPv6 Auto Configuration (SLAAC)");

        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");
        $this->waitForAjax();
        $this->changeTabOnCurrentPage('1');

        // Select IPv6 Mode = Auto (value '1')
        $this->selectDropdownItem('ipv6-mode-1', '1');

        // Wait for fields to hide
        sleep(1);

        // Submit form
        $this->submitForm('network-form');

        // Verify Auto mode was saved
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");
        $this->waitForAjax();
        $this->changeTabOnCurrentPage('1');

        $this->assertMenuItemSelected('ipv6-mode-1', '1');

        // Reset to Off mode
        $this->selectDropdownItem('ipv6-mode-1', '0');
        $this->submitForm('network-form');
    }

    /**
     * Test Dual-Stack NAT section visibility
     *
     * @depends testIPv6AutoConfiguration
     */
    public function testDualStackNATSection(): void
    {
        $this->setSessionName("Test: Dual-Stack NAT Section");

        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");
        $this->waitForAjax();
        $this->changeTabOnCurrentPage('1');

        // Configure IPv4 Static
        $this->changeCheckBoxState('dhcp_1', false);
        $this->changeInputField('ipaddr_1', '192.168.1.100');
        $this->selectDropdownItem('subnet_1', '24');

        // Configure IPv6 Manual
        $this->selectDropdownItem('ipv6-mode-1', '2');
        sleep(1);
        $this->changeInputField('ipv6addr_1', '2001:db8::100');
        $this->selectDropdownItem('ipv6-subnet-1', '64');

        // Wait for Dual-Stack section to appear
        sleep(1);

        // Verify standard NAT section is hidden and Dual-Stack section is visible
        $natSection = self::$driver->findElement(WebDriverBy::id('nat-section'));
        $dualStackSection = self::$driver->findElement(WebDriverBy::id('dual-stack-section'));

        $this->assertFalse($natSection->isDisplayed(), 'Standard NAT section should be hidden in dual-stack mode');
        $this->assertTrue($dualStackSection->isDisplayed(), 'Dual-Stack section should be visible');

        // Fill required hostname
        $this->changeInputField('exthostname', 'mikopbx-dualstack.example.com');

        // Submit form
        $this->submitForm('network-form');

        // Verify hostname was saved
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");
        $this->waitForAjax();
        $this->changeTabOnCurrentPage('1');

        $this->assertInputFieldValueEqual('exthostname', 'mikopbx-dualstack.example.com');

        // Reset configuration
        $this->selectDropdownItem('ipv6-mode-1', '0');
        $this->changeCheckBoxState('dhcp_1', true);
        $this->submitForm('network-form');
    }

    /**
     * Test IPv6 DNS fields functionality
     *
     * @depends testDualStackNATSection
     */
    public function testIPv6DNSFields(): void
    {
        $this->setSessionName("Test: IPv6 DNS Fields");

        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");
        $this->waitForAjax();
        $this->changeTabOnCurrentPage('1');

        // Fill IPv6 DNS servers (Google Public DNS IPv6)
        $this->changeInputField('primarydns6_1', '2001:4860:4860::8888');
        $this->changeInputField('secondarydns6_1', '2001:4860:4860::8844');

        // Submit form
        $this->submitForm('network-form');

        // Verify DNS servers were saved
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");
        $this->waitForAjax();
        $this->changeTabOnCurrentPage('1');

        $this->assertInputFieldValueEqual('primarydns6_1', '2001:4860:4860::8888');
        $this->assertInputFieldValueEqual('secondarydns6_1', '2001:4860:4860::8844');

        // Clear DNS fields
        $this->changeInputField('primarydns6_1', '');
        $this->changeInputField('secondarydns6_1', '');
        $this->submitForm('network-form');
    }
}
