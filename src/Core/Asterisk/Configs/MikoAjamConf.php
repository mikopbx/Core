<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */
namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Core\Modules\Config\ConfigClass;
use Phalcon\Exception;

class MikoAjamConf extends ConfigClass
{

    protected $description = 'miko_ajam';

    /**
     * Генерация дополнительных контекстов.
     *
     * @return string
     */
    public function extensionGenContexts():string
    {
        $PBXRecordCalls = $this->mikoPBXConfig->getGeneralSettings('PBXRecordCalls');
        $rec_options    = ($PBXRecordCalls == '1') ? 'r' : '';

        $conf = "\n";

        $conf .= "[hangup_handler_meetme]\n\n";
        $conf .= "exten => s,1,AGI(cdr_connector.php,hangup_chan_meetme)\n\t";
        $conf .= "same => n,return\n\n";

        $conf .= "[miko_ajam]\n";
        $conf .= 'exten => 10000111,1,AGI(miko_ajam.php)' . "\n\t";
        $conf .= 'same => n,Answer()' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        $conf .= 'exten => 10000104,1,Dial(LOCAL/${interception}@internal/n,${ChanTimeOut},tT)' . "\n\t";
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" = "ANSWER"]?Hangup())' . "\n\t";
        $conf .= 'same => n,Dial(LOCAL/${RedirectNumber}@internal/n,600,tT)' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        $conf .= 'exten => 10000107,1,Answer()' . "\n\t";
        $conf .= 'same => n,Set(CHANNEL(hangup_handler_wipe)=hangup_handler_meetme,s,1)' . "\n\t";
        $conf .= 'same => n,AGI(cdr_connector.php,meetme_dial)' . "\n\t";
        $conf .= 'same => n,Set(CALLERID(num)=Conference_Room)' . "\n\t";
        $conf .= 'same => n,Set(CALLERID(name)=${mikoconfcid})' . "\n\t";
        $conf .= 'same => n,Meetme(${mikoidconf},' . $rec_options . '${mikoparamconf})' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        $conf .= 'exten => 10000109,1,AGI(miko_ajam.php)' . "\n\t";
        $conf .= 'same => n,Answer()' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        $conf .= 'exten => 10000222,1,AGI(miko_ajam.php)' . "\n\t";
        $conf .= 'same => n,Answer()' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        $conf .= 'exten => 10000555,1,AGI(miko_ajam.php)' . "\n\t";
        $conf .= 'same => n,Answer()' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        $conf .= 'exten => 10000666,1,AGI(miko_ajam.php)' . "\n\t";
        $conf .= 'same => n,Answer()' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        $conf .= 'exten => 10000777,1,AGI(miko_ajam.php)' . "\n\t";
        $conf .= 'same => n,Answer()' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        return $conf;
    }

    /**
     * Создание конфигурационных файлов.
     *
     * @param $settings
     *
     * @throws Exception
     */
    protected function generateConfigProtected($settings)
    {
        if (is_file('/var/etc/http_auth')) {
            return;
        }
        $user_name = md5(random_bytes(20));
        $pass      = md5(random_bytes(12));
        file_put_contents('/var/etc/http_auth', "{$user_name}:{$pass}");
    }

}