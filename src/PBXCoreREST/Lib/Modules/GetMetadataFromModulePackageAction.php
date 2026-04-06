<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use ZipArchive;
use Phalcon\Di\Injectable;

/**
 * Class GetMetadataFromModulePackage
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class GetMetadataFromModulePackageAction extends Injectable
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

        if (!file_exists($filePath)) {
            $res->messages[] = TranslationProvider::translate('ext_FileNotFound', ['filePath' => $filePath]);
            return $res;
        }

        $zip = new ZipArchive();
        $openResult = $zip->open($filePath);

        if ($openResult !== true) {
            // ZIP file is corrupted or cannot be opened
            $errorCode = match($openResult) {
                ZipArchive::ER_NOZIP => 'NOT_ZIP',
                ZipArchive::ER_INCONS => 'INCONSISTENT',
                ZipArchive::ER_CRC => 'CRC_ERROR',
                ZipArchive::ER_READ => 'READ_ERROR',
                ZipArchive::ER_SEEK => 'SEEK_ERROR',
                default => 'UNKNOWN_ERROR'
            };

            $res->messages[] = TranslationProvider::translate('ext_CorruptedZipFile', [
                'filePath' => $filePath,
                'errorCode' => $errorCode
            ]);
            return $res;
        }

        // Try to extract module.json
        $moduleJsonContent = $zip->getFromName('module.json');
        $zip->close();

        if ($moduleJsonContent === false) {
            $res->messages[] = TranslationProvider::translate('ext_ModuleJsonNotFound', [
                'filePath' => $filePath
            ]);
            return $res;
        }

        // Try to decode JSON
        $settings = json_decode($moduleJsonContent, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $res->messages[] = TranslationProvider::translate('ext_InvalidModuleJson', [
                'filePath' => $filePath,
                'error' => json_last_error_msg()
            ]);
            return $res;
        }

        // Check if moduleUniqueID exists
        $moduleUniqueID = $settings['moduleUniqueID'] ?? null;

        if (empty($moduleUniqueID)) {
            $res->messages[] = TranslationProvider::translate('ext_MissingModuleUniqueID', [
                'filePath' => $filePath
            ]);
            return $res;
        }

        $res->success = true;
        $res->data = [
            'filePath' => $filePath,
            'uniqid'   => $moduleUniqueID,
        ];

        return $res;
    }
}