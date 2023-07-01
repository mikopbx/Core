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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\PbxExtensionState;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\Modules\Setup\PbxExtensionSetupFailure;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Workers\WorkerDownloader;
use MikoPBX\PBXCoreREST\Workers\WorkerModuleInstaller;
use Phalcon\Di;
use Phalcon\Di\Injectable;
use GuzzleHttp;


/**
 * Class ModulesManagementProcessor
 *
 * Manages external modules for download, install, uninstall, enable, disable.
 *
 * @property Di di
 * @package MikoPBX\PBXCoreREST\Lib
 */
class ModulesManagementProcessor extends Injectable
{
    /**
     * Processes module management requests.
     *
     * @param array $request The request data.
     *
     * @return PBXApiResult An object containing the result of the API call.
     *
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action = $request['action'];
        $data = $request['data'];
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
            switch ($action) {
                case 'moduleStartDownload':
                    $module = $request['data']['uniqid'];
                    $url = $request['data']['url'];
                    $md5 = $request['data']['md5'];
                    $res = self::moduleStartDownload($module, $url, $md5);
                    break;
                case 'moduleDownloadStatus':
                    $module = $request['data']['uniqid'];
                    $res = self::moduleDownloadStatus($module);
                    break;
                case 'installNewModule':
                    $filePath = $data['filePath'];
                    $res = self::installModule($filePath);
                    break;
                case 'statusOfModuleInstallation':
                    $filePath = $data['filePath'];
                    $res = self::statusOfModuleInstallation($filePath);
                    break;
                case 'enableModule':
                    $moduleUniqueID = $data['uniqid'];
                    $res = self::enableModule($moduleUniqueID);
                    break;
                case 'disableModule':
                    $moduleUniqueID = $data['uniqid'];
                    $res = self::disableModule($moduleUniqueID);
                    break;
                case 'uninstallModule':
                    $moduleUniqueID = $data['uniqid'];
                    $keepSettings = $data['keepSettings'] === 'true';
                    $res = self::uninstallModule($moduleUniqueID, $keepSettings);
                    break;
                case 'getAvailableModules':
                    $res = self::getAvailableModules();
                    break;
                case 'getModuleLink':
                    $moduleReleaseId = $data['releaseId'];
                    $res = self::getModuleLink($moduleReleaseId);
                    break;
                default:
                    $res->messages[] = "Unknown action - {$action} in modulesCoreCallBack";
            }
        $res->function = $action;

        return $res;
    }

    /**
     * Installs a new additional extension module from an early uploaded zip archive.
     *
     * @param string $filePath The path to the module file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function installModule(string $filePath): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $resModuleMetadata = self::getMetadataFromModuleFile($filePath);
        if (!$resModuleMetadata->success) {
            return $resModuleMetadata;
        }

        $moduleUniqueID = $resModuleMetadata->data['uniqid'];
        // Disable the module if it's enabled
        if (PbxExtensionUtils::isEnabled($moduleUniqueID)) {
            $res = self::disableModule($moduleUniqueID);
            if (!$res->success) {
                return $res;
            }
        }

        $currentModuleDir = PbxExtensionUtils::getModuleDir($moduleUniqueID);
        $needBackup = is_dir($currentModuleDir);

        if ($needBackup) {
            self::uninstallModule($moduleUniqueID, true);
        }

        // Start the background process to install the module
        $temp_dir = dirname($filePath);

        // Create a progress file to track the installation progress
        file_put_contents($temp_dir . '/installation_progress', '0');

        // Create an error file to store any installation errors
        file_put_contents($temp_dir . '/installation_error', '');

        $install_settings = [
            'filePath' => $filePath,
            'currentModuleDir' => $currentModuleDir,
            'uniqid' => $moduleUniqueID,
        ];

        // Save the installation settings to a JSON file
        $settings_file = "{$temp_dir}/install_settings.json";
        file_put_contents(
            $settings_file,
            json_encode($install_settings, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)
        );
        $phpPath = Util::which('php');
        $workerFilesMergerPath = Util::getFilePathByClassName(WorkerModuleInstaller::class);

        // Execute the background process to install the module
        Processes::mwExecBg("{$phpPath} -f {$workerFilesMergerPath} start '{$settings_file}'");
        $res->data['filePath'] = $filePath;
        $res->success = true;

        return $res;
    }

    /**
     * Uninstall extension module
     *
     * @param string $moduleUniqueID The unique ID of the module to uninstall.
     * @param bool $keepSettings Indicates whether to keep the module settings.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function uninstallModule(string $moduleUniqueID, bool $keepSettings): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $currentModuleDir = PbxExtensionUtils::getModuleDir($moduleUniqueID);

        // Kill all module processes
        if (is_dir("{$currentModuleDir}/bin")) {
            $busyboxPath = Util::which('busybox');
            $killPath = Util::which('kill');
            $lsofPath = Util::which('lsof');
            $grepPath = Util::which('grep');
            $awkPath = Util::which('awk');
            $uniqPath = Util::which('uniq');

            // Execute the command to kill all processes related to the module
            Processes::mwExec(
                "{$busyboxPath} {$killPath} -9 $({$lsofPath} {$currentModuleDir}/bin/* |  {$busyboxPath} {$grepPath} -v COMMAND | {$busyboxPath} {$awkPath}  '{ print $2}' | {$busyboxPath} {$uniqPath})"
            );
        }

        // Uninstall module with keep settings and backup db
        $moduleClass = "\\Modules\\{$moduleUniqueID}\\Setup\\PbxExtensionSetup";

        try {
            if (class_exists($moduleClass)
                && method_exists($moduleClass, 'uninstallModule')) {
                // Instantiate the module setup class and call the uninstallModule method
                $setup = new $moduleClass($moduleUniqueID);
            } else {

                // Use a fallback class to uninstall the module from the database if it doesn't exist on disk
                $moduleClass = PbxExtensionSetupFailure::class;
                $setup = new $moduleClass($moduleUniqueID);
            }
            $setup->uninstallModule($keepSettings);
        } finally {
            if (is_dir($currentModuleDir)) {
                // If the module directory still exists, force uninstallation
                $rmPath = Util::which('rm');

                // Remove the module directory recursively
                Processes::mwExec("{$rmPath} -rf {$currentModuleDir}");

                // Use the fallback class to unregister the module from the database
                $moduleClass = PbxExtensionSetupFailure::class;
                $setup = new $moduleClass($moduleUniqueID);
                $setup->unregisterModule();
            }
        }
        $res->success = true;

        return $res;
    }

    /**
     * Enables extension module.
     *
     * @param string $moduleUniqueID
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private static function enableModule(string $moduleUniqueID): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $moduleStateProcessor = new PbxExtensionState($moduleUniqueID);
        if ($moduleStateProcessor->enableModule() === false) {
            $res->success = false;
            $res->messages = $moduleStateProcessor->getMessages();
        } else {
            PBXConfModulesProvider::recreateModulesProvider();
            $res->data = $moduleStateProcessor->getMessages();
            $res->success = true;
        }

        return $res;
    }

    /**
     * Disables extension module.
     *
     * @param string $moduleUniqueID
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private static function disableModule(string $moduleUniqueID): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $moduleStateProcessor = new PbxExtensionState($moduleUniqueID);
        if ($moduleStateProcessor->disableModule() === false) {
            $res->success = false;
            $res->messages = $moduleStateProcessor->getMessages();
        } else {
            PBXConfModulesProvider::recreateModulesProvider();
            $res->data = $moduleStateProcessor->getMessages();
            $res->success = true;
        }

        return $res;
    }

    /**
     * Checks the status of a module installation by the provided zip file path.
     *
     * @param string $filePath The path of the module installation file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function statusOfModuleInstallation(string $filePath): PBXApiResult
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
            $res->success = true;
            $res->data['i_status'] = 'PROGRESS_FILE_NOT_FOUND';
            $res->data['i_status_progress'] = '0';
        } elseif (file_get_contents($error_file) !== '') {
            $res->success = true;
            $res->data['i_status'] = 'INSTALLATION_ERROR';
            $res->data['i_status_progress'] = '0';
            $res->messages[] = file_get_contents($error_file);
        } elseif ('100' === file_get_contents($progress_file)) {
            $res->success = true;
            $res->data['i_status_progress'] = '100';
            $res->data['i_status'] = 'INSTALLATION_COMPLETE';
        } else {
            $res->success = true;
            $res->data['i_status'] = 'INSTALLATION_IN_PROGRESS';
            $res->data['i_status_progress'] = file_get_contents($progress_file);
        }

        return $res;
    }

    /**
     * Starts the module download in a separate background process.
     *
     * @param string $module The module name.
     * @param string $url The download URL of the module.
     * @param string $md5 The MD5 hash of the module file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function moduleStartDownload(string $module, string $url, string $md5): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $di = Di::getDefault();
        if ($di !== null) {
            $tempDir = $di->getShared(ConfigProvider::SERVICE_NAME)->path('www.uploadDir');
        } else {
            $tempDir = '/tmp';
        }

        $moduleDirTmp = "{$tempDir}/{$module}";
        Util::mwMkdir($moduleDirTmp);

        $download_settings = [
            'res_file' => "$moduleDirTmp/modulefile.zip",
            'url' => $url,
            'module' => $module,
            'md5' => $md5,
            'action' => 'moduleInstall',
        ];
        if (file_exists("$moduleDirTmp/error")) {
            unlink("$moduleDirTmp/error");
        }
        if (file_exists("$moduleDirTmp/installed")) {
            unlink("$moduleDirTmp/installed");
        }
        file_put_contents("$moduleDirTmp/progress", '0');
        file_put_contents(
            "$moduleDirTmp/download_settings.json",
            json_encode($download_settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );
        $workerDownloaderPath = Util::getFilePathByClassName(WorkerDownloader::class);
        $phpPath = Util::which('php');
        Processes::mwExecBg("{$phpPath} -f {$workerDownloaderPath} start {$moduleDirTmp}/download_settings.json");

        $res->data['uniqid'] = $module;
        $res->data['d_status'] = 'DOWNLOAD_IN_PROGRESS';
        $res->success = true;

        return $res;
    }

    /**
     * Returns the download status of a module.
     *
     * @param string $moduleUniqueID The unique ID of the module.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function moduleDownloadStatus(string $moduleUniqueID): PBXApiResult
    {
        clearstatcache();
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $di = Di::getDefault();
        if ($di !== null) {
            $tempDir = $di->getShared(ConfigProvider::SERVICE_NAME)->path('www.uploadDir');
        } else {
            $tempDir = '/tmp';
        }
        $moduleDirTmp = $tempDir . '/' . $moduleUniqueID;
        $progress_file = $moduleDirTmp . '/progress';
        $error = '';
        if (file_exists($moduleDirTmp . '/error')) {
            $error = trim(file_get_contents($moduleDirTmp . '/error'));
        }

        // Wait until download process started
        $d_pid = Processes::getPidOfProcess("{$moduleDirTmp}/download_settings.json");
        if (empty($d_pid)) {
            usleep(500000);
        }

        if (!file_exists($progress_file)) {
            $res->data['d_status_progress'] = '0';
            $res->data['d_status'] = 'NOT_FOUND';
            $res->success = false;
        } elseif ('' !== $error) {
            $res->data['d_status'] = 'DOWNLOAD_ERROR';
            $res->data['d_status_progress'] = file_get_contents($progress_file);
            $res->data['d_error'] = $error;
            $res->messages[] = file_get_contents($moduleDirTmp . '/error');
            $res->success = false;
        } elseif ('100' === file_get_contents($progress_file)) {
            $res->data['d_status_progress'] = '100';
            $res->data['d_status'] = 'DOWNLOAD_COMPLETE';
            $res->data['filePath'] = "$moduleDirTmp/modulefile.zip";
            $res->success = true;
        } else {
            $res->data['d_status_progress'] = file_get_contents($progress_file);
            $d_pid = Processes::getPidOfProcess($moduleDirTmp . '/download_settings.json');
            if (empty($d_pid)) {
                $res->data['d_status'] = 'DOWNLOAD_ERROR';
                if (file_exists($moduleDirTmp . '/error')) {
                    $res->messages[] = file_get_contents($moduleDirTmp . '/error');
                } else {
                    $res->messages[] = "Download process interrupted at {$res->data['d_status_progress']}%";
                }
                $res->success = false;
            } else {
                $res->data['d_status'] = 'DOWNLOAD_IN_PROGRESS';
                $res->success = true;
            }
        }

        return $res;
    }

    /**
     * Unpacks a module ZIP file and retrieves metadata information from the JSON config inside.
     *
     * @param string $filePath The file path of the module.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function getMetadataFromModuleFile(string $filePath): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        if (file_exists($filePath)) {
            $sevenZaPath = Util::which('7za');
            $grepPath = Util::which('grep');
            $echoPath = Util::which('echo');
            $awkPath = Util::which('awk');
            $cmd = 'f="' . $filePath . '"; p=`' . $sevenZaPath . ' l $f | ' . $grepPath . ' module.json`;if [ "$?" == "0" ]; then ' . $sevenZaPath . ' -so e -y -r $f `' . $echoPath . ' $p |  ' . $awkPath . ' -F" " \'{print $6}\'`; fi';

            Processes::mwExec($cmd, $out);
            $settings = json_decode(implode("\n", $out), true);

            $moduleUniqueID = $settings['moduleUniqueID'] ?? null;
            if (!$moduleUniqueID) {
                $res->messages[] = 'The" moduleUniqueID " in the module file is not described.the json or file does not exist.';

                return $res;
            }
            $res->success = true;
            $res->data = [
                'filePath' => $filePath,
                'uniqid' => $moduleUniqueID,
            ];
        }

        return $res;
    }

    /**
     * Retrieves available modules on MIKO repository.
     *
     * @return PBXApiResult
     */
    public static function getAvailableModules(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $di = Di::getDefault();
        if ($di === null) {
            $res->success    = false;
            $res->messages[] = 'Dependency injector does not initialized';
            return $res;
        }
        $WebUiLanguage = PbxSettings::getValueByKey('WebAdminLanguage');
        $cacheKey = "ModulesManagementProcessor:getAvailableModules:$WebUiLanguage";
        $managedCache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        if ($managedCache->has($cacheKey)){
            $body = $managedCache->get($cacheKey);
        } else {
            $PBXVersion = PbxSettings::getValueByKey('PBXVersion');
            $PBXVersion = (string)str_ireplace('-dev', '', $PBXVersion);
            $body = '';
            $client = new GuzzleHttp\Client();
            try {
                $request = $client->request(
                    'POST',
                    'https://releases.mikopbx.com/releases/v1/mikopbx/getAvailableModules',
                    [
                        'headers' => [
                            'Content-Type' => 'application/json; charset=utf-8',
                        ],
                        'json' => [
                            'PBXVER' => $PBXVersion,
                            'LANGUAGE'=> $WebUiLanguage,
                        ],
                        'timeout' => 5,
                    ]
                );
                $code = $request->getStatusCode();
                if ($code === Response::OK){
                    $body = $request->getBody()->getContents();
                    $managedCache->set($cacheKey, $body, 3600);
                }
            } catch (\Throwable $e) {
                $code = Response::INTERNAL_SERVER_ERROR;
                Util::sysLogMsg(static::class, $e->getMessage());
                $res->messages[] = $e->getMessage();
            }

            if ($code !== Response::OK) {
                return $res;
            }
        }
        $res->data = json_decode($body, true)??[];
        $res->success = true;

        return $res;
    }

