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

use MikoPBX\Core\System\Util;

class FeaturesConf extends CoreConfigClass
{
    protected string $description = 'features.conf';

    public function extensionGlobals(): string
    {
        // Генерация хинтов.
        return "PICKUP_EXTEN={$this->generalSettings['PBXFeaturePickupExten']}\n";
    }

    // Секция global для extensions.conf.

    protected function generateConfigProtected(): void
    {
        $atxTimeout = $this->generalSettings['PBXFeatureAtxferNoAnswerTimeout'];
        if(empty($atxTimeout)){
            $atxTimeout = 45;
        }
        $conf = "[general]\n" .
            "featuredigittimeout = {$this->generalSettings['PBXFeatureDigitTimeout']}\n" .
            "atxfernoanswertimeout = {$atxTimeout}\n" .
            "transferdigittimeout = {$this->generalSettings['PBXFeatureTransferDigitTimeout']}\n" .
            "pickupexten = {$this->generalSettings['PBXFeaturePickupExten']}\n" .
            "atxferabort = *0\n" .
            "\n"            .
            "[applicationmap]\n\n" .
            "[featuremap]\n" .
            "atxfer => {$this->generalSettings['PBXFeatureAttendedTransfer']}\n" .
            "disconnect = *0\n" .
            "blindxfer => {$this->generalSettings['PBXFeatureBlindTransfer']}\n".
            "\n";

        $conf .= $this->hookModulesMethod(CoreConfigClass::GET_FEATURE_MAP);

        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/features.conf', $conf);
    }
}