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

use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

class CheckDropdownsOnAddExtensionsTest extends MikoPBXTestsBase
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
        $this->setSessionName("Test: Check extension selection dropdown menus after adding extensions");
    }

    /**
     * Test checking dropdown menus when adding extensions.
     *
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for the extension.
     *
     * @throws \Facebook\WebDriver\Exception\NoSuchElementException
     * @throws \Facebook\WebDriver\Exception\TimeoutException
     */
    public function testDropdownsOnCreateExtension(array $params): void
    {
        // Routing
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->clickButtonByHref('/admin-cabinet/incoming-routes/modify');

        // Prepare user representation
        $extensionTPL = sprintf('%s <%s>', $params['username'] , $params['number']);

        $elementFound = $this->checkIfElementExistOnDropdownMenu('extension', $extensionTPL);

        // Asserts
        if ($elementFound) {
            $this->fail('Found menuitem ' . $extensionTPL .' before creating it on Incoming routes modify ' . PHP_EOL);
        }

        // Extensions
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickButtonByHref('/admin-cabinet/extensions/modify');

        $this->changeTabOnCurrentPage('routing');
        $elementFound = $this->checkIfElementExistOnDropdownMenu('fwd_forwarding', $extensionTPL);

        // Asserts
        if ($elementFound) {
            $this->fail('Found menuitem ' . $extensionTPL .' before creating it on Extension routing tab ' . PHP_EOL);
        }

        $createExtension = new CreateExtensionsTest();
        $createExtension->testCreateExtensions($this->additionProvider()['Nikita Telegrafov <246>'][0]);

        // Routing
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->clickButtonByHref('/admin-cabinet/incoming-routes/modify');

        $elementFound = $this->checkIfElementExistOnDropdownMenu('extension', $extensionTPL);

        // Asserts
        if (!$elementFound) {
            $this->fail('Not found menuitem ' . $extensionTPL .' after creating it on Incoming routes modify ' . PHP_EOL);
        }

        // Extensions
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickButtonByHref('/admin-cabinet/extensions/modify');

        $this->changeTabOnCurrentPage('routing');
        $elementFound = $this->checkIfElementExistOnDropdownMenu('fwd_forwarding', $extensionTPL);

        // Asserts
        if (!$elementFound) {
            $this->fail('Not found menuitem ' . $extensionTPL .' after creating it on Extension routing tab ' . PHP_EOL);
        }
    }

    /**
     * Dataset provider for extension parameters.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params['Nikita Telegrafov <246>'] = [
            [
                'number'             => 246,
                'email'              => 'ntele@miko.ru',
                'username'           => 'Nikita Telegrafov',
                'mobile'             => '79051454089',
                'secret'             => '23542354wet',
                'sip_enableRecording'=> false,
                'sip_dtmfmode'       => 'auto_info',
                'sip_networkfilterid'=> 'none',
                'sip_transport'      => 'udp',
                'sip_manualattributes'=> '',
            ]
        ];
        return $params;
    }
}