    /**
     * Retrieves the installation link for a module.
     *
     * @param string $moduleReleaseId The module release unique id retrieved on getAvailableModules
     *
     * @return PBXApiResult
     */
    public static function getModuleLink(string $moduleReleaseId): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $licenseKey = PbxSettings::getValueByKey('PBXLicense');

        $client = new GuzzleHttp\Client();
        $body = '';
        try {
            $request = $client->request(
                'POST',
                'https://releases.mikopbx.com/releases/v1/mikopbx/getModuleLink',
                [
                    'headers' => [
                        'Content-Type' => 'application/json; charset=utf-8',
                    ],
                    'json' => [
                        'LICENSE' => $licenseKey,
                        'RELEASEID'=> $moduleReleaseId,
                    ],
                    'timeout' => 5,
                ]
            );
            $code = $request->getStatusCode();
            if ($code === Response::OK){
                $body = $request->getBody()->getContents();
            }
        } catch (\Throwable $e) {
            $code = Response::INTERNAL_SERVER_ERROR;
            Util::sysLogMsg(static::class, $e->getMessage());
            $res->messages[] = $e->getMessage();
        }

        if ($code !== Response::OK) {
            return $res;
        }

        $res->data = json_decode($body, true)??[];
        $res->success = true;
        return $res;
    }

}