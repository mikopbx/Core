<?php

namespace MikoPBX\PBXCoreREST\Controllers\Cdr;


use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCdr;
use MikoPBX\PBXCoreREST\Controllers\BaseController;

class GetController extends BaseController
{
    /**
     * /pbxcore/api/cdr/ Запрос активных звонков.
     *   curl http://172.16.156.223/pbxcore/api/cdr/getActiveCalls;
     * Пример ответа:
     * [{"start":"2018-02-27
     * 10:45:07","answer":null,"src_num":"206","dst_num":"226","did":"","linkedid":"1519717507.24"}] Возвращает массив
     * массивов со следующими полями:
     * "start"         => 'TEXT',     // DataTime
     * "answer"         => 'TEXT',     // DataTime
     * "endtime"         => 'TEXT',     // DataTime
     * "src_num"         => 'TEXT',
     * "dst_num"         => 'TEXT',
     * "linkedid"         => 'TEXT',
     * "did"             => 'TEXT',
     */

    /**
     * /pbxcore/api/cdr/ Запрос активных звонков.
     *   curl http://127.0.0.1/pbxcore/api/cdr/getActiveChannels;
     * Пример ответа:
     * [{"start":"2018-02-27
     * 10:45:07","answer":null,"src_num":"206","dst_num":"226","did":"","linkedid":"1519717507.24"}] Возвращает массив
     * массивов со следующими полями:
     * "start"         => 'TEXT',     // DataTime
     * "answer"         => 'TEXT',     // DataTime
     * "endtime"         => 'TEXT',     // DataTime
     * "src_num"         => 'TEXT',
     * "dst_num"         => 'TEXT',
     * "linkedid"         => 'TEXT',
     * "did"             => 'TEXT',
     *
     * @param $actionName
     */
    public function callAction($actionName): void
    {
        $this->sendRequestToBackendWorker('cdr', $actionName);
    }

    /**
     * Последовательная загрузка данных из cdr таблицы.
     * /pbxcore/api/cdr/getData MIKO AJAM
     * curl 'http://127.0.0.1:80/pbxcore/api/cdr/getData?offset=0&limit=1';
     */
    public function getDataAction(): void
    {
        $offset = $this->request->get('offset');
        $limit  = $this->request->get('limit');
        $limit  = ($limit > 600) ? 600 : $limit;

        $filter = [
            'id>:id:',
            'bind'                => ['id' => $offset],
            'order'               => 'id',
            'limit'               => $limit,
            'miko_result_in_file' => true,
        ];

        $client  = new BeanstalkClient(WorkerCdr::SELECT_CDR_TUBE);
        $message = $client->request(json_encode($filter), 2);
        if ($message === false) {
            $this->response->setPayloadSuccess('');
        } else {
            $result   = json_decode($message, true);
            $arr_data = [];
            if (file_exists($result)) {
                $arr_data = json_decode(file_get_contents($result), true);
                @unlink($result);
            }
            $xml_output = "<?xml version=\"1.0\"?>\n";
            $xml_output .= "<cdr-table-askozia>\n";
            if (is_array($arr_data)) {
                foreach ($arr_data as $data) {
                    $attributes = '';
                    foreach ($data as $tmp_key => $tmp_val) {
                        $attributes .= sprintf('%s="%s" ', $tmp_key, rawurlencode($tmp_val));
                    }
                    $xml_output .= "<cdr-row $attributes />\n";
                }
            }
            $xml_output .= '</cdr-table-askozia>';
            $this->response->setPayloadSuccess($xml_output);
        }
    }

    /**
     * Скачивание записи разговора.
     * /pbxcore/api/cdr/records MIKO AJAM
     * curl
     * http://172.16.156.223/pbxcore/api/cdr/records?view=/storage/usbdisk1/mikoziapbx/voicemailarchive/monitor/2018/05/05/16/mikozia-1525527966.4_oWgzQFMPRA.mp3
     */
    public function recordsAction(): void
    {
        $filename  = $this->request->get('view');
        $extension = strtolower(substr(strrchr($filename, '.'), 1));
        $type      = '';
        switch ($extension) {
            case 'mp3':
                $type = 'audio/mpeg';
                break;
            case 'wav':
                $type = 'audio/x-wav';
                break;
            case 'gsm':
                $type = 'audio/x-gsm';
                break;
        }
        $size = @filesize($filename);
        if ( ! $size || $type === '') {
            openlog('miko_ajam', LOG_PID | LOG_PERROR, LOG_AUTH);
            $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'Undefined';
            syslog(LOG_WARNING, "From {$_SERVER['REMOTE_ADDR']}. UserAgent: ({$user_agent}). File not found.");
            closelog();
            $this->sendError(404);

            return;
        }

        $fp = fopen($filename, 'rb');
        if ($fp) {
            $this->response->setHeader('Content-Description', 'mp3 file');
            $this->response->setHeader('Content-Disposition', 'attachment; filename=' . basename($filename));
            $this->response->setHeader('Content-type', $type);
            $this->response->setHeader('Content-Transfer-Encoding', 'binary');
            $this->response->setContentLength($size);
            $this->response->sendHeaders();
            fpassthru($fp);
        } else {
            $this->sendError(404);
        }
    }

