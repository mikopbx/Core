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

namespace MikoPBX\Tests\Modules\ModuleLdapSync\Lib;

use Modules\ModuleLdapSync\Lib\LdapSyncConnector;
use Modules\ModuleLdapSync\Lib\LdapSyncMain;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use Modules\ModuleLdapSync\Models\LdapServers;

class LdapSyncMainTest extends AbstractUnitTest
{

    public function testSyncAllUsers()
    {
        LdapSyncMain::syncAllUsers();
        $this->assertTrue(true);
    }

    public function testGetUsersList()
    {
        $serverParams = LdapServers::findFirst()->toArray();

        $attributes = json_decode($serverParams['attributes'], true);
        $serverParams = array_merge($attributes, $serverParams);
        // Create an LDAP connector
        $ldapCredentials = LdapSyncMain::postDataToLdapCredentials($serverParams);
        $ldapConnector = new LdapSyncConnector($ldapCredentials);
        // Retrieve the list of available LDAP users
        $res = $ldapConnector->getUsersList();
        $this->assertTrue($res->success);
    }


}
