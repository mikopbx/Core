<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

/**
 *  Заглушка для отладки скрипта.
 */
class _AGI
{
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

        if ('10000666' == PT1C_SKRIPTNAME) {
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
        } elseif ('10000555' == PT1C_SKRIPTNAME) {
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
        } elseif ('1C_HistoryFax.php' == PT1C_SKRIPTNAME) {
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
        } elseif ('10000777' == PT1C_SKRIPTNAME) {
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
