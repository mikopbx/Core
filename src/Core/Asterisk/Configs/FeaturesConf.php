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

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;

/**
 * Class FeaturesConf
 *
 * Represents a configuration class for features.conf.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class FeaturesConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'features.conf';

    /**
     * Generates the PICKUP_EXTEN into the extensions.conf global section.
     *
     * @return string The generated PICKUP_EXTEN configuration.
     */
    public function extensionGlobals(): string
    {
        $pickupExten = PbxSettings::getValueByKey(PbxSettings::PBX_FEATURE_PICKUP_EXTEN);
        return "PICKUP_EXTEN={$pickupExten}\n";
    }

    /**
     * Generates the configuration for the features.conf file.
     *
     * @return void
     */
    protected function generateConfigProtected(): void
    {
        $atxTimeout = PbxSettings::getValueByKey(PbxSettings::PBX_FEATURE_ATXFER_NO_ANSWER_TIMEOUT);
        if (empty($atxTimeout)) {
            $atxTimeout = 45;
        }

        $digitTimeout = PbxSettings::getValueByKey(PbxSettings::PBX_FEATURE_DIGIT_TIMEOUT);
        if (empty($digitTimeout)) {
            $digitTimeout = 10;
        }

        $transferDigitTimeout = PbxSettings::getValueByKey(PbxSettings::PBX_FEATURE_TRANSFER_DIGIT_TIMEOUT);
        if (empty($transferDigitTimeout)) {
            $transferDigitTimeout = 10;
        }

        $pickupExten = PbxSettings::getValueByKey(PbxSettings::PBX_FEATURE_PICKUP_EXTEN);
        
        $atxferAbort = PbxSettings::getValueByKey(PbxSettings::PBX_FEATURE_ATXFER_ABORT);
        if (empty($atxferAbort)) {
            $atxferAbort = '*0';
        }
        
        $attendedTransfer = PbxSettings::getValueByKey(PbxSettings::PBX_FEATURE_ATTENDED_TRANSFER);
        if (empty($attendedTransfer)) {
            $attendedTransfer = '##';
        }

        $blindTransfer = PbxSettings::getValueByKey(PbxSettings::PBX_FEATURE_BLIND_TRANSFER);
        if (empty($blindTransfer)) {
            $blindTransfer = '**';
        }

        $conf = "[general]\n" .
            "featuredigittimeout = {$digitTimeout}\n" .
            "atxfernoanswertimeout = $atxTimeout\n" .
            "transferdigittimeout = {$transferDigitTimeout}\n" .
            "pickupexten = {$pickupExten}\n" .
            "atxferabort = {$atxferAbort}\n" .
            "\n" .
            "[applicationmap]\n\n" .
            "[featuremap]\n" .
            "atxfer => {$attendedTransfer}\n" .
            "disconnect = {$atxferAbort}\n" .
            "blindxfer => {$blindTransfer}\n" .
            "\n";

        $conf .= $this->hookModulesMethod(AsteriskConfigInterface::GET_FEATURE_MAP);

        $this->saveConfig($conf, $this->description);
    }

    /**
     * Refreshes the features configs and reloads the features module.
     */
    public static function reload(): void
    {
        $featuresConf = new self();
        $featuresConf->generateConfig();
        $asterisk = Util::which('asterisk');
        Processes::mwExec("$asterisk -rx 'module reload features'");
    }
}