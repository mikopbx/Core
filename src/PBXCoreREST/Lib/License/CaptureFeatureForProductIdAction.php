<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\License;

use MikoPBX\Common\Providers\MarketPlaceProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di;

/**
 * Class CaptureFeatureForProductIdAction
 * Tries to capture feature.
 *
 * @package MikoPBX\PBXCoreREST\Lib\License
 */
class CaptureFeatureForProductIdAction extends \Phalcon\Di\Injectable
{
    /**
     * Tries to capture feature.
     *
     * If it fails we try to get trial and then try to capture again.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(array $data): PBXApiResult
    {

        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $licFeatureId = $data['licFeatureId'];
        $licProductId = $data['licProductId'];

        if (!isset($licFeatureId, $licProductId)) {
            $res->messages[] = 'The feature id or product id is empty.';
            return $res;
        }
        $res->success = true;
        if ($licFeatureId > 0) {
            $license = Di::getDefault()->get(MarketPlaceProvider::SERVICE_NAME);
            // 1.Try to capture feature
            $result = $license->captureFeature($licFeatureId);
            if ($result['success'] === false) {
                // Add trial
                $license->addTrial($licProductId);
                // 2.Try to capture feature
                $result = $license->captureFeature($licFeatureId);
                if ($result['success'] === false) {
                    $textError = (string)($result['error'] ?? '');
                    $res->messages['license'][] = $license->translateLicenseErrorMessage($textError);
                    $res->success = false;
                }
            }
        }
        return $res;
    }
}