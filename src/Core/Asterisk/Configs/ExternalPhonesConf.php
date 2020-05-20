<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\ExternalPhones;
use MikoPBX\Modules\Config\ConfigClass;

class ExternalPhonesConf extends ConfigClass
{
    private $arrExternalPhones;

    /**
     * Получение настроек с АТС.
     */
    public function getSettings(): void
    {
        $ext_data   = [];
        $ext_phones = ExternalPhones::find("disabled = '0' OR disabled IS NULL");

        foreach ($ext_phones as $ext_phone) {
            $ext_data[] = [
                'extension'  => $ext_phone->extension,
                'dialstring' => $ext_phone->dialstring,
            ];
        }

        $this->arrExternalPhones = $ext_data;
    }

    /**
     * Генерация внутреннего номерного плана.
     *
     * @return string
     */
    public function extensionGenInternal(): string
    {
        if ($this->arrExternalPhones===null){
            $this->getSettings();
        }
        $conf = '';
        foreach ($this->arrExternalPhones as $external) {
            $conf .= "exten => _{$external['extension']},1,Set(EXTERNALPHONE=" . $external['dialstring'] . ")\n\t";
            $conf .= "same => n,Goto(outgoing,{$external['dialstring']},1)\n\t";
            $conf .= "same => n,AGI(check_redirect.php,\${BLINDTRANSFER})\n";
        }
        $conf .= "\n";

        return $conf;
    }

    /**
     * @return string
     */
    public function extensionGenInternalTransfer(): string
    {
        if ($this->arrExternalPhones===null){
            $this->getSettings();
        }
        $conf = '';
        foreach ($this->arrExternalPhones as $external) {
            $conf .= 'exten => _' . $external['extension'] . ',1,Set(__ISTRANSFER=transfer_)' . " \n\t";
            $conf .= 'same => n,Goto(internal,${EXTEN},1)' . " \n";
        }
        $conf .= "\n";

        return $conf;
    }

}
