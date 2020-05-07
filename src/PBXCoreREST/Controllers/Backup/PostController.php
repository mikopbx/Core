<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\PBXCoreREST\Controllers\Backup;

use MikoPBX\Core\Backup\Backup;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Controllers\BaseController;
use Phalcon\Di;

/**
 * POST Начать резервное копирование.
 *   curl -X POST -d '{"backup-config":"1","backup-records":"1","backup-cdr":"1","backup-sound-files":"1"}' http://172.16.156.212/pbxcore/api/backup/start;
 * Продолжить выполнение резервного копирования:
 *   curl -X POST -d '{"id":"backup_1531123800"}' http://172.16.156.212/pbxcore/api/backup/start;
 * Приостановить процесс
 *   curl -X POST -d '{"id":"backup_1531123800"}' http://172.16.156.212/pbxcore/api/backup/stop;
 * Загрузка файла на АТС.
 *   curl -F "file=@backup_1531474060.zip" http://172.16.156.212/pbxcore/api/backup/upload;
 * Конвертация старого конфига.
 *
 *
 * Восстановить из резервной копии.
 *  curl -X POST -d '{"id": "backup_1534838222", "options":{"backup-config":"1","backup-records":"1","backup-cdr":"1","backup-sound-files":"1"}}' http://172.16.156.212/pbxcore/api/backup/recover;
 *  curl -X POST -d '{"id": "backup_1534838222", "options":{"backup-sound-files":"1"}}' http://172.16.156.212/pbxcore/api/backup/recover;
 */
class PostController extends BaseController
{
    public function callAction($actionName)
    {
        if($actionName === 'upload' ){
            $data = [];
            $data['result'] = 'ERROR';

            foreach ($_FILES as $file) {
                // check the error status
                if ($file['error'] !== 0) {
                    Util::sysLogMsg('UploadFile','error '.$file['error'].' in file '.$_POST['resumableFilename']);
                    continue;
                }
                $di = Di::getDefault();
                $tempDir = $di->getShared('config')->path('core.tempPath');
                // init the destination file (format <filename.ext>.part<#chunk>
                // the file is stored in a temporary directory
                if(isset($_POST['resumableIdentifier']) && trim($_POST['resumableIdentifier'])!==''){
                    $temp_dir = $tempDir.'/'.$_POST['resumableIdentifier'];
                }else{
                    $temp_dir = $tempDir.'/backup';
                }
                $dest_file = $temp_dir.'/'.$_POST['resumableFilename'].'.part'.$_POST['resumableChunkNumber'];
                // create the temporary directory
                if(!Util::mwMkdir($temp_dir)){
                    Util::sysLogMsg('UploadFile', "Error create dir '$temp_dir'");
                }

                $result = false;
                // move the temporary file
                if (!move_uploaded_file($file['tmp_name'], $dest_file)) {
                    Util::sysLogMsg('UploadFile','Error saving (move_uploaded_file) chunk '.$_POST['resumableChunkNumber'].' for file '.$dest_file);
                } else {
                    // check if all the parts present, and create the final destination file
                    $result = Util::createFileFromChunks($temp_dir, $_POST['resumableFilename'], $_POST['resumableTotalSize'],$_POST['resumableTotalChunks'], '', $_POST['resumableChunkSize']);
                }
                if($result === true){
                    $data['result'] = 'Success';
                    $backupdir  = Backup::getBackupDir();
                    $dir_name   = Util::trimExtensionForFile(basename($_POST['resumableFilename']));
                    $extension  = Util::getExtensionOfFile(basename($_POST['resumableFilename']));
                    $mnt_point  = "{$backupdir}/$dir_name/mnt_point";
                    if(!file_exists("{$backupdir}/$dir_name/")){
                        Util::mwExec("mkdir -p '{$backupdir}/{$dir_name}/' '{$mnt_point}'");
                    }
                    file_put_contents("{$backupdir}/$dir_name/upload_status", 'MERGING');
                    $data['data'] = [
                        'backup_id'  => $dir_name,
                        'status_url' => '/pbxcore/api/backup/statusUpload?backup_id='.$dir_name,
                        'result'     => 'MERGING'
                    ];

                    $merge_post_action = ($extension === 'xml')?'convertConfig':'upload_backup';
                    $merge_settings    = [
                        'data'   => [
                            'result_file'           => "{$backupdir}/$dir_name/resultfile.{$extension}",
                            'mnt_point'             => $mnt_point,
                            'backupdir'             => $backupdir,
                            'dir_name'              => $dir_name,
                            'extension'             => $extension,
                            'temp_dir'              => $temp_dir,
                            'resumableFilename'     => $_POST['resumableFilename'] ?? 'test',
                            'resumableTotalChunks'  => $_POST['resumableTotalChunks'] ?? '1',
                        ],
                        'action' => $merge_post_action
                    ];
                    $settings_file = "{$backupdir}/$dir_name/merge_settings";
                    file_put_contents($settings_file, json_encode($merge_settings, JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT));

                    // Отправляем задачу на склеивание файла.
                    $req_data = [
                        'action' => 'merge_uploaded_file',
                        'data' => [
                            'settings_file' => $settings_file
                        ],
                        'processor'=>'system'
                    ];
                    $connection  = $this->beanstalkConnection;
                    $connection->request($req_data, 15, 0);
                }else{
                    $data['result'] = 'INPROGRESS';
                }
            }
            $this->response->setPayloadSuccess($data);
            return;
        }

        $row_data = $this->request->getRawBody();
        // Проверим, переданные данные.
        if(!Util::isJson($row_data)){
            $this->sendError(400, 'Request has bad JSON');
            return;
        }
        $data = json_decode( $row_data, true);
        $this->sendRequestToBackendWorker('backup', $actionName, $data);
    }
}