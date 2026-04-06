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
use Facebook\WebDriver\WebDriverExpectedCondition;
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

        // Delete existing VLAN22 if it exists from previous test run
        try {
            // Try to find existing VLAN tab by name
            $vlanTabXpath = "//div[@id='eth-interfaces-menu']/a[contains(text(),'{$params['name_0']}')]";
            $existingTab = self::$driver->findElement(WebDriverBy::xpath($vlanTabXpath));

            if ($existingTab->isDisplayed()) {
                echo "DEBUG: Found existing VLAN '{$params['name_0']}', attempting to delete...\n";

                // Get data-tab attribute
                $dataTab = $existingTab->getAttribute('data-tab');
                echo "DEBUG: VLAN data-tab = '{$dataTab}'\n";

                // Click on the VLAN tab to make it active and load its content
                $existingTab->click();
                $this->waitForAjax();
                sleep(1);

                // Find delete button inside the active tab content
                // Structure: <a class="ui icon left labeled button delete-interface" data-value="3">
                $deleteButtonXpath = "//a[contains(@class, 'delete-interface') and @data-value='{$dataTab}']";
                $deleteButton = self::$driver->findElement(WebDriverBy::xpath($deleteButtonXpath));

                if (!$deleteButton->isDisplayed()) {
                    throw new \Exception("Delete button found but not visible");
                }

                echo "DEBUG: Found delete button for VLAN\n";
                $deleteButton->click();

                // No modal appears - VLAN is marked for deletion
                // Actual deletion happens after form submit
                echo "DEBUG: VLAN marked for deletion (no modal needed)\n";

                sleep(1);

                // Submit form to actually delete the VLAN
                echo "DEBUG: Submitting form to delete VLAN...\n";
                $this->submitForm('network-form');

                // Wait for page reload after deletion
                $this->waitForAjax();
                sleep(2);

                // Navigate back to network page
                $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");
                $this->waitForAjax();

                echo "DEBUG: Successfully deleted existing VLAN '{$params['name_0']}'\n";
            }
        } catch (\Exception $e) {
            echo "DEBUG: No existing VLAN '{$params['name_0']}' found (or deletion failed), proceeding with creation...\n";
            echo "DEBUG: Exception: " . $e->getMessage() . "\n";
        }

        // Configure NAT settings (IPv6 already disabled by setUp())
        $this->changeCheckBoxState('usenat', $params['usenat']);
        $this->changeInputField('extipaddr', $params['extipaddr']);
        $this->changeInputField('exthostname', $params['exthostname']);
        $this->changeInputField('externalSIPPort', $params['externalSIPPort']);
        $this->changeInputField('externalTLSPort', $params['externalTLSPort']);

        // Fill global hostname (single value for all interfaces)
        $this->changeInputField('global_hostname', $params['global_hostname']);

        // Change to the appropriate tab on the current page.
        $this->changeTabOnCurrentPage('0');

        // Set various network configuration parameters.
        $this->selectDropdownItem('interface_0', $params['interface_0']);
        $this->changeInputField('name_0', $params['name_0']);

        // Select IPv4 mode: '0' = Manual, '1' = DHCP
        $this->selectDropdownItem('ipv4_mode_0', $params['ipv4_mode_0']);
        sleep(1); // Wait for JavaScript to show/hide fields

        $this->changeInputField('ipaddr_0', $params['ipaddr_0']);
        $this->selectDropdownItem('subnet_0', $params['subnet_0']);
        $this->changeInputField('vlanid_0', $params['vlanid_0']);

        // Check dual-stack mode BEFORE form submission
        // JavaScript may clear extipaddr before we submit if eth0 has public IPv6
        $this->changeTabOnCurrentPage('1'); // Switch to eth0
        sleep(1); // Wait for JavaScript to execute
        $isDualStackBeforeSave = $this->isDualStackMode('1');
        $this->annotate("Dual-stack BEFORE save: " . ($isDualStackBeforeSave ? 'YES' : 'NO'));

        // Submit the network form.
        $this->submitForm('network-form');

        // Click on the network modification page again.
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");

        $this->waitForAjax();

        // Click on the eth0 tab.
        $this->changeTabOnCurrentPage('1');

        // Wait for JavaScript updateDualStackNatLogic() to complete
        // This function may clear extipaddr in dual-stack mode
        sleep(2);

        // Check if dual-stack mode is active AFTER page reload
        $isDualStackAfterSave = $this->isDualStackMode('1');
        $mode = $isDualStackAfterSave ? 'Dual-Stack (IPv4 + IPv6)' : 'IPv4-only NAT';
        $this->annotate("Dual-stack AFTER save: " . ($isDualStackAfterSave ? 'YES' : 'NO'));
        $this->annotate("NAT mode: {$mode}");

        // Common assertions for both modes
        $this->assertCheckBoxStageIsEqual('usenat', $params['usenat']);
        $this->assertInputFieldValueEqual('externalSIPPort', $params['externalSIPPort']);
        $this->assertInputFieldValueEqual('externalTLSPort', $params['externalTLSPort']);
        $this->assertInputFieldValueEqual('global_hostname', $params['global_hostname']);

        // Mode-specific assertions
        // Use the state BEFORE save because JavaScript clears extipaddr before submitForm()
        if ($isDualStackBeforeSave) {
            // Dual-stack mode: extipaddr cleared by JavaScript before save, exthostname required
            $this->assertInputFieldValueEqual('extipaddr', '');
            $this->assertInputFieldValueEqual('exthostname', $params['exthostname']);
            $this->annotate("Dual-stack: extipaddr is empty (hostname-based NAT)");
        } else {
            // IPv4-only mode: extipaddr should be saved
            $this->assertInputFieldValueEqual('extipaddr', $params['extipaddr']);
            $this->assertInputFieldValueEqual('exthostname', $params['exthostname']);
            $this->annotate("IPv4-only: extipaddr is set (IP-based NAT)");
        }

        // Click on the newly created VLAN tab.
        $xpath = "//div[@id='eth-interfaces-menu']/a[contains(text(),'{$params['name_0']}')]";
        $newTab = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $newTab->click();
        $index = $newTab->getAttribute('data-tab');

        // Assert that the configured parameters match the expected values.
        $this->assertInputFieldValueEqual('interface_' . $index, $params['interface_0_check']);
        $this->assertInputFieldValueEqual('name_' . $index, $params['name_0']);
        $this->assertMenuItemSelected('ipv4_mode_' . $index, $params['ipv4_mode_0']);
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
                'ipv4_mode_0' => '0',  // '0' = Manual, '1' = DHCP
                'ipaddr_0' => '172.16.39.12',
                'subnet_0' => '24',
                'vlanid_0' => '22',
                'usenat' => true,
                'extipaddr' => '93.188.43.143',
                'exthostname' => 'testMikoPBX.miko.ru',
                'global_hostname' => 'mikopbx-test',
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
     * Test IPv4 DHCP/Manual mode switching and field visibility
     *
     * @depends testStaticRoutes
     */
    public function testIPv4DHCPManualSwitching(): void
    {
        $this->setSessionName("Test: IPv4 DHCP/Manual Mode Switching");

        // Navigate to network configuration page
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");
        $this->waitForAjax();

        // Switch to eth0 tab (ID 1)
        $this->changeTabOnCurrentPage('1');
        sleep(1);

        // Test 1: Verify DHCP mode (initial state)
        // In DHCP mode: IP/subnet fields should be hidden, DHCP info should be visible
        $this->selectDropdownItem('ipv4_mode_1', '1'); // DHCP mode
        sleep(1); // Wait for JavaScript to update visibility

        // Verify IP address group is hidden
        $ipAddressGroup = self::$driver->findElement(WebDriverBy::id('ip-address-group-1'));
        $this->assertFalse($ipAddressGroup->isDisplayed(),
            'IP address group should be hidden in DHCP mode');

        // Verify DHCP info message is visible
        $dhcpInfoMessage = self::$driver->findElement(WebDriverBy::cssSelector('.dhcp-info-message-1'));
        $this->assertTrue($dhcpInfoMessage->isDisplayed(),
            'DHCP info message should be visible in DHCP mode');

        // Test 2: Switch to Manual mode
        $this->selectDropdownItem('ipv4_mode_1', '0'); // Manual mode
        sleep(1); // Give JavaScript time to execute toggleDisabledFieldClass()

        // Wait explicitly for IP address group to become visible
        self::$driver->wait(10, 500)->until(
            WebDriverExpectedCondition::visibilityOfElementLocated(
                WebDriverBy::id('ip-address-group-1')
            )
        );

        // Re-find elements after DOM update
        $ipAddressGroup = self::$driver->findElement(WebDriverBy::id('ip-address-group-1'));
        $dhcpInfoMessage = self::$driver->findElement(WebDriverBy::cssSelector('.dhcp-info-message-1'));

        // Verify IP address group is now visible
        $this->assertTrue($ipAddressGroup->isDisplayed(),
            'IP address group should be visible in Manual mode');

        // Verify DHCP info message is now hidden
        $this->assertFalse($dhcpInfoMessage->isDisplayed(),
            'DHCP info message should be hidden in Manual mode');

        // Test 3: Fill Manual configuration with gateway
        // Use same network as DHCP to avoid losing connection
        $this->changeInputField('ipaddr_1', '172.16.33.72');
        $this->selectDropdownItem('subnet_1', '24');
        $this->changeInputField('gateway_1', '172.16.33.15');

        // Submit form
        $this->submitForm('network-form');

        // Test 4: Verify Manual configuration was saved
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");
        $this->waitForAjax();
        $this->changeTabOnCurrentPage('1');
        sleep(1);

        // Verify saved values
        $this->assertMenuItemSelected('ipv4_mode_1', '0'); // Manual mode
        $this->assertInputFieldValueEqual('ipaddr_1', '172.16.33.72');
        $this->assertMenuItemSelected('subnet_1', '24');
        $this->assertInputFieldValueEqual('gateway_1', '172.16.33.15');

        // Test 5: Switch back to DHCP mode
        $this->selectDropdownItem('ipv4_mode_1', '1'); // DHCP mode
        sleep(1); // Give JavaScript time to execute toggleDisabledFieldClass()

        // Wait for DHCP info message to become visible
        self::$driver->wait(10, 500)->until(
            WebDriverExpectedCondition::visibilityOfElementLocated(
                WebDriverBy::cssSelector('.dhcp-info-message-1')
            )
        );

        // Wait for IP address group to become hidden
        self::$driver->wait(10, 500)->until(
            WebDriverExpectedCondition::invisibilityOfElementLocated(
                WebDriverBy::id('ip-address-group-1')
            )
        );

        // Re-find elements after DOM update
        $ipAddressGroup = self::$driver->findElement(WebDriverBy::id('ip-address-group-1'));
        $dhcpInfoMessage = self::$driver->findElement(WebDriverBy::cssSelector('.dhcp-info-message-1'));

        // Verify fields are hidden again
        $this->assertFalse($ipAddressGroup->isDisplayed(),
            'IP address group should be hidden after switching back to DHCP');
        $this->assertTrue($dhcpInfoMessage->isDisplayed(),
            'DHCP info message should be visible after switching back to DHCP');

        // Submit to save DHCP mode
        $this->submitForm('network-form');

        // Verify DHCP mode was saved
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");
        $this->waitForAjax();
        $this->changeTabOnCurrentPage('1');

        $this->assertMenuItemSelected('ipv4_mode_1', '1'); // DHCP mode
    }

    /**
     * Test IPv6 Manual configuration through web UI
     *
     * @depends testIPv4DHCPManualSwitching
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
        $this->selectDropdownItem('ipv6_mode_1', '2');

        // Wait for IPv6 fields to become visible
        sleep(1);

        // Fill IPv6 configuration
        $this->changeInputField('ipv6addr_1', '2001:db8::100');
        $this->selectDropdownItem('ipv6_subnet_1', '64');
        $this->changeInputField('ipv6_gateway_1', '2001:db8::1');

        // Submit form
        $this->submitForm('network-form');

        // Reload page and verify settings
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");
        $this->waitForAjax();
        $this->changeTabOnCurrentPage('1');

        // Verify IPv6 settings
        $this->assertMenuItemSelected('ipv6_mode_1', '2');
        $this->assertInputFieldValueEqual('ipv6addr_1', '2001:db8::100');
        $this->assertMenuItemSelected('ipv6_subnet_1', '64');
        $this->assertInputFieldValueEqual('ipv6_gateway_1', '2001:db8::1');

        // Reset to Off mode
        $this->selectDropdownItem('ipv6_mode_1', '0');
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
        $this->selectDropdownItem('ipv6_mode_1', '1');

        // Wait for fields to hide
        sleep(1);

        // Submit form
        $this->submitForm('network-form');

        // Verify Auto mode was saved
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");
        $this->waitForAjax();
        $this->changeTabOnCurrentPage('1');

        $this->assertMenuItemSelected('ipv6_mode_1', '1');

        // Reset to Off mode
        $this->selectDropdownItem('ipv6_mode_1', '0');
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

        // DON'T change IPv4 mode - leave it as is (DHCP or Manual) to avoid network disruption
        // Dual-stack detection works regardless of IPv4 mode (static or DHCP)

        // Configure IPv6 Manual
        $this->selectDropdownItem('ipv6_mode_1', '2');
        sleep(1);
        $this->changeInputField('ipv6addr_1', '2001:db8::100');
        $this->selectDropdownItem('ipv6_subnet_1', '64');

        // Wait for Dual-Stack section to appear
        sleep(1);

        // Verify standard NAT section is hidden and Dual-Stack section is visible
        $natSection = self::$driver->findElement(WebDriverBy::id('standard-nat-section'));
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

        // Reset IPv6 configuration (IPv4 left unchanged)
        $this->selectDropdownItem('ipv6_mode_1', '0');
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

        // Enable IPv6 Manual mode to make DNS fields visible
        $this->selectDropdownItem('ipv6_mode_1', '2');
        sleep(1);  // Wait for fields to become visible

        // Configure IPv6 address (required for DNS to be saved)
        $this->changeInputField('ipv6addr_1', '2001:db8::200');
        $this->selectDropdownItem('ipv6_subnet_1', '64');

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

        // Clear DNS fields and disable IPv6
        $this->changeInputField('primarydns6_1', '');
        $this->changeInputField('secondarydns6_1', '');
        $this->selectDropdownItem('ipv6_mode_1', '0');  // Disable IPv6
        $this->submitForm('network-form');
    }

    /**
     * Check if dual-stack NAT mode is active (IPv4 + public IPv6)
     *
     * Dual-stack mode occurs when:
     * - Interface has IPv4 address (static or DHCP)
     * - Interface has public IPv6 address (Global Unicast 2000::/3)
     *
     * In dual-stack mode:
     * - extipaddr is cleared (not used)
     * - exthostname becomes required
     * - Asterisk resolves hostname to get both A and AAAA records
     *
     * @param string $interfaceId Interface ID to check (default: '1' for eth0)
     * @return bool True if dual-stack mode is detected
     */
    private function isDualStackMode(string $interfaceId = '1'): bool
    {
        // Use JavaScript to check dual-stack mode using same logic as network-modify.js
        $script = "
            var ipv6Mode = $('#ipv6_mode_{$interfaceId}').val();
            var ipv6addrManual = $('input[name=\"ipv6addr_{$interfaceId}\"]').val();
            var ipv6addrAuto = $('#current-ipv6addr-{$interfaceId}').val();
            var ipv6addr = ipv6Mode === '1' ? ipv6addrAuto : ipv6addrManual;

            // Check if IPv4 present (static or DHCP)
            var ipv4addr = $('input[name=\"ipaddr_{$interfaceId}\"]').val();
            var dhcpEnabled = $('#dhcp-{$interfaceId}-checkbox').checkbox('is checked');
            var gateway = $('input[name=\"gateway_{$interfaceId}\"]').val();
            var hasIpv4 = (ipv4addr && ipv4addr.trim() !== '') ||
                          (dhcpEnabled && gateway && gateway.trim() !== '');

            // Check if IPv6 is public global unicast (2000::/3 - addresses starting with 2 or 3)
            // Exclude ULA (fd00::/8) and link-local (fe80::/10)
            var hasPublicIpv6 = false;
            if ((ipv6Mode === '1' || ipv6Mode === '2') &&
                ipv6addr && ipv6addr.trim() !== '' && ipv6addr !== 'Autoconfigured') {
                var ipv6Lower = ipv6addr.toLowerCase().trim();
                var ipv6WithoutCidr = ipv6Lower.split('/')[0];
                hasPublicIpv6 = /^[23]/.test(ipv6WithoutCidr);
            }

            // Return debug info
            return {
                isDualStack: hasIpv4 && hasPublicIpv6,
                ipv6Mode: ipv6Mode,
                ipv6addr: ipv6addr || 'empty',
                ipv6addrManual: ipv6addrManual || 'empty',
                ipv6addrAuto: ipv6addrAuto || 'empty',
                hasIpv4: hasIpv4,
                hasPublicIpv6: hasPublicIpv6,
                ipv4addr: ipv4addr || 'empty',
                dhcpEnabled: dhcpEnabled,
                gateway: gateway || 'empty'
            };
        ";

        $result = self::$driver->executeScript($script);

        // Log debug info to both BrowserStack and console
        $debugMsg = "\n=== Dual-stack check for interface {$interfaceId} ===\n";
        $debugMsg .= "  IPv6 Mode: " . ($result['ipv6Mode'] ?? 'undefined') . "\n";
        $debugMsg .= "  IPv6 Addr (used): " . ($result['ipv6addr'] ?? 'empty') . "\n";
        $debugMsg .= "  IPv6 Manual: " . ($result['ipv6addrManual'] ?? 'empty') . "\n";
        $debugMsg .= "  IPv6 Auto: " . ($result['ipv6addrAuto'] ?? 'empty') . "\n";
        $debugMsg .= "  IPv4 Addr: " . ($result['ipv4addr'] ?? 'empty') . "\n";
        $debugMsg .= "  DHCP Enabled: " . ($result['dhcpEnabled'] ? 'yes' : 'no') . "\n";
        $debugMsg .= "  Gateway: " . ($result['gateway'] ?? 'empty') . "\n";
        $debugMsg .= "  Has IPv4: " . ($result['hasIpv4'] ? 'YES' : 'NO') . "\n";
        $debugMsg .= "  Has Public IPv6: " . ($result['hasPublicIpv6'] ? 'YES' : 'NO') . "\n";
        $debugMsg .= "  Result: " . ($result['isDualStack'] ? 'DUAL-STACK' : 'IPv4-only') . "\n";
        $debugMsg .= "==========================================\n";

        // Output to console using echo (STDERR causes PHPUnit exception)
        echo $debugMsg;

        // Also annotate for BrowserStack
        foreach (explode("\n", trim($debugMsg)) as $line) {
            if (!empty(trim($line))) {
                $this->annotate(trim($line));
            }
        }

        return (bool)$result['isDualStack'];
    }
}
