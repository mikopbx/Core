<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\System;

use MikoPBX\Core\System\Notifications;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 *
 * @package MikoPBX\PBXCoreREST\Lib\System
 */
class SendMailAction extends \Phalcon\Di\Injectable
{
    /**
     * Sends an email notification.
     *
     * @param array $data The data containing email, subject, and body.
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(array $data): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        if (isset($data['email']) && isset($data['subject']) && isset($data['body'])) {
            if (isset($data['encode']) && $data['encode'] === 'base64') {
                $data['subject'] = base64_decode($data['subject']);
                $data['body']    = base64_decode($data['body']);
            }
            $notifier = new Notifications();
            $result   = $notifier->sendMail($data['email'], $data['subject'], $data['body']);
            if ($result === true) {
                $res->success = true;
            } else {
                $res->success    = false;
                $res->messages[] = 'Notifications::sendMail method returned false';
            }
        } else {
            $res->success    = false;
            $res->messages[] = 'Not all query parameters were set';
        }

        return $res;
    }
}