    /**
     * Прослушивание файла записи с прокруткой.
     * /pbxcore/api/cdr/playback MIKO AJAM
     * http://172.16.156.212/pbxcore/api/cdr/playback?view=/storage/usbdisk1/mikopbx/voicemailarchive/monitor/2018/05/11/16/mikopbx-1526043925.13_43T4MdXcpT.mp3
     * http://172.16.156.212/pbxcore/api/cdr/playback?view=/storage/usbdisk1/mikopbx/voicemailarchive/monitor/2018/06/01/17/mikopbx-1527865189.0_qrQeNUixcV.wav
     * http://172.16.156.223/pbxcore/api/cdr/playback?view=/storage/usbdisk1/mikopbx/voicemailarchive/monitor/2018/12/18/09/mikopbx-1545113960.4_gTvBUcLEYh.mp3&download=true&filename=test.mp3
     * Итого имеем следующий набор параметров API:
     *   * view* - полный путь к файлу записи разговора.
     *  download - опциональный параметр, скачивать записи или нет
     *  filename - опциональный параметр, красивое имя для файла, так файл будет назван при скачивании браузером
     */
    public function playbackAction(): void
    {
        $filename  = $this->request->get('view');
        $extension = Util::getExtensionOfFile($filename);
        if (in_array($extension, ['mp3', 'wav']) && Util::recFileExists($filename)) {
            $ctype = '';
            switch ($extension) {
                case 'mp3':
                    $ctype = 'audio/mpeg';
                    break;
                case 'wav':
                    $ctype = 'audio/x-wav';
                    break;
            }
            $filesize = filesize($filename);
            if (isset($_SERVER['HTTP_RANGE'])) {
                $range = $_SERVER['HTTP_RANGE'];
                [$param, $range] = explode('=', $range);
                if (strtolower(trim($param)) !== 'bytes') {
                    $this->sendError(400);

                    return;
                }
                $range = explode(',', $range);
                $range = explode('-', $range[0]);
                if ($range[0] === '') {
                    $end   = $filesize - 1;
                    $start = $end - (int)$range[0];
                } elseif ($range[1] === '') {
                    $start = (int)$range[0];
                    $end   = $filesize - 1;
                } else {
                    $start = (int)$range[0];
                    $end   = (int)$range[1];
                    // if ($end >= $filesize || (! $start && (! $end || $end == ($filesize - 1)))){
                    // $partial = false;
                    // }
                }
                $length = $end - $start + 1;

                $this->response->resetHeaders();
                if ( ! $fp = fopen($filename, 'rb')) {
                    $this->sendError(500);
                } else {
                    $this->response->setRawHeader('HTTP/1.1 206 Partial Content');
                    $this->response->setHeader('Content-type', $ctype);
                    $this->response->setHeader('Content-Range', "bytes $start-$end/$filesize");
                    $this->response->setContentLength($length);
                    if ($start) {
                        fseek($fp, $start);
                    }
                    $content = '';
                    while ($length) {
                        set_time_limit(0);
                        $read    = ($length > 8192) ? 8192 : $length;
                        $length  -= $read;
                        $content .= fread($fp, $read);
                    }
                    fclose($fp);
                    $this->response->setContent($content);
                }
            } else {
                $this->response->setHeader('Content-type', $ctype);
                $this->response->setContentLength($filesize);
                $this->response->setHeader('Accept-Ranges', 'bytes');
                $this->response->setStatusCode(200, 'OK');
                // $this->response->setContent(file_get_contents($filename));
                $this->response->setFileToSend($filename);
                // TODO
            }
            $this->response->setHeader('Server', 'nginx');

            $is_download = ! empty($this->request->get('download'));
            if ($is_download) {
                $new_filename = $this->request->get('filename');
                if (empty($new_filename)) {
                    $new_filename = basename($filename);
                }

                $this->response->setHeader(
                    'Content-Disposition',
                    "attachment; filename*=UTF-8''" . basename($new_filename)
                );
            }
            $this->response->sendRaw();
        } else {
            openlog('miko_ajam', LOG_PID | LOG_PERROR, LOG_AUTH);

            $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'Undefined';
            syslog(LOG_WARNING, "From {$_SERVER['REMOTE_ADDR']}. UserAgent: ({$user_agent}). File not found.");
            closelog();
            $this->sendError(404);
        }
    }


}