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

declare(strict_types=1);

namespace MikoPBX\Common\Providers;

use MikoPBX\Modules\Config\WebUIConfigInterface;
use Phalcon\Acl\Adapter\Memory as AclList;
use Phalcon\Acl\Component;
use Phalcon\Acl\Enum as AclEnum;
use Phalcon\Acl\Role as AclRole;
use Phalcon\Di;
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
 *
 * @package MikoPBX\Common\Providers
 */
class AclProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'ACL';

    public const CACHE_KEY = 'ACLCache';

    public const ROLE_ADMINS = 'admins';
    public const ROLE_GUESTS = 'guests';


    /**
     * Register ACL service provider
     *
     * @param \Phalcon\Di\DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($di){

                $cache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
                $acl = $cache->get(self::CACHE_KEY);

                if (!$acl) {
                    $acl = new AclList();
                    $acl->setDefaultAction(AclEnum::DENY);

                    // Register roles
                    $acl->addRole(new AclRole(AclProvider::ROLE_ADMINS, 'Admins'));
                    $acl->addRole(new AclRole(AclProvider::ROLE_GUESTS, 'Guests'));

                    // Default permissions
                    $acl->allow(AclProvider::ROLE_ADMINS, '*', '*');
                    $acl->deny(AclProvider::ROLE_GUESTS, '*', '*');

                    // Modules HOOK
                    PBXConfModulesProvider::hookModulesMethod(WebUIConfigInterface::ON_AFTER_ACL_LIST_PREPARED, [&$acl]);

                    // Allow showing ERROR controllers to everybody
                    $acl->addComponent(new Component('Errors'), ['show401', 'show404', 'show500']);
                    $acl->allow('*', 'Errors', ['show401', 'show404', 'show500']);

                    // Allow to show session controllers actions to everybody
                    $acl->addComponent(new Component('Session'), ['index', 'start', 'changeLanguage', 'end']);
                    $acl->allow('*', 'Session', ['index', 'start', 'changeLanguage', 'end']);

                    $cache->set(self::CACHE_KEY, $acl, 86400);
                }

                return $acl;
            }
        );
    }

    /**
     *  Clear ACL cache
     * @return void
     */
    public static function clearCache():void {
        $di = Di::getDefault();
        $cache = $di->get(ManagedCacheProvider::SERVICE_NAME);
        $cache->delete(self::CACHE_KEY);
    }

}