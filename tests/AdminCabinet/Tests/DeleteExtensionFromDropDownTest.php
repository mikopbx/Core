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

/**
 * Class to test the deletion of an extension from a dropdown menu in the admin cabinet.
 */
class DeleteExtensionFromDropDownTest extends MikoPBXTestsBase
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
        $this->setSessionName("Test: Check dropdowns after delete extensions");
    }

    /**
     * Test if the extension is present in the dropdown menu after deletion.
     *
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for the test.
     */
    public function testDropdownOnDeletedExtensions(array $params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');

        $this->selectDropdownItem('action', 'extension');

        $elementFound = $this->checkIfElementExistOnDropdownMenu('extension', $params['username']);

        // Asserts
        if (!$elementFound && !$params['possibleToDelete']) {
            $this->fail('Not found menu item ' . $params['username'] . PHP_EOL);
        } elseif ($elementFound && $params['possibleToDelete']) {
            $this->fail('Found menu item ' . $params['username'] . PHP_EOL);
        } else {
            // Increment assertion counter
            $this->assertTrue(true);
        }
    }

    /**
     * Dataset provider for extension deletion parameters.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        // You can replace this with a proper dataset when needed.
        $deleteExt = new DeleteExtensionTest();
        return $deleteExt->additionProvider();
    }
}
