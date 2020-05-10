<?php

declare(strict_types=1);

namespace MikoPBX\Common\Config;

use function function_exists;

if (true !== function_exists('MikoPBX\Common\Config\appPath')) {
    /**
     * Get the application path.
     *
     * @param string $path
     *
     * @return string
     */
    function appPath(string $path = ''): string
    {
        return dirname(dirname(dirname(__DIR__))) . ($path ? DIRECTORY_SEPARATOR . $path : $path);
    }
}
