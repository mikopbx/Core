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
use Phalcon\Assets\Manager;
use Phalcon\Mvc\Router;

interface WebUIConfigInterface
{
    public const AUTHENTICATE_USER = 'authenticateUser';

    public const ON_AFTER_ACL_LIST_PREPARED = 'onAfterACLPrepared';

    public const ON_BEFORE_HEADER_MENU_SHOW = 'onBeforeHeaderMenuShow';

    public const ON_AFTER_ROUTES_PREPARED = 'onAfterRoutesPrepared';

    public const ON_AFTER_ASSETS_PREPARED = 'onAfterAssetsPrepared';

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
    public function onAfterACLPrepared(AclList $aclList):void;


    /**
     * Modifies system menu
     *
     * @param array $menuItems
     * @return void
     */
    public function onBeforeHeaderMenuShow(array &$menuItems):void;


    /**
     * Modifies system routes
     *
     * @param Router $router
     * @return void
     */
    public function onAfterRoutesPrepared(Router $router):void;

    /**
     * Modifies system assets
     *
     * @param Manager $assets
     * @return void
     */
    public function onAfterAssetsPrepared(Manager $assets):void;
}