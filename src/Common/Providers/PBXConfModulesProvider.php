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
use MikoPBX\Core\System\Util;
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
                   return self::getExternalConfModules();
            }
        );
    }


    /**
     * Creates array of external installed modules
     * @return array
     */
    public static function getExternalConfModules():array
    {
        $arrObjects = [];
        $modules = PbxExtensionModules::getEnabledModulesArray();
        foreach ($modules as $value) {
            $className      = str_replace('Module', '', $value['uniqid']);
            $fullClassName = "\\Modules\\{$value['uniqid']}\\Lib\\{$className}Conf";
            if (class_exists($fullClassName)) {
                $object = new $fullClassName();
                if ($object instanceof ConfigClass){
                    $arrObjects[] = $object;
                }
            }
        }

        // Sort the array based on the priority value
        usort($arrObjects, function($a, $b) {
            return $a->priority - $b->priority;
        });
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

    /**
     * Calls additional module method by name and returns array of results
     *
     * @param string $methodName
     * @param array  $arguments
     *
     * @return array
     */
    public static function hookModulesMethodWithArrayResult(string $methodName, array $arguments = []): array
    {
        $result            = [];
        $di = Di::getDefault();
        $additionalModules = $di->getShared(self::SERVICE_NAME);
        foreach ($additionalModules as $configClassObj) {
            if ( ! method_exists($configClassObj, $methodName)) {
                continue;
            }
            try {
                $moduleMethodResponse = call_user_func_array([$configClassObj, $methodName], $arguments);
            } catch (\Throwable $e) {
                global $errorLogger;
                $errorLogger->captureException($e);
                Util::sysLogMsg(__METHOD__, $e->getMessage(), LOG_ERR);
                continue;
            }
            if ( ! empty($moduleMethodResponse)) {
                if (is_a($configClassObj, ConfigClass::class)) {
                    $result[$configClassObj->moduleUniqueId] = $moduleMethodResponse;
                } else {
                    $result[] = $moduleMethodResponse;
                }
            }
        }

        return $result;
    }

    /**
     * Calls additional module method by name and returns plain text result
     *
     * @param string $methodName
     * @param array  $arguments
     *
     * @return string
     */
    public static function hookModulesMethod(string $methodName, array $arguments = []): string
    {
        $stringResult      = '';
        $di = Di::getDefault();
        $additionalModules = $di->getShared(PBXConfModulesProvider::SERVICE_NAME);
        foreach ($additionalModules as $configClassObj) {
            if ( ! method_exists($configClassObj, $methodName)) {
                continue;
            }
            try {
                $includeString = call_user_func_array([$configClassObj, $methodName], $arguments);
                if ( ! empty($includeString)) {
                    $includeString = $configClassObj->confBlockWithComments($includeString);
                    if (
                        substr($stringResult, -1) !== "\t"
                        &&
                        substr($includeString, 0, 4) === 'same'
                    ) {
                        $stringResult .= "\t" . $includeString;
                    } else {
                        $stringResult .= $includeString;
                    }
                }
            } catch (\Throwable $e) {
                global $errorLogger;
                $errorLogger->captureException($e);
                Util::sysLogMsg(__METHOD__, $e->getMessage(), LOG_ERR);
                continue;
            }
        }

        return $stringResult;
    }


    /**
     * Calls additional module method by name without returns
     *
     * @param string $methodName
     * @param array  $arguments
     *
     * @return void
     */
    public static function hookModulesProcedure(string $methodName, array $arguments = []): void
    {
        $di = Di::getDefault();
        $additionalModules = $di->getShared(PBXConfModulesProvider::SERVICE_NAME);
        foreach ($additionalModules as $configClassObj) {
            if ( ! method_exists($configClassObj, $methodName)) {
                continue;
            }
            try {
                call_user_func_array([$configClassObj, $methodName], $arguments);
            } catch (\Throwable $e) {
                global $errorLogger;
                $errorLogger->captureException($e);
                Util::sysLogMsg(__METHOD__, $e->getMessage(), LOG_ERR);
                continue;
            }
        }
    }

}