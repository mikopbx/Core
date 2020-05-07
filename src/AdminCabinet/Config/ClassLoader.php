<?php

declare(strict_types=1);

namespace MikoPBX\AdminCabinet\Config;

use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Modules\ClassLoader as ModulesClassLoader;
use Phalcon\Di;
use Phalcon\Loader;
use function MikoPBX\Common\Config\appPath;

class ClassLoader
{
    public static function init(Di $di) :void
    {
        // Register the auto loader
        require __DIR__ . '/../../Common/Config/functions.php';
        require appPath('vendor/autoload.php');

        // $loader = new Loader();
        //
        // /**
        //  * Composer Autoloader
        //  */
        // $arrFiles[]   = '../../src/vendor/autoload.php';
        // $loader->registerFiles($arrFiles);
        // $loader->register();
        $di->register(new ConfigProvider());

        // Зарегаем классы модулей
        ModulesClassLoader::init();
    }
}