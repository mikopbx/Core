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

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Modules\Config\ConfigClass;
use Phalcon\Di;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * Registers pbxConfModules service provider and provides methods to interact with additional modules.
 *
 * @package MikoPBX\Common\Providers
 */
class PBXConfModulesProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'pbxConfModules';

    public const VERSION_HASH = 'versionHash';

    /**
     * Registers pbxConfModules service provider.
     * Creates an array of external installed modules.
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function (string $methodName=''){
                $additionalModules = [];
                $modules = PbxExtensionModules::getEnabledModulesArray();
                foreach ($modules as $value) {
                    $className      = str_replace('Module', '', $value['uniqid']);
                    $fullClassName = "Modules\\{$value['uniqid']}\\Lib\\{$className}Conf";
                    if (class_exists($fullClassName)) {
                        $object = new $fullClassName();
                        if ($object instanceof ConfigClass){
                            $additionalModules[] = $object;
                        }
                    }
                }

                // Sort the array based on the priority value for $methodName
                usort($additionalModules, function($a, $b) use ($methodName) {
                    return $a->getMethodPriority($methodName) - $b->getMethodPriority($methodName);
                });
                return  $additionalModules;
            }
        );
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
     * Calls additional module method by name and returns an array of results.
     *
     * @param string $methodName The method name to call.
     * @param array  $arguments  The arguments to pass to the method.
     *
     * @return array The array of results.
     */
    public static function hookModulesMethod(string $methodName, array $arguments = []): array
    {
        $result            = [];
        $di = Di::getDefault();
        $additionalModules = $di->getShared(PBXConfModulesProvider::SERVICE_NAME, ['methodName'=>$methodName]);

        foreach ($additionalModules as $configClassObj) {
            try {
                if ( ! method_exists($configClassObj, $methodName)) {
                    continue;
                }
                $moduleMethodResponse = call_user_func_array([$configClassObj, $methodName], $arguments);
            } catch (\Throwable $e) {
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
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
     * Calculated PBX version + all installed modules versions hash
     *
     * @return string calculated hash
     */
    public static function getVersionsHash(bool $recreate=false): string
    {
        $di = Di::getDefault();
        $cache = $di->get(ManagedCacheProvider::SERVICE_NAME);
        $version = $cache->get(PBXConfModulesProvider::VERSION_HASH) ?? '';
        if (empty($version) or $recreate){
            $result = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_VERSION);
            $modulesVersions = PbxExtensionModules::getModulesArray();
            foreach ($modulesVersions as $module) {
                $result .= "{$module['id']}{$module['version']}";
            }
            $version = md5($result);
            $cache->set(PBXConfModulesProvider::VERSION_HASH, $version, 3600);
        }
        return $version;
    }

}