<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

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