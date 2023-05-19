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

namespace MikoPBX\Core\Providers;

use MikoPBX\Core\Asterisk\Configs\AsteriskConfigClass;
use Phalcon\Di;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

use function MikoPBX\Common\Config\appPath;

/**
 * Returns an array of Asterisk configuration objects sorted by priority.
 *
 * @package MikoPBX\Core\Providers
 */
class AsteriskConfModulesProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'asteriskConfModules';

    /**
     * Registers asteriskConfModules service provider
     * Returns an array of Asterisk configuration objects sorted by priority.
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function ($methodName=''){
                $arrObjects = [];
                $configsDir = appPath('src/Core/Asterisk/Configs');
                $modulesFiles = glob("{$configsDir}/*.php", GLOB_NOSORT);
                foreach ($modulesFiles as $file) {
                    $className        = pathinfo($file)['filename'];
                    if ($className === 'CoreConfigClass'){
                        continue;
                    }
                    $fullClassName = "\\MikoPBX\\Core\\Asterisk\\Configs\\{$className}";
                    if (class_exists($fullClassName)) {
                        $object = new $fullClassName();
                        if ($object instanceof AsteriskConfigClass){
                            $arrObjects[] = $object;
                        }
                    }
                }
                // Sort the array based on the priority value
                usort($arrObjects, function($a, $b) use ($methodName){
                    return $a->getMethodPriority($methodName) - $b->getMethodPriority($methodName);
                });
                return  $arrObjects;
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

}