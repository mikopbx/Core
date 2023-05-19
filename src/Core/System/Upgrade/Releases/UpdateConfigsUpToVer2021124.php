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

namespace MikoPBX\Core\System\Upgrade\Releases;

use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;
use MikoPBX\Core\System\MikoPBXConfig;
use Phalcon\Config as ConfigAlias;

class UpdateConfigsUpToVer2021124 extends Injectable implements UpgradeSystemConfigInterface
{
  	public const PBX_VERSION = '2021.1.24';

	private ConfigAlias $config;
    private MikoPBXConfig $mikoPBXConfig;
    private bool $isLiveCD;

	/**
     * Class constructor.
     */
    public function __construct()
    {
        $this->config = $this->getDI()->getShared('config');
        $this->mikoPBXConfig = new MikoPBXConfig();
        $this->isLiveCD      = file_exists('/offload/livecd');
    }

	/**
     * Main function
     */
    public function processUpdate():void
    {
  		if ($this->isLiveCD) {
            return;
        }
        $this->deleteOldCacheFolders();
    }

    /**
     * Deletes all not actual cache folders
     */
    private function deleteOldCacheFolders()
    {
        $oldCacheFolders = [
            '/storage/usbdisk1/mikopbx/tmp/models_cache',
            '/storage/usbdisk1/mikopbx/tmp/managed_cache',
            '/storage/usbdisk1/mikopbx/tmp/www_cache/managed_cache',
            '/storage/usbdisk1/mikopbx/tmp/www_cache/models_cache',
            '/storage/usbdisk1/mikopbx/tmp/www_cache/js',
            '/storage/usbdisk1/mikopbx/tmp/www_cache/css',
            '/storage/usbdisk1/mikopbx/tmp/www_cache/img',
            '/storage/usbdisk1/mikopbx/tmp/www_cache/php_session',
        ];
        foreach ($oldCacheFolders as $cacheDir){
            if (is_dir($cacheDir)){
                Util::rRmDir($cacheDir);
            }
        }
    }
}