<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2020
 */

namespace MikoPBX\PBXCoreREST\Workers;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\Asterisk\Configs\VoiceMailConf;
use MikoPBX\Core\System\{BeanstalkClient, Notifications, Storage, System, Util};
use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\PBXCoreREST\Lib\CdrDBProcessor;
use MikoPBX\PBXCoreREST\Lib\FirewallManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\IAXStackProcessor;
use MikoPBX\PBXCoreREST\Lib\LogsManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\NetworkManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\SIPStackProcessor;
use MikoPBX\PBXCoreREST\Lib\SystemManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\FilesManagementProcessor;
use MikoPBX\Modules\PbxExtensionState;
use Phalcon\Exception;

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
        $additionalModules          = $this->di->getShared('pbxConfModules');
        $this->additionalProcessors = [];
        foreach ($additionalModules as $moduleConfigObject) {
            if ($moduleConfigObject->moduleUniqueId !== 'InternalConfigModule'
                && method_exists($moduleConfigObject, 'moduleRestAPICallback')
            ) {
                $this->additionalProcessors[] = [
                    $moduleConfigObject->moduleUniqueId,
                    $moduleConfigObject,
                    'moduleRestAPICallback',
                ];
            }
        }

        while (true) {
            try {
                $client->wait();
            } catch (\Exception $e) {
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
                    $res = $this->cdrCallBack($request);
                    break;
                case 'sip':
                    $res = $this->sipCallBack($request);
                    break;
                case 'iax':
                    $res = $this->iaxCallBack($request);
                    break;
                case 'system':
                    $res = $this->systemCallBack($request);
                    break;
                case 'storage':
                    $res = $this->storageCallBack($request);
                    break;
                case 'upload':
                    $res = $this->uploadCallBack($request);
                    break;
                case 'modules':
                    $res = $this->modulesCallBack($request);
                    break;
                default:
                    $res             = new PBXApiResult();
                    $res->processor = __METHOD__;
                    $res->success    = false;
                    $res->messages[] = "Unknown processor - {$processor} in prepareAnswer";
            }
        } catch (\Exception $exception) {
            $res             = new PBXApiResult();
            $res->processor = __METHOD__;
            $res->messages[] = 'Exception on WorkerApiCommands - ' . $exception->getMessage();
        }
        $message->reply(json_encode($res->getResult()));

        if (is_array($res->data)
            && array_key_exists('needRestartWorkers', $res->data)
            && $res->data['needRestartWorkers']
        ) {
            WorkerSafeScriptsCore::restartAllWorkers();
        }
    }

    /**
     * Processes CDR table requests
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     *
     * @throws \Pheanstalk\Exception\DeadlineSoonException
     */
    private function cdrCallBack($request): PBXApiResult
    {
        $action = $request['action'];
        switch ($action) {
            case 'getActiveCalls':
                $res = CdrDBProcessor::getActiveCalls();
                break;
            case 'getActiveChannels':
                $res = CdrDBProcessor::getActiveChannels();
                break;
            default:
                $res             = new PBXApiResult();
                $res->processor = __METHOD__;
                $res->messages[] = "Unknown action - {$action} in cdrCallBack";
                break;
        }

        $res->function = $action;

        return $res;
    }

    /**
     * Processes SIP requests
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    private function sipCallBack($request): PBXApiResult
    {
        $action = $request['action'];
        $data   = $request['data'];

        switch ($action) {
            case 'getPeersStatuses':
                $res = SIPStackProcessor::getPeersStatuses();
                break;
            case 'getSipPeer':
                $res = SIPStackProcessor::getPeerStatus($data['peer']);
                break;
            case 'getRegistry':
                $res = SIPStackProcessor::getRegistry();
                break;
            default:
                $res             = new PBXApiResult();
                $res->processor = __METHOD__;
                $res->messages[] = "Unknown action - {$action} in sipCallBack";
                break;
        }

        $res->function = $action;

        return $res;
    }

    /**
     * Processes IAX requests
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    private function iaxCallBack($request): PBXApiResult
    {
        $action = $request['action'];
        switch ($action) {
            case 'getRegistry':
                $res = IAXStackProcessor::getRegistry();
                break;
            default:
                $res             = new PBXApiResult();
                $res->processor = __METHOD__;
                $res->messages[] = "Unknown action - {$action} in iaxCallBack";
                break;
        }

        $res->function = $action;

        return $res;
    }

    /**
     * Processes System requests
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    private function systemCallBack($request): PBXApiResult
    {
        $action = $request['action'];
        $data   = $request['data'];
        $res    = new PBXApiResult();
        $res->processor = __METHOD__;
        switch ($action) {
            case 'reboot':
                System::rebootSync();
                $res->success = true;
                break;
            case 'shutdown':
                System::shutdown();
                $res->success = true;
                break;
            case 'mergeUploadedFile':
                $phpPath              = Util::which('php');
                $workerDownloaderPath = Util::getFilePathByClassName(WorkerMergeUploadedFile::class);
                Util::mwExecBg("{$phpPath} -f {$workerDownloaderPath} '{$data['settings_file']}'");
                $res->success = true;
                break;
            case 'setDate':
                $res->success = System::setDate($data['date']);
                break;
            case 'getInfo':
                $res = SystemManagementProcessor::getInfo();
                break;
            case 'updateMailSettings':
                // TODO
                $this->clearCache(PbxSettings::class);
                $res->success = true;
                break;
            case 'sendMail':
                if (isset($data['email']) && isset($data['subject']) && isset($data['body'])) {
                    if (isset($data['encode']) && $data['encode'] === 'base64') {
                        $data['subject'] = base64_decode($data['subject']);
                        $data['body']    = base64_decode($data['body']);
                    }
                    $result = Notifications::sendMail($data['email'], $data['subject'], $data['body']);
                    if ($result===true){
                        $res->success    = true;
                    } else {
                        $res->success    = false;
                        $res->messages[] = $result;
                    }
                } else {
                    $res->success    = false;
                    $res->messages[] = 'Not all query parameters are set';
                }
                break;
            case 'fileReadContent':
                $res = FilesManagementProcessor::fileReadContent($data['filename'], $data['needOriginal']);
                break;
            case 'getExternalIpInfo':
                $res = NetworkManagementProcessor::getExternalIpInfo();
                break;
            case 'reloadMsmtp':
                $notifications = new Notifications();
                $notifications->configure();
                $voiceMailConfig = new VoiceMailConf();
                $voiceMailConfig->generateConfig();
                $asteriskPath = Util::which('asterisk');
                Util::mwExec("{$asteriskPath} -rx 'voicemail reload'");
                $res->success = true;
                break;
            case 'unBanIp':
                $res = FirewallManagementProcessor::fail2banUnbanAll($data['ip']);
                break;
            case 'getBanIp':
                $res = FirewallManagementProcessor::getBanIp();
                break;
            case 'startLog':
                $res = LogsManagementProcessor::startLog();
                break;
            case 'stopLog':
                $res = LogsManagementProcessor::stopLog();
                break;
            case 'downloadNewFirmware':
                $res = FilesManagementProcessor::downloadNewFirmware($request['data']);
                break;
            case 'firmwareDownloadStatus':
                $res = FilesManagementProcessor::firmwareDownloadStatus();
                break;
            case 'upgrade':
                $res = SystemManagementProcessor::upgradeFromImg($data['temp_filename']);
                break;
            case 'removeAudioFile':
                $res = FilesManagementProcessor::removeAudioFile($data['filename']);
                break;
            case 'convertAudioFile':
                $mvPath = Util::which('mv');
                Util::mwExec("{$mvPath} {$data['temp_filename']} {$data['filename']}");
                $res = FilesManagementProcessor::convertAudioFile($data['filename']);
                break;
            case 'downloadNewModule':
                $module = $request['data']['uniqid'];
                $url    = $request['data']['url'];
                $md5    = $request['data']['md5'];
                $res    = FilesManagementProcessor::moduleStartDownload($module, $url, $md5);
                break;
            case 'moduleDownloadStatus':
                $module = $request['data']['uniqid'];
                $res    = FilesManagementProcessor::moduleDownloadStatus($module);
                break;
            case 'installNewModule':
                $filePath = $request['data']['filePath'];
                $res      = FilesManagementProcessor::installModuleFromFile($filePath);
                break;
            case 'enableModule':
                $moduleUniqueID       = $request['data']['uniqid'];
                $moduleStateProcessor = new PbxExtensionState($moduleUniqueID);
                if ($moduleStateProcessor->enableModule() === false) {
                    $res->success  = false;
                    $res->messages = $moduleStateProcessor->getMessages();
                } else {
                    $res->success = true;
                }
                break;
            case 'disableModule':
                $moduleUniqueID       = $request['data']['uniqid'];
                $moduleStateProcessor = new PbxExtensionState($moduleUniqueID);
                if ($moduleStateProcessor->disableModule() === false) {
                    $res->success  = false;
                    $res->messages = $moduleStateProcessor->getMessages();
                } else {
                    $res->success = true;
                }
                break;
            case 'uninstallModule':
                $moduleUniqueID = $request['data']['uniqid'];
                $keepSettings   = $request['data']['keepSettings'];
                $res            = FilesManagementProcessor::uninstallModule($moduleUniqueID, $keepSettings);
                break;
            default:
                $res             = new PBXApiResult();
                $res->processor = __METHOD__;
                $res->messages[] = "Unknown action - {$action} in systemCallBack";
        }

        $res->function = $action;

        return $res;
    }

    /**
     * Processes Storage requests
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    private function storageCallBack($request): PBXApiResult
    {
        $action = $request['action'];
        $data   = $request['data'];
        $res    = new PBXApiResult();
        $res->processor = __METHOD__;
        switch ($action) {
            case 'list':
                $st           = new Storage();
                $res->success = true;
                $res->data    = $st->getAllHdd();
                break;
            case 'mount':
                $res->success = Storage::mountDisk($data['dev'], $data['format'], $data['dir']);
                break;
            case 'umount':
                $res->success = Storage::umountDisk($data['dir']);
                break;
            case 'mkfs':
                $res->success = Storage::mkfs_disk($data['dev']);
                if ($res->success) {
                    $res->data['status'] = 'inprogress';
                }
                break;
            case 'statusMkfs':
                $res->success        = true;
                $res->data['status'] = Storage::statusMkfs($data['dev']);
                break;
            default:
                $res             = new PBXApiResult();
                $res->processor = __METHOD__;
                $res->messages[] = "Unknown action - {$action} in storageCallBack";
        }

        $res->function = $action;

        return $res;
    }

    /**
     * Processes file upload requests
     *
     * @param $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    private function uploadCallBack($request): PBXApiResult
    {
        $action   = $request['action'];
        $postData = $request['data'];
        switch ($action) {
            case 'uploadResumable':
                $res = FilesManagementProcessor::uploadResumable($postData);
                break;
            case 'status':
                $res = FilesManagementProcessor::statusUploadFile($request['data']);
                break;
            default:
                $res             = new PBXApiResult();
                $res->processor = __METHOD__;
                $res->messages[] = "Unknown action - {$action} in uploadCallBack";
        }

        $res->function = $action;

        return $res;
    }

    /**
     * Processes modules API requests
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    private function modulesCallBack($request): PBXApiResult
    {
        clearstatcache();

        $action = $request['action'];
        $module = $request['module'];

        $res             = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->messages[] = "Unknown action - {$action} in modulesCallBack";
        $res->function   = $action;

        // Try process request over additional modules
        foreach ($this->additionalProcessors as [$moduleUniqueId, $moduleConfigObject, $callBack]) {
            if (stripos($module, $moduleUniqueId) === 0) {
                $res = $moduleConfigObject->$callBack($request);
                break;
            }
        }

        return $res;
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
        } catch (\Exception $e) {
            global $errorLogger;
            $errorLogger->captureException($e);
            Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
        }
    }
}
