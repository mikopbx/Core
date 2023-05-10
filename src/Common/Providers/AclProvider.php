<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

declare(strict_types=1);

namespace MikoPBX\Common\Providers;

use MikoPBX\Modules\Config\WebUIConfigInterface;
use Phalcon\Acl\Adapter\Memory as AclList;
use Phalcon\Acl\Component;
use Phalcon\Acl\Enum as AclEnum;
use Phalcon\Acl\Role as AclRole;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * Makes the Access Control List (ACL).
 *
 * This method creates a new AclList object and sets the default action to AclEnum::DENY. It then adds two roles,
 * admins and guest, to the ACL, and sets the default permissions such that admins are allowed to perform any
 * action and guest is denied access to any action.
 *
 * Finally, it uses the PBXConfModulesProvider class to allow modules to modify the ACL, and returns the modified ACL.
 *
 * @return AclList The Access Control List.
 */
class AclProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'ACL';

    /**
     * Register ACL service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function (){
                $acl = new AclList();
                $acl->setDefaultAction(AclEnum::DENY);

                // Register roles
                $acl->addRole(new AclRole('admins', 'Admins'));
                $acl->addRole(new AclRole('guest', 'Guests'));

                // Default permissions
                $acl->allow('admins', '*', '*');
                $acl->deny('guest', '*', '*');

                // Modules HOOK
                PBXConfModulesProvider::hookModulesProcedure(WebUIConfigInterface::ON_AFTER_ACL_LIST_PREPARED, [&$acl]);

                // Allow to show ERROR controllers to everybody
                $acl->addComponent(new Component('Errors'), ['show401', 'show404', 'show500']);
                $acl->allow('*', 'Errors', ['show401', 'show404', 'show500']);

                // Allow to show session controllers actions to everybody
                $acl->addComponent(new Component('Session'), ['index', 'start', 'changeLanguage', 'end']);
                $acl->allow('*', 'Session', ['index', 'start', 'changeLanguage', 'end']);

                return $acl;
            }
        );
    }

}