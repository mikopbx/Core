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
use MikoPBX\Core\Workers\WorkerPrepareAdvices;
use Phalcon\Di\Injectable;


/**
 * Class AdvicesProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 * @property \MikoPBX\Common\Providers\MarketPlaceProvider license
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 * @property \Phalcon\Config config
 *
 */
class AdvicesProcessor extends Injectable
{
    /**
     * Processes the Advices request.
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
        if ('getList' === $action) {
            $proc = new self();
            $res = $proc->getAdvicesAction();
        } else {
            $res->messages['error'][] = "Unknown action - {$action} in advicesCallBack";
        }
        $res->function = $action;
        return $res;
    }

    /**
     * Generates a list of notifications about the system, firewall, passwords, and wrong settings.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private function getAdvicesAction(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;
        $result = [];
        $managedCache = $this->di->getShared(ManagedCacheProvider::SERVICE_NAME);
        foreach (WorkerPrepareAdvices::ARR_ADVICE_TYPES as $adviceType) {
            $cacheKey = WorkerPrepareAdvices::getCacheKey($adviceType['type']);
            $advices = $managedCache->get($cacheKey) ?? [];
            foreach ($advices as $key => $messages) {
                if (!isset($result[$key])) {
                    $result[$key] = [];
                }
                foreach ($messages as $message) {
                    if (isset($message['messageTpl'])) {
                        if (array_key_exists('messageParams', $message)) {
                            $advice = $this->translation->_($message['messageTpl'], $message['messageParams']);
                        } else {
                            $advice = $this->translation->_($message['messageTpl']);
                        }
                        $result[$key] = array_merge($result[$key], [$advice]);
                    }
                }
                if ($key === 'needUpdate') {
                    $result[$key] = array_merge($result[$key], $messages);
                }
            }
        }
        $res->data['advices'] = $result;
        return $res;
    }

}