<?php

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
class GetController extends BaseController
{
    public function callAction($actionName): void
    {
        $data           = [];
        $data['result'] = 'ERROR';
        $data['data']   = '';

        $di      = Di::getDefault();
        $tempDir = $di->getShared('config')->path('core.tempPath');
        if ($this->request->hasFiles() > 0) {
            $upload_id            = time();
            $resumableFilename    = $this->request->getPost('resumableFilename');
            $resumableIdentifier  = $this->request->getPost('resumableIdentifier');
            $resumableChunkNumber = $this->request->getPost('resumableChunkNumber');
            $resumableTotalSize   = $this->request->getPost('resumableTotalSize');
            $resumableChunkSize   = $this->request->getPost('resumableChunkSize');

            foreach ($this->request->getUploadedFiles() as $file) {
                if ($file->getError()) {
                    $data['data'] = 'error ' . $file->getError() . ' in file ' . $resumableFilename;
                    Util::sysLogMsg('UploadFile', 'error ' . $file->getError() . ' in file ' . $resumableFilename);
                    continue;
                }
                if (isset($resumableIdentifier) && trim($resumableIdentifier) !== '') {
                    $temp_dir         = $tempDir . '/' . Util::trimExtensionForFile(basename($resumableFilename));
                    $temp_dst_file    = $tempDir . '/' . $upload_id . '/' . basename($resumableFilename);
                    $chunks_dest_file = $temp_dir . '/' . $resumableFilename . '.part' . $resumableChunkNumber;
                } else {
                    $temp_dir         = $tempDir . '/' . $upload_id;
                    $temp_dst_file    = $temp_dir . '/' . basename($file->getName());
                    $chunks_dest_file = $temp_dst_file;
                }
                if ( ! Util::mwMkdir($temp_dir) || ! Util::mwMkdir(dirname($temp_dst_file))) {
                    Util::sysLogMsg('UploadFile', "Error create dir '$temp_dir'");
                    $data['data'] .= "Error create dir 'temp_dir'";
                    continue;
                }
                if ( ! $file->moveTo($chunks_dest_file)) {
                    Util::sysLogMsg('UploadFile', 'Error saving (move_uploaded_file) for ' . $chunks_dest_file);
                    $data['result']            = 'ERROR';
                    $data['d_status_progress'] = '0';
                    $data['d_status']          = 'ID_NOT_SET';
                } elseif ($resumableFilename) {
                    // Передача файлов частями.
                    $result = Util::createFileFromChunks(
                        $temp_dir,
                        $resumableFilename,
                        $resumableTotalSize,
                        $resumableChunkNumber,
                        '',
                        $resumableChunkSize
                    );
                    if ($result === true) {
                        $data['result'] = 'Success';

                        $merge_settings = [
                            'data'   => [
                                'result_file'          => $temp_dst_file,
                                'temp_dir'             => $temp_dir,
                                'resumableFilename'    => $resumableFilename,
                                'resumableTotalChunks' => $resumableChunkNumber,
                            ],
                            'action' => 'merge',
                        ];
                        $settings_file  = "{$temp_dir}/merge_settings";
                        file_put_contents(
                            $settings_file,
                            json_encode($merge_settings, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)
                        );

                        // Отправляем задачу на склеивание файла.

                        $req_data   = [
                            'action'    => 'merge_uploaded_file',
                            'data'      => [
                                'settings_file' => $settings_file,
                            ],
                            'processor' => 'system',
                        ];
                        $connection = $this->beanstalkConnection;
                        $connection->request($req_data, 15, 0);
                        $data['upload_id'] = $upload_id;
                        $data['filename']  = $temp_dst_file;
                        $data['d_status']  = 'INPROGRESS';
                    }
                } else {
                    $data['result'] = 'Success';
                    // Передача файла целиком.
                    $data['upload_id'] = $upload_id;
                    $data['filename']  = $temp_dst_file;
                    $data['d_status']  = 'DOWNLOAD_COMPLETE';
                    file_put_contents($temp_dir . '/progress', '100');
                    Util::mwExecBg(
                        '/etc/rc/shell_functions.sh killprocesses ' . $temp_dir . ' -TERM 0;rm -rf ' . $temp_dir,
                        '/dev/null',
                        30
                    );
                }
            }
        } elseif ($actionName === 'status') {
            $data['result'] = 'Success';
            $postData       = json_decode($this->request->getRawBody(), true);
            if ($postData && isset($postData['id'])) {
                $upload_id     = $postData['id'];
                $progress_dir  = $tempDir . '/' . $upload_id;
                $progress_file = $progress_dir . '/progress';

                if (empty($upload_id)) {
                    $data['result']            = 'ERROR';
                    $data['d_status_progress'] = '0';
                    $data['d_status']          = 'ID_NOT_SET';
                } elseif ( ! file_exists($progress_file) && file_exists($progress_dir)) {
                    $data['d_status_progress'] = '0';
                    $data['d_status']          = 'INPROGRESS';
                } elseif ( ! file_exists($progress_dir)) {
                    $data['result']            = 'ERROR';
                    $data['d_status_progress'] = '0';
                    $data['d_status']          = 'NOT_FOUND';
                } elseif ('100' === file_get_contents($progress_file)) {
                    $data['d_status_progress'] = '100';
                    $data['d_status']          = 'DOWNLOAD_COMPLETE';
                } else {
                    $data['d_status_progress'] = file_get_contents($progress_file);
                }
            }
        }
        $this->response->setPayloadSuccess($data);
    }
}