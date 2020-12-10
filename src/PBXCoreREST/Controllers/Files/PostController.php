<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\PBXCoreREST\Controllers\Files;

use MikoPBX\Common\Providers\BeanstalkConnectionWorkerApiProvider;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Controllers\BaseController;

/**
 * /pbxcore/api/files/{name}' Files management (POST).
 *
 * Get config file content
 *   curl -X POST -d '{"filename": "/etc/asterisk/asterisk.conf"}'
 *   http://172.16.156.212/pbxcore/api/files/fileReadContent;
 *
 * Answer example:
 *   {"result":"ERROR","message":"API action not found;","function":"fileReadContent"}
 *   {"result":"Success","data":"W2RpcmVj","function":"fileReadContent"}
 *
 * Convert audiofile:
 *   curl -X POST -d '{"filename": "/tmp/WelcomeMaleMusic.mp3"}'
 *   http://172.16.156.212/pbxcore/api/files/convertAudioFile;
 *
 *  Answer example:
 *   {
 *      "result": "Success",
 *      "filename": "/tmp/WelcomeMaleMusic.wav",
 *      "function": "convertAudioFile"
 *   }
 *
 *
 * Delete Audio file:
 *   curl -X POST -d '{"filename": "/storage/usbdisk1/mikopbx/tmp/2233333.wav"}'
 *   http://172.16.156.212/pbxcore/api/files/removeAudioFile;
 *
 *
 * Install new module with params by URL
 * curl -X POST -d '{"uniqid":"ModuleCTIClient", "md5":"fd9fbf38298dea83667a36d1d0464eae", "url":
 * "https://www.askozia.ru/upload/update/modules/ModuleCTIClient/ModuleCTIClientv01.zip"}'
 * http://172.16.156.223/pbxcore/api/files/uploadNewModule;
 *
 *
 * Receive uploading status
 * curl  -X POST -d '{"uniqid":"ModuleSmartIVR"} http://172.16.156.223/pbxcore/api/files/statusUploadingNewModule
 *
 * Install new module from ZIP archive:
 * curl -F "file=@ModuleTemplate.zip" http://127.0.0.1/pbxcore/api/files/uploadNewModule;
 *
 * Uninstall module:
 * curl -X POST -d '{"uniqid":"ModuleSmartIVR"} http://172.16.156.223/pbxcore/api/files/uninstallModule
 *
 * Upload file:
 *   curl -X POST -d '{"id": "1531474060"}' http://127.0.0.1/pbxcore/api/files/statusUpload; -H 'Cookie:
 *
 *   XDEBUG_SESSION=PHPSTORM'
 */
class PostController extends BaseController
{
    public function callAction($actionName): void
    {
        switch ($actionName) {
            case 'fileReadContent':
                $this->fileReadContent();
                break;
            case 'uploadResumable':
                $this->uploadResumableAction();
                break;
            default:
                $data = $this->request->getPost();
                $this->sendRequestToBackendWorker('files', $actionName, $data);
        }
    }

    /**
     * Parses content of file and puts it to answer
     *
     */
    private function fileReadContent(): void
    {
        $requestMessage = json_encode(
            [
                'processor' => 'files',
                'data'      => $this->request->getPost(),
                'action'    => 'fileReadContent',
            ]
        );
        $connection     = $this->di->getShared(BeanstalkConnectionWorkerApiProvider::SERVICE_NAME);
        $response       = $connection->request($requestMessage, 5, 0);
        if ($response !== false) {
            $response = json_decode($response, true);
            $filename = $response['data']['filename'] ?? '';
            if ( ! file_exists($filename)) {
                $response['messages'][] = 'Config file not found';
            } else {
                $response['data']['filename'] = $filename;
                $response['data']['content']  = mb_convert_encoding('' . file_get_contents($filename), 'UTF-8', 'UTF-8');
                unlink($filename);
            }
            $this->response->setPayloadSuccess($response);
        } else {
            $this->sendError(500);
        }
    }

    /**
     * Upload files by chunks
     */
    public function uploadResumableAction(): void
    {
        $data   = $this->request->getPost();
        $data['result'] = 'ERROR';

        if ($this->request->hasFiles() > 0) {
            $data = [
                'resumableFilename'    => $this->request->getPost('resumableFilename'),
                'resumableIdentifier'  => $this->request->getPost('resumableIdentifier'),
                'resumableChunkNumber' => $this->request->getPost('resumableChunkNumber'),
                'resumableTotalChunks' => $this->request->getPost('resumableTotalChunks'),
                'resumableTotalSize'   => $this->request->getPost('resumableTotalSize'),
            ];
            foreach ($this->request->getUploadedFiles() as $file) {
                $data['files'][]= [
                    'file_path' => $file->getTempName(),
                    'file_size' => $file->getSize(),
                    'file_error'=> $file->getError(),
                    'file_name' => $file->getName(),
                    'file_type' => $file->getType()
                ];
                if ($file->getError()) {
                    $data['data'] = 'error ' . $file->getError() . ' in file ' . $file->getTempName();
                    $this->sendError(400, $data['data']);
                    Util::sysLogMsg('UploadFile', 'error ' . $file->getError() . ' in file ' . $file->getTempName(), LOG_ERR);
                    return;
                }
            }
        }

        $this->sendRequestToBackendWorker('files', 'uploadResumable', $data);
    }

}