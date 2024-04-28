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
use ZipArchive;

/**
 * Class GetMetadataFromModulePackage
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class GetMetadataFromModulePackageAction extends \Phalcon\Di\Injectable
{
    /**
     * Unpacks a module ZIP file and retrieves metadata information from the JSON config inside.
     *
     * @param string $filePath The file path of the module.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $filePath): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        if (file_exists($filePath)) {
            $moduleUniqueID = false;
            $zip = new ZipArchive();
            if ($zip->open($filePath) === TRUE) {
                $out = $zip->getFromName('module.json');
                $zip->close();
                $settings       = json_decode($out, true);
                $moduleUniqueID = $settings['moduleUniqueID'] ?? null;
            }
            if (!$moduleUniqueID) {
                $res->messages[] = 'The" moduleUniqueID " in the module file is not described.the json or file does not exist.';
                return $res;
            }
            $res->success = true;
            $res->data = [
                'filePath' => $filePath,
                'uniqid'   => $moduleUniqueID,
            ];
        }

        return $res;
    }
}