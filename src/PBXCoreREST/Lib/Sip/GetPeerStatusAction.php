<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\Sip;

use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Retrieves the status of a SIP peer.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Sip
 */
class GetPeerStatusAction extends \Phalcon\Di\Injectable
{

    /**
     * Retrieves the status of a SIP peer.
     *
     * @param string $peer The peer to retrieve the status for.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $peer): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        try {
            $am = Util::getAstManager('off');
            $peers = $am->getPjSipPeer($peer);
            $res->success = true;
            $res->data = $peers;
        } catch (\Throwable $e) {
            $res->success = false;
            $res->messages[] = $e->getMessage();
        }

        return $res;
    }
}