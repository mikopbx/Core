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
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\Config\ConfigClass;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Exception;
use function MikoPBX\Common\Config\appPath;

/**
 * Main database connection is created based in the parameters defined in the configuration file
 */
class PBXConfModulesProvider implements ServiceProviderInterface
{
    /**
     * Register db service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            'pbxConfModules',
            function (){
                return array_merge($this->getCoreConfModules(), $this->getExtensionsConfModules());
            }
        );
    }

    /**
     * Create array of AsteriskConfModules
     * @return array
     */
    private function getCoreConfModules():array
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
     * Create array of AsteriskConfModules
     * @return array
     */
    private function getExtensionsConfModules():array
    {
        $arrObjects = [];
        $modules = PbxExtensionModules::find('disabled=0');
        foreach ($modules as $value) {
            $class_name      = str_replace('Module', '', $value->uniqid);
            $full_class_name = "\\Modules\\{$value->uniqid}\\Lib\\{$class_name}Conf";
            if (class_exists($full_class_name)) {
                    $object = new $full_class_name();
                if ($object instanceof ConfigClass){
                    $arrObjects[] = $object;
                }
            }
        }
        return  $arrObjects;
    }
}