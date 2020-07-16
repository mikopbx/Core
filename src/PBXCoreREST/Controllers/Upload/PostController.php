<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 6 2020
 */

namespace MikoPBX\PBXCoreREST\Controllers\Upload;

use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Controllers\BaseController;
use Phalcon\Di;

/**
 * /api/upload/{name}
 *   curl -F "file=@ModuleTemplate.zip" http://127.0.0.1/pbxcore/api/upload/module -H 'Cookie: XDEBUG_SESSION=PHPSTORM'
 *   curl -X POST -d '{"id": "1531474060"}' http://127.0.0.1/pbxcore/api/upload/status; -H 'Cookie:
 *   XDEBUG_SESSION=PHPSTORM'
 */
class PostController extends BaseController
{
    public function callAction($actionName): void
    {
        $data           = [];
        $data['result'] = 'ERROR';
        $data   = $this->request->getPost();

        if ($this->request->hasFiles() > 0) {
            $data = [
                'resumableFilename'    => $this->request->getPost('resumableFilename'),
                'resumableIdentifier'  => $this->request->getPost('resumableIdentifier'),
                'resumableChunkNumber' => $this->request->getPost('resumableChunkNumber'),
                'resumableTotalSize'   => $this->request->getPost('resumableTotalSize'),
                'upload_id'            => time(),
            ];
            if (isset($data['resumableIdentifier'])){
                $data['upload_id'] = (int) filter_var($data['resumableIdentifier'], FILTER_SANITIZE_NUMBER_INT);
            }
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
                    Util::sysLogMsg('UploadFile', 'error ' . $file->getError() . ' in file ' . $file->getTempName());
                    return;
                }
            }
            $actionName = 'uploadResumable';
        }
        $this->sendRequestToBackendWorker('upload', $actionName, $data);
    }
}