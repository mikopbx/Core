<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Asterisk;

use Throwable;
use MikoPBX\Core\System\{Util};
use Phalcon\Di;
use SQLite3;

class AstDB extends Di\Injectable
{
    private AsteriskManager $am;

    /**
     * AstDB constructor.
     */
    public function __construct()
    {
        $di = Di::getDefault();
        if($di === null){
            $this->am = Util::getAstManager('off');
            return;
        }
        $this->am = Util::getAstManager('off');
    }

    /**
     * Поместить значение в базу данных.
     *
     * @param $family
     * @param $key
     * @param $value
     *
     * @return bool
     */
    public function databasePut($family, $key, $value): bool
    {
        $result = false;
        if ($this->am->loggedIn() ) {
            $result = $this->databasePutAmi($family, $key, $value);
        }
        return $result;
    }

    /**
     * Поместить значение в базу данных через AMI.
     *
     * @param $family
     * @param $key
     * @param $value
     *
     * @return bool
     */
    private function databasePutAmi($family, $key, $value): bool
    {
        $result   = false;
        $res_data = $this->am->DBPut($family, $key, $value);
        $response = $res_data['Response'] ?? '';
        if (is_array($res_data) && 'Success' === $response) {
            $result = true;
        }

        return $result;
    }
}