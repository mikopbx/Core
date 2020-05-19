<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Core\System\Util;
use MikoPBX\Modules\Config\ConfigClass;

class FeaturesConf extends ConfigClass
{
    /**
     * Создание конфига features.conf
     */
    public function generateFeaturesConf(): void
    {
        $pickup_extension = $this->mikoPBXConfig->getPickupExten();
        $conf             = "[general]\n" .
            "featuredigittimeout = {$this->generalSettings['PBXFeatureDigitTimeout']}\n" .
            "atxfernoanswertimeout = {$this->generalSettings['PBXFeatureAtxferNoAnswerTimeout']}\n" .
            "transferdigittimeout = 3\n" .
            "pickupexten = {$pickup_extension}\n" .
            "atxferabort = *0\n" .
            "\n" .
            "[featuremap]\n" .
            "atxfer => {$this->generalSettings['PBXFeatureAttendedTransfer']}\n" .
            "disconnect = *0\n" .
            "blindxfer => {$this->generalSettings['PBXFeatureBlindTransfer']}\n";

        $additionalModules = $this->di->getShared('pbxConfModules');
        foreach ($additionalModules as $appClass) {
            // Prevent cycling, skip current class
            if (is_a($appClass, __CLASS__)) {
                continue;
            }
            $conf .= $appClass->getFeatureMap();
        }

        Util::fileWriteContent('/etc/asterisk/features.conf', $conf);
    }
}