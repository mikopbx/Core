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

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\ExternalPhones;

/**
 * Class ExternalPhonesConf
 *
 * Represents a configuration class for external phones.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class ExternalPhonesConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 580;

    private ?array $arrExternalPhones=null;

    /**
     * Retrieves settings for external phones.
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
     * Generates the internal extension dial plan.
     *
     * @return string The generated dial plan.
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
     * Generates the internal transfer dial plan.
     *
     * @return string The generated transfer dial plan.
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
     * Retrieves the models that this class depends on.
     *
     * @return array The array of dependency models.
     */
    public function getDependenceModels(): array
    {
        return [ExternalPhones::class];
    }

}
