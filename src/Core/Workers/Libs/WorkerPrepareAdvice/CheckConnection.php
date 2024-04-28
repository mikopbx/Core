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

namespace MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice;

use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

/**
 * Class CheckConnection
 * This class is responsible for checking internet connection on backend.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckConnection extends Injectable
{

    /**
     * Checks whether internet connection is available or not
     *
     * @return array
     *
     */
    public function process():array
    {
        $messages = [];
        $pathTimeout = Util::which('timeout');
        $pathCurl = Util::which('curl');
        $retCode = Processes::mwExec("$pathTimeout 5 $pathCurl 'https://www.google.com/'");
        if ($retCode !== 0) {
            $messages['warning'][] = ['messageTpl'=>'adv_ProblemWithInternetConnection'];
            if (file_exists(Network::INTERNET_FLAG_FILE)) {
                unlink(Network::INTERNET_FLAG_FILE);
            }
        } elseif (!file_exists(Network::INTERNET_FLAG_FILE)) {
                touch(Network::INTERNET_FLAG_FILE);
        }
        return $messages;
    }
}