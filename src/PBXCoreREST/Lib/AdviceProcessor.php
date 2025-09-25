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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\Workers\WorkerPrepareAdvice;
use MikoPBX\PBXCoreREST\Lib\Advice\GetAdviceListAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;


/**
 * Class AdviceProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 * @property \MikoPBX\Common\Providers\MarketPlaceProvider license
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 * @property \Phalcon\Config\Config config
 *
 */
class AdviceProcessor extends Injectable
{
    /**
     * Processes the Advice request.
     *
     * @param array $request The request data.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $action = $request['action'];

        switch ($action) {
            case 'getList':
                $res = GetAdviceListAction::main();
                break;
            case 'refresh':
                $res = self::refreshAdviceCache();
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action in ".__CLASS__;
                break;
        }

        $res->function = $action;
        return $res;
    }

    /**
     * Force refresh of advice cache
     *
     * @return PBXApiResult
     */
    private static function refreshAdviceCache(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Clear the advice cache to force regeneration
            $di = Di::getDefault();
            $managedCache = $di->get(ManagedCacheProvider::SERVICE_NAME);

            // Clear all advice cache keys
            foreach (WorkerPrepareAdvice::ARR_ADVICE_TYPES as $adviceType) {
                $cacheKey = WorkerPrepareAdvice::getCacheKey($adviceType['type']);
                $managedCache->delete($cacheKey);
            }

            // Regenerate advice immediately
            $res = GetAdviceListAction::main();
            $res->messages['info'][] = 'Advice cache refreshed successfully';

        } catch (\Exception $e) {
            $res->messages['error'][] = 'Failed to refresh advice cache: ' . $e->getMessage();
        }

        return $res;
    }
}