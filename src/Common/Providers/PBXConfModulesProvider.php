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
use MikoPBX\Modules\Config\ConfigClass;
use Phalcon\Di\Di;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * Registers pbxConfModules service provider and provides methods to interact with additional modules.
 *
 * @package MikoPBX\Common\Providers
 */
class PBXConfModulesProvider implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'pbxConfModules';

    public const string VERSION_HASH = 'versionHash';

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
            function () {
                $additionalModules = [];
                $modules = PbxExtensionModules::getEnabledModulesArray();
                foreach ($modules as $value) {
                    $className      = str_replace('Module', '', $value['uniqid']);
                    $fullClassName = "Modules\\{$value['uniqid']}\\Lib\\{$className}Conf";
                    try {
                        if (class_exists($fullClassName)) {
                            $object = new $fullClassName();
                            if ($object instanceof ConfigClass) {
                                $additionalModules[] = $object;
                            }
                        }
                    } catch (\Throwable $e) {
                        // One broken module must not take the hooks of every other module down with it
                        CriticalErrorsHandler::handleExceptionWithSyslog($e);
                    }
                }

                // Default order; hookModulesMethod() re-sorts by the priority of each hook
                self::sortByMethodPriority($additionalModules, '');
                return $additionalModules;
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
        (new self())->register($di);
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
        $additionalModules = $di->getShared(PBXConfModulesProvider::SERVICE_NAME);
        // The shared list is built once per process, so the per-hook priority is applied here
        self::sortByMethodPriority($additionalModules, $methodName);

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
     * Sorts module config objects by their priority for the given hook (lower runs first).
     *
     * @param array  $modules    Module config objects.
     * @param string $methodName Hook name passed to getMethodPriority().
     */
    private static function sortByMethodPriority(array &$modules, string $methodName): void
    {
        usort($modules, static function ($a, $b) use ($methodName) {
            return $a->getMethodPriority($methodName) - $b->getMethodPriority($methodName);
        });
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
            $result = PbxSettings::getValueByKey(PbxSettings::PBX_VERSION);
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