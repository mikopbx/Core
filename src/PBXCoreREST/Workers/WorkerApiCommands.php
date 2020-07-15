<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\PBXCoreREST\Workers;

use MikoPBX\Core\Asterisk\CdrDb;
use MikoPBX\Core\Asterisk\Configs\{IAXConf, SIPConf, VoiceMailConf};
use MikoPBX\Core\System\{BeanstalkClient,
    TimeManagement,
    Firewall,
    Notifications,
    Storage,
    System,
    UploadAndConvertFiles,
    Util};
use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Core\Workers\WorkerMergeUploadedFile;
use MikoPBX\Modules\Setup\PbxExtensionSetupFailure;
use MikoPBX\Modules\PbxExtensionState;
use Phalcon\Exception;

use function MikoPBX\Common\Config\appPath;

require_once 'Globals.php';

class WorkerApiCommands extends WorkerBase
{
    /**
     * Modules can expose additional REST methods and processors,
     * look at src/Modules/Config/RestAPIConfigInterface.php
     */
    private array $additionalProcessors;

    /**
     * @param $argv
     */
    public function start($argv): void
    {
        $client = new BeanstalkClient();
        $client->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);
        $client->subscribe(__CLASS__, [$this, 'prepareAnswer']);

        // Every module config class can process requests under root rights,
        // if it described in Config class
        $additionalModules = $this->di->getShared('pbxConfModules');
        $this->additionalProcessors=[];
        foreach ($additionalModules as $moduleConfigObject) {
            if ($moduleConfigObject->moduleUniqueId!=='InternalConfigModule'
                && method_exists($moduleConfigObject, 'moduleRestAPICallback')
            ) {
                $this->additionalProcessors[] = [
                    $moduleConfigObject->moduleUniqueId,
                    $moduleConfigObject,
                    'moduleRestAPICallback'
                ];
            }
        }

