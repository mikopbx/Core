<?php
namespace MikoPBX\PBXCoreREST\Controllers\Backup;

use MikoPBX\Core\Backup\Backup;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Controllers\BaseController;
use Phalcon\Di;

/**
 * /api/backup/{name} GET Резервное копирование.
 *
 * Получить список доступных резервных копий.
 *   curl http://127.0.0.1/pbxcore/api/backup/list;
 * Скачать файл лога.
 *   curl http://172.16.156.212/pbxcore/api/backup/download?id=backup_1530715058
 * Удалить резервную копию
 *   curl http://127.0.0.1/pbxcore/api/backup/remove?id=backup_1564399526
 * Старт резервного копирования по расписанию вручную.
 *   curl http://127.0.0.1/pbxcore/api/backup/startScheduled
 * Получить пердполагаемый размер резервной копии
 *   curl http://172.16.156.212/pbxcore/api/backup/getEstimatedSize
 *
 * Восстановить из резервной копии.
 *  curl http://172.16.156.212/pbxcore/api/backup/recover?id=backup_1531123800
 * Проверить соединение с FTP / SFTP хранилищем.
 *  curl http://172.16.156.212/pbxcore/api/backup/checkStorageFtp?id=1
 */
class GetController extends BaseController
{
    public function callAction($actionName):void
    {
        $requestMessage = json_encode([
            'processor'=>'backup',
            'data'   => $_REQUEST,
            'action' => $actionName
        ]);
        $connection  = $this->beanstalkConnection;
        $response = $connection->request($requestMessage, 15, 0);
        if ( $response !== false){
            $response = json_decode($response,true);

            if($actionName === 'download'){
                $id = $this->request->get('id');
                $b = new Backup($id);
                $filename = $b->getResultFile();

                Util::sysLogMsg('test', $filename);

                if(!file_exists($filename)){
                    $this->sendError(404,'File not found');
                    return;
                }

                $extension = Util::getExtensionOfFile($filename);
                if($extension === 'zip'){
                    $size = filesize($filename);
                    $this->response->setHeader('Content-type',        'application/zip');
                    $this->response->setHeader('Content-Description', 'File Transfer');
                    $this->response->setHeader('Content-Disposition', "attachment; filename={$id}.{$extension}");

                    $this->response->setContentLength($size);
                    $this->response->sendHeaders();

                    proc_nice(15);
                    readfile($filename);
                }else{
                    $scheme     = $this->request->getScheme();
                    $host       = $this->request->getHttpHost();
                    $port       = $this->request->getPort();
                    $uid        = Util::generateRandomString(36);
                    $di = Di::getDefault();
                    $downloadLink = $di->getShared('config')->path('adminApplication.downloadLink');

                    $result_dir = "{$downloadLink}/{$uid}";
                    Util::mwExec("mkdir -p {$result_dir}");
                    Util::mwExec("ln -s {$filename} {$result_dir}/{$id}.{$extension}");
                    $this->response->redirect("{$scheme}://{$host}:{$port}/download_link/{$uid}/{$id}.{$extension}");
                    $this->response->sendRaw();
                }
            }else{
                $this->response->setPayloadSuccess($response);
            }

        } else {
            $this->sendError(500);
        }

    }
}