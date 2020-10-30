<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Modules;

use Phalcon\Config;
use Phalcon\Di;
use Phalcon\Di\DiInterface;
use Phalcon\Di\Exception;
use ReflectionClass as ReflectionClassAlias;

/**
 * Class PbxExtensionBase
 * Общие для всех модулей методы
 * Подключается при установке, удалении модуля
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
        $this->config  = $this->di->getShared('config');
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