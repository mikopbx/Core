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
        $this->licenseWorker->sendLicenseMetrics($licenseKey, $dataMetrics);

    }

    /**
     * Подготавливает данные для отправки метрики
     *
     * @return array
     */
    private function prepareDate(): array
    {
        $result = [];

        // Версия PBX
        $result['PBXname'] = 'MikoPBX@' . $this->getSessionData('PBXVersion');

        // Количество Extensions
        $extensions                   = Extensions::find('type="SIP"');
        $result['CountSipExtensions'] = $extensions->count();

        return $result;
    }

}