        while (true) {
            try {
                $client->wait();
            } catch (Exception $e) {
                global $errorLogger;
                $errorLogger->captureException($e);
                sleep(1);
            }
        }
    }


    /**
     * Process request
     *
     * @param BeanstalkClient $message
     */
    public function prepareAnswer($message): void
    {
        try {
            $request   = json_decode($message->getBody(), true, 512, JSON_THROW_ON_ERROR);
            $processor = $request['processor'];

            switch ($processor) {
                case 'cdr':
                    $answer = $this->cdrCallBack($request);
                    break;
                case 'sip':
                    $answer = $this->sipCallBack($request);
                    break;
                case 'iax':
                    $answer = $this->iaxCallBack($request);
                    break;
                case 'system':
                    $answer = $this->systemCallBack($request);
                    break;
                case 'storage':
                    $answer = $this->storageCallBack($request);
                    break;
                case 'upload':
                    $answer = $this->uploadCallBack($request);
                    break;
                case 'modules':
                    $answer = $this->modulesCallBack($request);
                    break;
                default:
                    $answer = "Unknown processor - {$processor}";
            }
        } catch (\Exception $exception) {
            $answer = 'Exception on WorkerApiCommands - ' . $exception->getMessage();
        }

         $message->reply(json_encode($answer));
    }

    /**
     * Запросы с CDR таблице
     *
     * @param array $request
     */
    private function cdrCallBack($request): array
    {
        $action = $request['action'];
        switch ($action) {
            case 'getActiveCalls':
                $result['data'] = CdrDb::getActiveCalls();
                break;
            case 'getActiveChannels':
                $result['data'] = CdrDb::getActiveChannels();
                break;
            default:
                $result = ["Unknown action - {$action}"];
                break;
        }

        return $result;
    }

    /**
     * Обработка команд SIP.
     *
     * @param array $request
     */
    private function sipCallBack($request): array
    {
        $action = $request['action'];
        $data   = $request['data'];

        $result = [
            'result' => 'ERROR',
        ];
        if ('getPeersStatuses' === $action) {
            $result = SIPConf::getPeersStatuses();
        } elseif ('getSipPeer' === $action) {
            $result = SIPConf::getPeerStatus($data['peer']);
        } elseif ('getRegistry' === $action) {
            $result = SIPConf::getRegistry();
        } else {
            $result['data'] = 'API action not found in sipCallBack;';
        }
        $result['function'] = $action;

        return $result;
    }

    /**
     * Обработка команду IAX.
     *
     * @param array $request
     */
    private function iaxCallBack($request): array
    {
        $action = $request['action'];
        $result = [
            'result' => 'ERROR',
        ];
        if ('getRegistry' === $action) {
            $result = IAXConf::getRegistry();
        } else {
            $result['data'] = 'API action not found in iaxCallBack;';
        }
        $result['function'] = $action;

        return $result;
    }

    /**
     * Обработка системных команд.
     *
     * @param array $request
     */
    private function systemCallBack($request)
    {
        $action = $request['action'];
        $data   = $request['data'];

        $result = [
            'result' => 'ERROR',
        ];

        switch ($action){
            case 'reboot':
                $result['result'] = 'Success';
                System::rebootSync();
                break;
            case 'shutdown':
                $result['result'] = 'Success';
                System::shutdown();
                break;
            case 'mergeUploadedFile':
                $result['result'] = 'Success';
                $phpPath              = Util::which('php');
                $workerDownloaderPath = Util::getFilePathByClassName(WorkerMergeUploadedFile::class);
                Util::mwExecBg("{$phpPath} -f {$workerDownloaderPath} '{$data['settings_file']}'");
                break;
            case 'setDate':
                $result = TimeManagement::setDate($data['date']);
                break;
            case 'getInfo':
                $result = System::getInfo();
                break;
            case 'sendMail':
                if (isset($data['email']) && isset($data['subject']) && isset($data['body'])) {
                    if (isset($data['encode']) && $data['encode'] === 'base64') {
                        $data['subject'] = base64_decode($data['subject']);
                        $data['body']    = base64_decode($data['body']);
                    }
                    $result = Notifications::sendMail($data['email'], $data['subject'], $data['body']);
                } else {
                    $result['message'] = 'Not all query parameters are populated.';
                }
                break;
            case 'fileReadContent':
                $result = Util::fileReadContent($data['filename'], $data['needOriginal']);
                break;
            case 'getExternalIpInfo':
                $result = System::getExternalIpInfo();
                break;
            case 'reloadMsmtp':
                $notifications = new Notifications();
                $result        = $notifications->configure();
                $OtherConfigs  = new VoiceMailConf();
                $OtherConfigs->generateConfig();
                $asteriskPath = Util::which('asterisk');
                Util::mwExec("{$asteriskPath} -rx 'voicemail reload'");
                break;
            case 'unBanIp':
                $result = Firewall::fail2banUnbanAll($data['ip']);
                break;
            case 'getBanIp':
                $result['result'] = 'Success';
                $result['data']   = Firewall::getBanIp();
                break;
            case 'startLog':
                $result['result'] = 'Success';
                Util::startLog();
                break;
            case 'stopLog':
                $result['result']   = 'Success';
                $result['filename'] = Util::stopLog();
                break;
            case 'statusUpgrade':
                $result = System::statusUpgrade();
                break;
            case 'upgradeOnline':
                $result = System::upgradeOnline($request['data']);
                break;
            case 'upgrade':
                $result = System::upgradeFromImg($data['temp_filename']);
                break;
            case 'removeAudioFile':
                $result = Util::removeAudioFile($data['filename']);
                break;
            case 'convertAudioFile':
                $mvPath = Util::which('mv');
                Util::mwExec("{$mvPath} {$data['temp_filename']} {$data['filename']}");
                $result = UploadAndConvertFiles::convertAudioFile($data['filename']);
                break;
            case 'uploadNewModule':
                $module = $request['data']['uniqid'];
                System::moduleStartDownload(
                    $module,
                    $request['data']['url'],
                    $request['data']['md5']
                );
                $result['uniqid']   = $module;
                $result['result']   = 'Success';
                break;
            case 'statusUploadingNewModule':
                $module = $request['data']['uniqid'];
                $result             = System::moduleDownloadStatus($module);
                $result['function'] = $action;
                $result['result']   = 'Success';
                break;
            case 'enableModule':
                $module = $request['data']['uniqid'];
                $moduleStateProcessor = new PbxExtensionState($module);
                if ($moduleStateProcessor->enableModule() === false) {
                    $result['messages'] = $moduleStateProcessor->getMessages();
                } else {
                    unset($result);
                    $result['result'] = 'Success';
                }
                break;
            case 'disableModule':
                $module = $request['data']['uniqid'];
                $moduleStateProcessor = new PbxExtensionState($module);
                if ($moduleStateProcessor->disableModule() === false) {
                    $result['messages'] = $moduleStateProcessor->getMessages();
                } else {
                    unset($result);
                    $result['result'] = 'Success';
                }
                break;
            case 'uninstallModule':
                $module = $request['data']['uniqid'];
                $moduleClass = "\\Modules\\{$module}\\Setup\\PbxExtensionSetup";
                if (class_exists($moduleClass)
                    && method_exists($moduleClass, 'uninstallModule')) {
                    $setup = new $moduleClass($module);
                } else {
                    // Заглушка которая позволяет удалить модуль из базы данных, которого нет на диске
                    $moduleClass = PbxExtensionSetupFailure::class;
                    $setup       = new $moduleClass($module);
                }
                $prams = json_decode($request['input'], true);
                if (is_array($prams) && array_key_exists('keepSettings', $prams)) {
                    $keepSettings = $prams['keepSettings'] === 'true';
                } else {
                    $keepSettings = false;
                }
                if ($setup->uninstallModule($keepSettings)) {
                    $result['result'] = 'Success';
                } else {
                    $result['result'] = 'Error';
                    $result['data']   = implode('<br>', $setup->getMessages());
                }
                WorkerSafeScriptsCore::restartAllWorkers();
                break;
            default:
                $result['message'] = 'API action not found in systemCallBack;';
        }

        $result['function'] = $action;
        return $result;
    }

    /**
     * Обработка команд управления дисками.
     *
     * @param array $request
     *
     * @return array
     */
    private function storageCallBack($request): array
    {
        $action = $request['action'];
        $data   = $request['data'];

        $result = [
            'result' => 'ERROR',
            'data'   => null,
        ];

        if ('list' === $action) {
            $st               = new Storage();
            $result['result'] = 'Success';
            $result['data']   = $st->getAllHdd();
        } elseif ('mount' === $action) {
            $res              = Storage::mountDisk($data['dev'], $data['format'], $data['dir']);
            $result['result'] = ($res === true) ? 'Success' : 'ERROR';
        } elseif ('umount' === $action) {
            $res              = Storage::umountDisk($data['dir']);
            $result['result'] = ($res === true) ? 'Success' : 'ERROR';
        } elseif ('mkfs' === $action) {
            $res              = Storage::mkfs_disk($data['dev']);
            $result['result'] = ($res === true) ? 'Success' : 'ERROR';
            $result['data']   = 'inprogress';
        } elseif ('statusMkfs' === $action) {
            $result['result'] = 'Success';
            $result['data']   = Storage::statusMkfs($data['dev']);
        }
        $result['function'] = $action;

        return $result;
    }

    /**
     * Обработка команд управления модулями.
     *
     * @param array $request
     *
     * @return array
     */
    private function modulesCallBack($request): array
    {
        clearstatcache();

        $action = $request['action'];
        $module = $request['module'];

        $result = [
            'result' => 'ERROR',
            'data'   => null,
        ];

        // Try process request over additional modules
        foreach ($this->additionalProcessors as [$moduleUniqueId, $moduleConfigObject, $callBack]) {
            if (stripos($module, $moduleUniqueId) === 0) {
                $result = $moduleConfigObject->$callBack($request);
                break;
            }
        }

        $result['function'] = $action;

        return $result;
    }

    /**
     * Upload files callback
     * @param $request
     *
     * @return array
     */
    private function uploadCallBack($request) :array
    {
        $action = $request['action'];
        $postData   = $request['data'];
        switch ($action) {
            case 'uploadResumable':
                $result = UploadAndConvertFiles::uploadResumable($postData);
                break;
            case 'status':
                $result = UploadAndConvertFiles::statusUploadFile($request['data']);
              break;
            default:
                $result = [
                    'result' => 'ERROR',
                    'message'=>'API action not found in uploadCallBack;'
                ];
        }

        $result['function'] = $action;
        return $result;
    }

}

// Start worker process
$workerClassname = WorkerApiCommands::class;
if (isset($argv) && count($argv) > 1 && $argv[1] === 'start') {
    cli_set_process_title($workerClassname);
    while (true) {
        try {
            $worker = new $workerClassname();
            $worker->start($argv);
        } catch (Exception $e) {
            global $errorLogger;
            $errorLogger->captureException($e);
            Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
        }
    }
}
