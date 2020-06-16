<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\Tests\AdminCabinet\Tests;


use Facebook\WebDriver\WebDriverBy;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

class NetworkInterfacesTest extends MikoPBXTestsBase
{
    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     */
    public function testAddNewVLAN(array $params): void
    {
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");
        $this->changeTabOnCurrentPage('new');
        $this->selectDropdownItem('interface_new',$params['interface_new']);
        $this->changeInputField('name_new', $params['name_new']);
        $this->changeCheckBoxState('dhcp_new',$params['dhcp_new']);
        $this->changeInputField('ipaddr_new',$params['ipaddr_new']);
        $this->selectDropdownItem('subnet_new',$params['subnet_new']);
        $this->changeInputField('vlanid_new',$params['vlanid_new']);
        $this->selectDropdownItem('internet_interface',$params['internet_interface']);
        $this->changeInputField('gateway', $params['gateway']);
        $this->changeInputField('primarydns',$params['primarydns']);
        $this->changeInputField('secondarydns',$params['secondarydns']);
        $this->changeCheckBoxState('usenat',$params['usenat']);
        $this->changeInputField('extipaddr',$params['extipaddr']);
        $this->changeInputField('exthostname',$params['exthostname']);

        $this->submitForm('network-form');
        $this->clickSidebarMenuItemByHref("/admin-cabinet/network/modify/");

        $xpath = "//div[@id='eth-interfaces-menu']/a[contains(text(),'{$params['name_new']}')]";
        $newTab = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $newTab->click();
        $index = $newTab->getAttribute('data-tab');
        $this->assertInputFieldValueEqual('interface_'.$index, $params['interface_new_check']);
        $this->assertInputFieldValueEqual('name_'.$index, $params['name_new']);
        $this->assertCheckBoxStageIsEqual('dhcp_'.$index, $params['dhcp_new']);
        $this->assertInputFieldValueEqual('ipaddr_'.$index, $params['ipaddr_new']);
        $this->assertMenuItemSelected('subnet_'.$index, $params['subnet_new']);
        $this->assertInputFieldValueEqual('vlanid_'.$index, $params['vlanid_new']);

        $this->assertMenuItemSelected('internet_interface', $params['internet_interface']);
        $this->assertInputFieldValueEqual('gateway', $params['gateway']);
        $this->assertInputFieldValueEqual('primarydns', $params['primarydns']);
        $this->assertInputFieldValueEqual('secondarydns', $params['secondarydns']);
        $this->assertCheckBoxStageIsEqual('usenat', $params['usenat']);
        $this->assertInputFieldValueEqual('extipaddr', $params['extipaddr']);
        $this->assertInputFieldValueEqual('exthostname', $params['exthostname']);

    }

    /**
     * Dataset provider
     * @return array
     */
    public function additionProvider(): array
    {
        $params   = [];
        $params[] = [
            [
                'name_new'    => 'vlan22',
                'interface_new' => '1',
                'interface_new_check' => 'eth0',
                'dhcp_new'      => false,
                'ipaddr_new'        => '172.16.39.12',
                'subnet_new'   => 24,
                'vlanid_new'       => 22,
                'internet_interface'    => 1,
                'gateway'         => '172.16.32.15',
                'primarydns'        => '172.16.32.10',
                'secondarydns'         => '172.16.32.5',
                'usenat'   => true,
                'extipaddr'      => '93.188.43.143',
                'exthostname'        => 'testMikoPBX.miko.ru',
            ]
        ];
        return $params;
    }
}