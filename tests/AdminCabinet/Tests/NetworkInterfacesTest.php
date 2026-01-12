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
        // Note: hostname_1 and domain_1 are readonly when DHCP is enabled (managed by DHCP server)

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
        // Note: hostname_1 and domain_1 assertions removed - values managed by DHCP server

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
                'subnet_0' => '24',
                'vlanid_0' => '22',
                'usenat' => true,
                'extipaddr' => '93.188.43.143',
                'exthostname' => 'testMikoPBX.miko.ru',
                'externalSIPPort' => '5062',
                'externalTLSPort' => '5063'
            ]
        ];
        return $params;
    }

    /**
     * Test adding a static route configuration.
     * Must run after VLAN test because static routes section is only visible when multiple interfaces exist.
     *
     * @depends testAddNewVLAN
     */
    public function testStaticRoutes(): void
    {
        $this->setSessionName("Test: Static Routes Configuration");

        // Navigate to network configuration page
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");
        $this->waitForAjax();

        // Click "Add route" button
        $addRouteButton = self::$driver->findElement(WebDriverBy::id('add-first-route-button'));
        if (!$addRouteButton->isDisplayed()) {
            // If table already has routes, use the other button
            $addRouteButton = self::$driver->findElement(WebDriverBy::id('add-new-route'));
        }
        $addRouteButton->click();

        // Wait for new row to appear
        sleep(1);

        // Fill route data - using safe non-routable network
        $routeRow = self::$driver->findElement(WebDriverBy::cssSelector('#static-routes-table tbody tr:not(.route-row-template)'));

        // Network address
        $networkInput = $routeRow->findElement(WebDriverBy::cssSelector('.network-input'));
        $networkInput->clear();
        $networkInput->sendKeys('10.255.255.0');

        // Subnet - select /24 from dropdown
        $subnetDropdown = $routeRow->findElement(WebDriverBy::cssSelector('.subnet-dropdown-container .ui.dropdown'));
        $subnetDropdown->click();
        sleep(1);
        $option24 = $subnetDropdown->findElement(WebDriverBy::cssSelector('.item[data-value="24"]'));
        $option24->click();

        // Gateway - use the server's gateway
        $gatewayInput = $routeRow->findElement(WebDriverBy::cssSelector('.gateway-input'));
        $gatewayInput->clear();
        $gatewayInput->sendKeys('172.16.32.15');

        // Interface dropdown - select eth0
        $interfaceDropdown = $routeRow->findElement(WebDriverBy::cssSelector('.interface-dropdown-container .ui.dropdown'));
        $interfaceDropdown->click();
        sleep(1);
        $eth0Option = $interfaceDropdown->findElement(WebDriverBy::cssSelector('.item[data-value="eth0"]'));
        $eth0Option->click();

        // Description
        $descriptionInput = $routeRow->findElement(WebDriverBy::cssSelector('.description-input'));
        $descriptionInput->clear();
        $descriptionInput->sendKeys('Test route for automation');

        // Submit the form
        $this->submitForm('network-form');

        // Verify route was saved - reload page
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");
        $this->waitForAjax();

        // Check that route exists in table
        $savedRouteRow = self::$driver->findElement(WebDriverBy::cssSelector('#static-routes-table tbody tr:not(.route-row-template)'));

        $savedNetwork = $savedRouteRow->findElement(WebDriverBy::cssSelector('.network-input'))->getAttribute('value');
        $savedGateway = $savedRouteRow->findElement(WebDriverBy::cssSelector('.gateway-input'))->getAttribute('value');
        $savedDescription = $savedRouteRow->findElement(WebDriverBy::cssSelector('.description-input'))->getAttribute('value');

        $this->assertEquals('10.255.255.0', $savedNetwork, 'Network address should be saved');
        $this->assertEquals('172.16.32.15', $savedGateway, 'Gateway should be saved');
        $this->assertEquals('Test route for automation', $savedDescription, 'Description should be saved');

        // Clean up - delete the route
        $deleteButton = $savedRouteRow->findElement(WebDriverBy::cssSelector('.delete-route-button'));
        $deleteButton->click();

        // Submit to save the deletion
        $this->submitForm('network-form');
    }

    /**
     * Test IPv6 Manual configuration through web UI
     *
     * @depends testStaticRoutes
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
