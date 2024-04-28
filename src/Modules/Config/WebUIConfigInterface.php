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

namespace MikoPBX\Modules\Config;

use Phalcon\Acl\Adapter\Memory as AclList;
use Phalcon\Assets\Manager;
use Phalcon\Forms\Form;
use Phalcon\Mvc\Dispatcher;
use Phalcon\Mvc\Router;
use Phalcon\Mvc\View;

/**
 * Interface WebUIConfigInterface
 *
 * This interface defines web interface hooks
 *
 * @package MikoPBX\Modules\Config
 */
interface WebUIConfigInterface
{
    public const AUTHENTICATE_USER = 'authenticateUser';

    public const ON_AFTER_ACL_LIST_PREPARED = 'onAfterACLPrepared';

    public const ON_BEFORE_HEADER_MENU_SHOW = 'onBeforeHeaderMenuShow';

    public const ON_AFTER_ROUTES_PREPARED = 'onAfterRoutesPrepared';

    public const ON_AFTER_ASSETS_PREPARED = 'onAfterAssetsPrepared';

    public const ON_VOLT_BLOCK_COMPILE = 'onVoltBlockCompile';

    public const ON_BEFORE_FORM_INITIALIZE = 'onBeforeFormInitialize';

    public const ON_BEFORE_EXECUTE_ROUTE = 'onBeforeExecuteRoute';

    public const ON_AFTER_EXECUTE_ROUTE = 'onAfterExecuteRoute';

    /**
     * Authenticates a user over an external module.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#authenticateuser
     *
     * @param string $login The user login entered on the login page.
     * @param string $password The user password entered on the login page.
     *
     * @return array The session data.
     */
    public function authenticateUser(string $login, string $password): array;

    /**
     * Prepares a list of additional ACL roles and rules.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onafteraclprepared
     *
     * @param AclList $aclList The ACL list for modifications.
     *
     * @return void
     */
    public function onAfterACLPrepared(AclList $aclList):void;

    /**
     * Modifies the system menu.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onbeforeheadermenushow
     *
     * @param array $menuItems The menu items for modifications.
     *
     * @return void
     */
    public function onBeforeHeaderMenuShow(array &$menuItems):void;

    /**
     * Modifies the system routes.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onafterroutesprepared
     *
     * @param Router $router The router ready for extra routes from modules.
     *
     * @return void
     */
    public function onAfterRoutesPrepared(Router $router):void;

    /**
     * Modifies the system assets.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onafterassetsprepared
     *
     * @param Manager $assets The assets manager for additional modifications from module.
     * @param Dispatcher $dispatcher The dispatcher instance.
     *
     * @return void
     */
    public function onAfterAssetsPrepared(Manager $assets, Dispatcher $dispatcher):void;

    /**
     * Prepares the include block within a Volt template.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onvoltblockcompile
     *
     * @param string $controller The called controller name.
     * @param string $blockName The named in volt template block name.
     * @param View $view The view instance.
     *
     * @return string the volt partial file path without extension.
     */
    public function onVoltBlockCompile(string $controller, string $blockName, View $view):string;

    /**
     * Called from BaseForm before the form is initialized.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onbeforeforminitialize
     *
     * @param Form $form The called form instance.
     * @param mixed $entity The called form entity.
     * @param mixed $options The called form options.
     *
     * @return void
     */
    public function onBeforeFormInitialize(Form $form, $entity, $options):void;

    /**
     * Called from BaseController before executing a route.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onbeforeexecuteroute
     *
     * @param Dispatcher $dispatcher
     * @return void
     */
    public function onBeforeExecuteRoute(Dispatcher $dispatcher):void;

    /**
     * Called from BaseController after executing a route.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onafterexecuteroute
     *
     * @param Dispatcher $dispatcher
     *
     * @return void
     */
    public function onAfterExecuteRoute(Dispatcher $dispatcher):void;


}