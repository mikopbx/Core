<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */
namespace MikoPBX\PBXCoreREST\Workers;

use MikoPBX\Core\Asterisk\Configs\{IAXConf, OtherConf, SIPConf};
use MikoPBX\Core\Asterisk\CdrDb;
use MikoPBX\Core\System\{BeanstalkClient, Firewall, Notifications, Storage, System, Util};
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Modules\PbxExtensionFailure;
use Phalcon\Exception;

require_once 'globals.php';

class WorkerApiCommands extends WorkerBase
{

    /**
     * @param $argv
     */
    public function start($argv):void
    {
        $client = new BeanstalkClient();
        $client->subscribe('ping_' . self::class, [$this, 'pingCallBack']);
        $client->subscribe(__CLASS__, [$this, 'prepareAnswer']);

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
        $request   = json_decode($message->getBody(), true);
        $processor = $request['processor'];
        switch ($processor) {
            case 'pbx':
                $answer = $this->pbxCallBack($request);
                break;
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
            case 'modules':
                $answer = $this->modulesCallBack($request);
                break;
            default:
                $answer = "Unknown processor - {$processor}";
        }
        $message->reply(json_encode($answer));
    }

    /**
     * Обработка команд управления PBX.
     *
     * @param array $request
     */
    public function pbxCallBack($request): array
    {
        $action = $request['action'];
        $result = [
            'result' => 'ERROR',
        ];

        if ('check_licence' === $action) {
            $License          = '\\MikoPBX\\Service\\License';
            $lic              = new $License();
            $result           = $lic->check_licence();
            $result['result'] = ($result['result'] !== true) ? 'ERROR' : 'Success';
        } else {
            $result['message'] = 'API action not found;';
        }

        $result['function'] = $action;

        return $result;
    }

