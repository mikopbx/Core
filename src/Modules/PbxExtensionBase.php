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

namespace MikoPBX\Modules;

use Phalcon\Config;
use Phalcon\Di;
use ReflectionClass as ReflectionClassAlias;

/**
 * Class PbxExtensionBase
 * Common methods for all modules.
 *
 * @package MikoPBX\Modules
 */
abstract class PbxExtensionBase extends Di\Injectable
{
    /**
     * Module directory
     * @var string
     */
    public string $moduleDir;

    /**
     * Additional module UniqueID
     * @var string
     */
    public string $moduleUniqueId;

    /**
     * Phalcon config service
     */
    public Config $config;

    /**
     * Module Logger
     */
    public Logger $logger;


    /**
     * PbxExtensionBase constructor.
     *
     */
    public function __construct()
    {
        $this->config  = $this->getDI()->getShared('config');
        $modulesDir    = $this->config->path('core.modulesDir');

        if (empty($this->moduleUniqueId)){
            // Get child class parameters and define module Dir and UniqueID
            $reflector = new ReflectionClassAlias(static::class);
            $partsOfNameSpace = explode('\\', $reflector->getNamespaceName());
            if (count($partsOfNameSpace)===3 && $partsOfNameSpace[0]==='Modules'){
                $this->moduleUniqueId = $partsOfNameSpace[1];
                $this->moduleDir =  $modulesDir.'/'.$this->moduleUniqueId;
            }
        } else {
            $this->moduleDir  = "{$modulesDir}{$this->moduleUniqueId}";
        }

        $className        = basename(str_replace('\\', '/', static::class));
        $this->logger =  new Logger($className, $this->moduleUniqueId);

    }
}