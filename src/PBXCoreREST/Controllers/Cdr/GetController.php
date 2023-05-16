<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Controllers\Cdr;


use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Http\Response;

class GetController extends BaseController
{

    /**
     * Retrieves active calls from CDR
     *
     * /pbxcore/api/cdr/
     *
     * This method retrieves the list of active calls. The following command can be used to invoke this action:
     *
     * @example
     *
     * curl http://127.0.0.1/pbxcore/api/cdr/getActiveCalls;
     * curl http://127.0.0.1/pbxcore/api/cdr/getActiveChannels;
     *
     * Example response:
     * [{"start":"2018-02-27 10:45:07","answer":null,"src_num":"206","dst_num":"226","did":"","linkedid":"1519717507.24"}]
     *
     * The response is an array of arrays with the following fields:
     * "start"     => 'TEXT',     // DateTime
     * "answer"    => 'TEXT',     // DateTime
     * "endtime"   => 'TEXT',     // DateTime
     * "src_num"   => 'TEXT',
     * "dst_num"   => 'TEXT',
     * "linkedid"  => 'TEXT',
     * "did"       => 'TEXT',
     *
     * @param string $actionName The name of the action.
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $this->sendRequestToBackendWorker('cdr', $actionName);
    }

    /**
     * Performs playback of a recorded file with scrolling.
     * /pbxcore/api/cdr/v2/playback
     *
     * This method performs playback of a recorded file with scrolling. The following API parameters are available:
     * - view: Full path to the recording file.
     * - download (optional): Specifies whether to download the recording or not.
     * - filename (optional): Specifies a custom filename for the downloaded file.
     *
     * @example:
     *
     * http://172.16.156.212/pbxcore/api/cdr/v2/playback?view=/storage/usbdisk1/mikopbx/voicemailarchive/monitor/2018/05/11/16/mikopbx-1526043925.13_43T4MdXcpT.mp3
     * http://172.16.156.212/pbxcore/api/cdr/v2/playback?view=/storage/usbdisk1/mikopbx/voicemailarchive/monitor/2018/06/01/17/mikopbx-1527865189.0_qrQeNUixcV.wav
     * http://172.16.156.223/pbxcore/api/cdr/v2/playback?view=/storage/usbdisk1/mikopbx/voicemailarchive/monitor/2018/12/18/09/mikopbx-1545113960.4_gTvBUcLEYh.mp3&download=true&filename=test.mp3
     *
     * @return void
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
                }
                $length = $end - $start + 1;

                $this->response->resetHeaders();
                if ( ! $fp = fopen($filename, 'rb')) {
                    $this->sendError(Response::INTERNAL_SERVER_ERROR);
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
                $this->response->setStatusCode(Response::OK, 'OK');
                $this->response->setFileToSend($filename);
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
            $this->sendError(Response::NOT_FOUND);
        }
    }

}