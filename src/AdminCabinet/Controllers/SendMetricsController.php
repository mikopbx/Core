<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 8 2019
 *
 */

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\Common\Models\Extensions;

class SendMetricsController extends BaseController
{

    /**
     * Отправка метрикии на сервер лицензироавниия
     */
    public function indexAction(): void
    {
        $licenseKey  = $this->getSessionData('PBXLicense');
        $dataMetrics = $this->prepareDate();
        $this->license->sendLicenseMetrics($licenseKey, $dataMetrics);
    }

    /**
     * Подготавливает данные для отправки метрики
     *
     * @return array
     */
    private function prepareDate(): array
    {
        $result = [];

        // PBXVersion
        $result['PBXname'] = 'MikoPBX@' . $this->getSessionData('PBXVersion');

        // SIP Extensions count
        $extensions                   = Extensions::find('type="SIP"');
        $result['CountSipExtensions'] = $extensions->count();

        // Interface language
        $result['WebAdminLanguage'] = $this->getSessionData('WebAdminLanguage');

        // PBX language
        $result['PBXLanguage'] = $this->getSessionData('PBXLanguage');


        return $result;
    }

}