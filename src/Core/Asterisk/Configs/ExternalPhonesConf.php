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

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\ExternalPhones;

class ExternalPhonesConf extends CoreConfigClass
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

    /**
     *
     * @return array
     */
    public function getDependenceModels(): array
    {
        return [ExternalPhones::class];
    }

}
