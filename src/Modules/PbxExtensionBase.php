<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Modules;

use Phalcon\Di;
use Phalcon\Di\Exception;

/**
 * Class PbxExtensionBase
 * Общие для всех модулей методы
 * Подключается при установке, удалении модуля
 */
abstract class PbxExtensionBase
{
    /**
     * Dependency injector
     */
    protected Di $di;


    /**
     * Module directory
     * @var string
     */
    public string $moduleDir;

    /**
     * Phalcon config service
     */
    public \Phalcon\Config $config;

    /**
     * Module Logger
     */
    public Logger $logger;


    /**
     * PbxExtensionBase constructor.
     *
     * @param string $moduleUniqueID
     *
     * @throws \Phalcon\Di\Exception
     */
    public function __construct(string $moduleUniqueID)
    {
        $this->di      = Di::getDefault();
        if ($this->di === null){
            throw new Exception('\Phalcon\DI not installed');
        }
        $this->config  = $this->di->getShared('config');

        $modulesDir = $this->config->path('core.modulesDir') . '/' . $moduleUniqueID;
        $this->moduleDir  = "{$modulesDir}{$moduleUniqueID}";

        $className        = basename(str_replace('\\', '/', static::class));
        $this->logger =  new Logger($className, $moduleUniqueID);
        
    }
}