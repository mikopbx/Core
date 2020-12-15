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

class AGIDebug extends AGI
{
    private string $scriptName;

    public function __construct($scriptName)
    {
        $this->scriptName = $scriptName;
    }

    public function exec($v1, $v2)
    {
        echo "exec($v1, $v2)\n";
    }

    public function answer()
    {
        echo "answer()\n";
    }

    public function get_variable($_varName)
    {
        $value           = [];
        $value['result'] = 1;

        if ('10000666' == $this->scriptName) {
            switch ($_varName) {
                case 'v1':
                    $value['data'] = 'SIP/204';
                    break;
                case 'v2':
                    $value['data'] = 'mikopbx-1558444069.34';
                    break;
                case 'v3':
                    $value['data'] = '';
                    break;
                case 'v6':
                    $value['data'] = 'Records';
                    break;
                case 'ASTSPOOLDIR':
                    $value['data'] = '/var/spool/asterisk';
                    break;
                default:
                    $value['data'] = '';
            }
        } elseif ('10000555' == $this->scriptName) {
            switch ($_varName) {
                case 'v1':
                    $value['data'] = 'SIP/201';
                    break;
                case 'v2':
                    $value['data'] = '2017-01-01';
                    break;
                case 'v3':
                    $value['data'] = '2019-01-01';
                    break;
                case 'v4':
                    $value['data'] = '201-89257184254';
                    break;
                default:
                    $value['data'] = '';
            }
        } elseif ('1C_HistoryFax.php' == $this->scriptName) {
            switch ($_varName) {
                case 'v1':
                    $value['data'] = 'SIP/1000';
                    break;
                case 'v2':
                    $value['data'] = '2017-01-01';
                    break;
                case 'v3':
                    $value['data'] = '2019-01-01';
                    break;
                default:
                    $value['data'] = '';
            }
        } elseif ('10000777' == $this->scriptName) {
            switch ($_varName) {
                case 'chan':
                    $value['data'] = 'SIP/204';
                    break;
                case 'uniqueid1c':
                    $value['data'] = 'mikopbx-1519992881.0';
                    break;
                case 'ASTSPOOLDIR':
                    $value['data'] = '/var/spool/asterisk';
                    break;
                default:
                    $value['data'] = '';
            }
        }

        return $value['data'];
    }
}