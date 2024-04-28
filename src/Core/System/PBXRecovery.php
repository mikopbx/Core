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

namespace MikoPBX\Core\System;

/**
 * Class PBXRecovery
 *
 * Class responsible for managing the recovery process of a PBX system.
 *
 * @package MikoPBX\Core\System
 */
class PBXRecovery
{
    // ASCII codes for colored output
    const REDON    = "\033[31;1m";
    const REDOFF   = "\033[0m";
    const GREENON  = "\033[32;1m";
    const GREENOFF = "\033[0m";

    // Recover disk name
    private string $DEVICE;

    // Version info
    private string $VERSION;

    // File pointer
    private $fp;

    /**
     * PBXRecovery constructor.
     *
     * Initializes file pointer, storage, disk name and version
     */
    public function __construct()
    {
        $this->fp      = fopen('php://stdin', 'r');
        $storage = new Storage();
        $this->DEVICE  = basename($storage->getRecoverDiskName());
        $this->VERSION = trim(file_get_contents('/offload/version'));
    }

    /**
     * Main runner method
     *
     * Clears the terminal and provides the user with recovery options.
     * Handles the user's selection input.
     */
    public function run()
    {
        system('clear');
        echo "\n";
        echo Util::translate("Install or recovery")."\n";
        echo "*******************************\n";
        echo "1) ".Util::translate('Install')." ".self::REDON.Util::translate('All settings will be lost!').self::REDOFF."\n";
        echo "2) ".Util::translate('Reinstall to')." ".$this->VERSION. ". ".self::GREENON.Util::translate('All settings will be kept!').self::GREENOFF."\n";
        echo "3) ".Util::translate('Cancel')."\n\n";
        echo Util::translate('Enter a number').": ";

        $input = trim(fgets($this->fp));
        $this->handleInput($input);
    }

    /**
     * Handle user input
     *
     * Executes the appropriate recovery process based on the user's selection.
     *
     * @param string $input User's selection input
     */
    private function handleInput(string $input)
    {
        switch ($input) {
            case '1':
                // Prepare for installation
                file_put_contents('/tmp/ejectcd', '');
                $installer = new PBXInstaller();
                $installer->run();
                break;
            case '2':
                // Prepare for reinstalling
                file_put_contents('/tmp/ejectcd', '');
                $pbx_firmwarePath = Util::which('pbx_firmware');
                passthru("{$pbx_firmwarePath} /offload/firmware.img.gz {$this->DEVICE}");
                break;
            case '3':
                // Cancel operation
                break;
        }
        sleep(3);
    }
}