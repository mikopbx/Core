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

namespace MikoPBX\PBXCoreREST\Lib\Modules;

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di;

/**
 *  Class StatusOfModuleInstallation
 *  Checks the status of a module installation by the provided zip file path.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class StatusOfModuleInstallationAction extends \Phalcon\Di\Injectable
{
    const PROGRESS_FILE_NOT_FOUND = 'PROGRESS_FILE_NOT_FOUND';
    const INSTALLATION_ERROR = 'INSTALLATION_ERROR';
    const INSTALLATION_COMPLETE = 'INSTALLATION_COMPLETE';
    const INSTALLATION_IN_PROGRESS = 'INSTALLATION_IN_PROGRESS';
    const I_STATUS = 'i_status';
    const I_STATUS_PROGRESS = 'i_status_progress';

    /**
     * Checks the status of a module installation by the provided zip file path.
     *
     * @param string $filePath The path of the module installation file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $filePath): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $di = Di::getDefault();
        if ($di === null) {
            $res->messages[] = 'Dependency injector does not initialized';

            return $res;
        }
        $temp_dir = dirname($filePath);
        $progress_file = $temp_dir . '/installation_progress';
        $error_file = $temp_dir . '/installation_error';
        if (!file_exists($error_file) || !file_exists($progress_file)) {
            $res->success = false;
            $res->data[self::I_STATUS] = self::PROGRESS_FILE_NOT_FOUND;
            $res->data[self::I_STATUS_PROGRESS] = '0';
        } elseif (file_get_contents($error_file) !== '') {
            $res->success = false;
            $res->data[self::I_STATUS] = self::INSTALLATION_ERROR;
            $res->data[self::I_STATUS_PROGRESS] = '0';
            $res->messages['error'][] = file_get_contents($error_file);
        } elseif ('100' === file_get_contents($progress_file)) {
            $res->success = true;
            $res->data[self::I_STATUS_PROGRESS] = '100';
            $res->data[self::I_STATUS] = self::INSTALLATION_COMPLETE;

            $resModuleMetadata = GetMetadataFromModulePackageAction::main($filePath);
            if ($resModuleMetadata->success) {
                $res->data['uniqid'] = $resModuleMetadata->data['uniqid'];
            }

        } else {
            $res->success = true;
            $res->data[self::I_STATUS] = self::INSTALLATION_IN_PROGRESS;
            $res->data[self::I_STATUS_PROGRESS] = file_get_contents($progress_file);
        }

        return $res;
    }
}