    /**
     * Обработка команд SIP.
     *
     * @param array $request
     */
    public function sipCallBack($request): array
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
            $result['data'] = 'API action not found;';
        }
        $result['function'] = $action;

        return $result;
    }

    /**
     * Обработка команду IAX.
     *
     * @param array $request
     */
    public function iaxCallBack($request): array
    {
        $action = $request['action'];
        // $data    = $request['data'];
        $result = [
            'result' => 'ERROR',
        ];
        if ('getRegistry' === $action) {
            $result = IAXConf::getRegistry();
        } else {
            $result['data'] = 'API action not found;';
        }
        $result['function'] = $action;

        return $result;
    }

    /**
     * Обработка системных команд.
     *
     * @param array $request
     */
    public function systemCallBack($request)
    {
        $action = $request['action'];
        $data   = $request['data'];

        $result = [
            'result' => 'ERROR',
        ];

        if ('reboot' === $action) {
            $result['result'] = 'Success';
            System::rebootSync();

            return $result;
        } elseif ('merge_uploaded_file' === $action) {
            $result      = [
                'result' => 'Success',
            ];
            $workersPath = $this->di->get('config')->core->workersPath;
            Util::mwExecBg("php -f {$workersPath}/WorkerMergeUploadedFile.php '{$data['settings_file']}'");
        } elseif ('restartModuleDependentWorkers' === $action) {
            $result['result'] = 'Success';
            Util::restartModuleDependentWorkers();
        } elseif ('shutdown' === $action) {
            $result['result'] = 'Success';
            System::shutdown();

            return $result;
        } elseif ('setDate' === $action) {
            $result = System::setDate($data['date']);
        } elseif ('getInfo' === $action) {
            $result = System::getInfo();
        } elseif ('sendMail' === $action) {
            if (isset($data['email']) && isset($data['subject']) && isset($data['body'])) {
                if (isset($data['encode']) && $data['encode'] === 'base64') {
                    $data['subject'] = base64_decode($data['subject']);
                    $data['body']    = base64_decode($data['body']);
                }
                $result = Notifications::sendMail($data['email'], $data['subject'], $data['body']);
            } else {
                $result['message'] = 'Not all query parameters are populated.';
            }

        } elseif ('fileReadContent' === $action) {
            $result = Util::fileReadContent($data['filename'], $data['needOriginal']);
        } elseif ('getExternalIpInfo' === $action) {
            $result = System::getExternalIpInfo();
        } elseif ('reloadMsmtp' === $action) {
            $notifications = new Notifications();
            $result        = $notifications->configure();
            $OtherConfigs = new OtherConf();
            $OtherConfigs->voiceMailConfGenerate();
            Util::mwExec("asterisk -rx 'voicemail reload'");
        } elseif ('unBanIp' === $action) {
            $result = Firewall::fail2banUnbanAll($data['ip']);
        } elseif ('getBanIp' === $action) {
            $result['result'] = 'Success';
            $result['data']   = Firewall::getBanIp();
        } elseif ('startLog' === $action) {
            $result['result'] = 'Success';
            Util::startLog();
        } elseif ('stopLog' === $action) {
            $result['result']   = 'Success';
            $result['filename'] = Util::stopLog();
        } elseif ('statusUpgrade' === $action) {
            $result = System::statusUpgrade();
        } elseif ('upgradeOnline' === $action) {
            $result = System::upgradeOnline($request['data']);
        } elseif ('upgrade' === $action) {
            $result = System::upgradeFromImg();
        } elseif ('removeAudioFile' === $action) {
            $result = Util::removeAudioFile($data['filename']);
        } elseif ('convertAudioFile' === $action) {
            Util::mwExec("mv {$data['uploadedBlob']} {$data['filename']}");
            $result = Util::convertAudioFile($data['filename']);
        } else {
            $result['message'] = 'API action not found;';
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
    public function storageCallBack($request): array
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
    public function modulesCallBack($request): array
    {
        clearstatcache();

        if ( ! Storage::isStorageDiskMounted()) {
            return ['result' => 'ERROR', 'message' => 'Storage is not mounted.'];
        }

        $action = $request['action'];
        $module = $request['module'];

        $result = [
            'result' => 'ERROR',
            'data'   => null,
        ];

        // Предварительные действия по распаковке модуля.
        if ('upload' === $action) {
            $result['function'] = $action;
            $result['result']   = 'Success';
            $result             = System::moduleStartDownload($module, $request['data']['url'],
                $request['data']['md5']);

            return $result;
        } elseif ('status' === $action) {
            $result             = System::moduleDownloadStatus($module);
            $result['function'] = $action;
            $result['result']   = 'Success';

            return $result;
        }

        $path_class = $this->getModuleClass($module, $action);
        if (false === $path_class) {
            $result['data'][]   = "Class '$module' does not exist...";
            $result['data'][]   = "Class '$path_class' does not exist...";
            $result['function'] = $action;

            return $result;
        }

        try {
            if ('check' === $action) {
                /** @var \MikoPBX\Core\Modules\Config\ConfigClass $c */
                $c        = new $path_class(true);
                $response = $c->test();
                if ($response['result'] === true) {
                    $result['result'] = 'Success';
                }
                $result['data'] = $response;
            } elseif ('reload' === $action) {
                /** @var \MikoPBX\Core\Modules\Config\ConfigClass $cl */
                $cl = new $path_class();
                $cl->reloadServices();
                $cl->onAfterPbxStarted();
                $result['result'] = 'Success';
            } elseif ('customAction' === $action) {
                /** @var \MikoPBX\Core\Modules\Config\ConfigClass $cl */
                $cl       = new $path_class();
                $response = $cl->customAction($request['data']);
                $result   = $response;
            } elseif ('uninstall' === $action) {
                if (class_exists($path_class) && method_exists($path_class, 'uninstallModule')) {
                    $setup = new $path_class($module);
                } else {
                    // Заглушка которая позволяет удалить модуль из базы данных, которого нет на диске
                    $path_class = PbxExtensionFailure::class;
                    $setup      = new $path_class($module);
                }
                $prams = json_decode($request['input'], true);
                if (array_key_exists('keepSettings', $prams)) {
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
                Util::restartModuleDependentWorkers();
            } else {
                $cl     = new $path_class();
                $result = @$cl->$action($request);
            }
        } catch (Exception $e) {
            global $errorLogger;
            $errorLogger->captureException($e);
            $result['data'] = $e->getMessage();
        }

        $result['function'] = $action;

        return $result;
    }

    /**
     * @param $module
     * @param $action
     *
     * @return bool|string
     */
    private function getModuleClass($module, $action)
    {

        $class_name = str_replace('Module', '', $module);
        $path_class = "\\Modules\\{$module}\\Lib\\{$class_name}";

        if (in_array($action, ['check', 'reload', 'customAction'])) {
            if ( ! class_exists($path_class)) {
                $path_class = false;
            }
        } elseif ($action === 'uninstall') { // Этот метод существует всегда
            $path_class = "\\Modules\\{$module}\\setup\\PbxExtensionSetup";
        } elseif ( ! method_exists($path_class, $action)) {
            $path_class = "\\Modules\\{$module}\\setup\\PbxExtensionSetup";
            if ( ! class_exists("$path_class")) {
                $path_class = false;
            }
        }

        return $path_class;
    }

    /**
     * Запросы с CDR таблице
     *
     * @param array $request
     */
    private function cdrCallBack($request):array
    {
        $action = $request['action'];
        switch ($action) {
            case 'getActiveCalls':
                $result = CdrDb::getActiveCalls();
                break;
            case 'getActiveChannels':
                $result = CdrDb::getActiveChannels();
                break;
            default:
                $result = ["Unknown action - {$action}"];
                break;
        }
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
