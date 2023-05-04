<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Modules\Config;

use Phalcon\Acl\Adapter\Memory as AclList;

interface WebUIConfigInterface
{
    public const AUTHENTICATE_USER = 'authenticateUser';

    public const ON_AFTER_ACL_LIST_PREPARED = 'onAfterACLPrepared';


    /**
     * Authenticates user over external module
     *
     * @param string $login
     * @param string $password
     * @return array session data
     */
    public function authenticateUser(string $login, string $password): array;

    /**
     * Prepares list of additional ACL roles and rules
     *
     * @param  AclList $aclList
     * @return void
     */
    public function onAfterACLPrepared(AclList &$aclList):void;

}