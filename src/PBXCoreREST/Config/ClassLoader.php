<?php

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Config;

use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Core\Modules\ClassLoader as ModulesClassLoader;
use Phalcon\Di;
use Phalcon\Loader;
use function MikoPBX\Common\Config\appPath;

class ClassLoader
{
    public static function init(Di $di) :void
    {

        require __DIR__ . '/../../Common/Config/functions.php';
        require appPath('vendor/autoload.php');

        // $loader = new Loader();
        // /**
        //  * We're a registering a set of directories taken from the configuration file
        //  */
        // $arrFiles[]   = '../src/vendor/autoload.php';
        // $loader->registerFiles($arrFiles);
        // $loader->register();

        $di->register(new ConfigProvider());

        // Зарегаем классы модулей
        ModulesClassLoader::init();
    }
}