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

use Phalcon\Config\Config;
use Phalcon\Di\Injectable;
use ReflectionClass as ReflectionClassAlias;

/**
 * Class PbxExtensionBase
 * Common methods for all modules.
 *
 * Extends Phalcon's Injectable, so a DI container with a `config` service must be
 * available when an instance is constructed — the constructor reads
 * `core.modulesDir` from it.
 *
 * If $moduleUniqueId is not set by the subclass, the constructor auto-detects it
 * from the class namespace: for a class in `Modules\{ModuleUniqueID}\...` (exactly
 * three namespace segments with the first being `Modules`), $moduleUniqueId becomes
 * the second segment and $moduleDir becomes `{modulesDir}/{moduleUniqueId}`. When
 * $moduleUniqueId is provided explicitly, $moduleDir is built by concatenating it
 * onto $modulesDir instead.
 *
 * @package MikoPBX\Modules
 */
abstract class PbxExtensionBase extends Injectable
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
     * Resolves the `config` service from the DI container, derives $moduleDir and
     * $moduleUniqueId (see the class docblock), and creates the module Logger.
     *
     * @throws \Phalcon\Di\Exception If no DI container is set or it has no `config` service.
     */
    public function __construct()
    {
        $this->config  = $this->getDI()->getShared('config');
        $modulesDir    = $this->config->path('core.modulesDir');

        if (empty($this->moduleUniqueId)) {
            // Get child class parameters and define module Dir and UniqueID
            $reflector = new ReflectionClassAlias(static::class);
            $partsOfNameSpace = explode('\\', $reflector->getNamespaceName());
            if (count($partsOfNameSpace) === 3 && $partsOfNameSpace[0] === 'Modules') {
                $this->moduleUniqueId = $partsOfNameSpace[1];
                $this->moduleDir =  $modulesDir . '/' . $this->moduleUniqueId;
            }
        } else {
            $this->moduleDir  = "$modulesDir$this->moduleUniqueId";
        }

        $className        = basename(str_replace('\\', '/', static::class));
        $this->logger =  new Logger($className, $this->moduleUniqueId);
    }
}
