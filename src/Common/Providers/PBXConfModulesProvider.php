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

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Modules\Config\ConfigClass;
use Phalcon\Di;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

use function MikoPBX\Common\Config\appPath;

/**
 * Main database connection is created based in the parameters defined in the configuration file
 */
class PBXConfModulesProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'pbxConfModules';

    /**
     * Registers pbxConfModules service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function (){
                return array_merge(
                    self::getCoreConfModules(),
                    self::getExtensionsConfModules()
                );
            }
        );
    }

    /**
     * Creates array of AsteriskConfModules
     * @return array
     */
    public static function getCoreConfModules():array
    {
        $arrObjects = [];
        $configsDir = appPath('src/Core/Asterisk/Configs');
        $modulesFiles = glob("{$configsDir}/*.php", GLOB_NOSORT);
        foreach ($modulesFiles as $file) {
            $className        = pathinfo($file)['filename'];
            $full_class_name = "\\MikoPBX\\Core\\Asterisk\\Configs\\{$className}";
            if (class_exists($full_class_name)) {
                $object = new $full_class_name();
                if ($object instanceof ConfigClass){
                    $arrObjects[] = $object;
                }
            }
        }
        return  $arrObjects;
    }

    /**
     * Creates array of AsteriskConfModules
     * @return array
     */
    public static function getExtensionsConfModules():array
    {
        $arrObjects = [];
        $modules = PbxExtensionModules::getEnabledModulesArray();
        foreach ($modules as $value) {
            $class_name      = str_replace('Module', '', $value['uniqid']);
            $full_class_name = "\\Modules\\{$value['uniqid']}\\Lib\\{$class_name}Conf";
            if (class_exists($full_class_name)) {
                $object = new $full_class_name();
                if ($object instanceof ConfigClass){
                    $arrObjects[] = $object;
                }
            }
        }

        return  $arrObjects;
    }

    /**
     * Recreates modules service after enable or disable them
     */
    public static function recreateModulesProvider(): void
    {
        $di = Di::getDefault();
        $di->remove(self::SERVICE_NAME);
        $di->register(new self());
    }

}