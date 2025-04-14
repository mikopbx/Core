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

namespace MikoPBX\PBXCoreREST\Lib\Advice;

use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\Workers\WorkerPrepareAdvice;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Common\Providers\EventBusProvider;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;
use MikoPBX\Core\System\SystemMessages;

/**
 * Get active calls based on CDR data.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Advice
 */
class GetAdviceListAction extends Injectable
{
    /**
     * Generates a list of notifications about the system, firewall, passwords, and wrong settings.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;
        $result = [];
        $di = Di::getDefault();
        $translation = $di->get(TranslationProvider::SERVICE_NAME);
        $managedCache = $di->get(ManagedCacheProvider::SERVICE_NAME);
        foreach (WorkerPrepareAdvice::ARR_ADVICE_TYPES as $adviceType) {
            $cacheKey = WorkerPrepareAdvice::getCacheKey($adviceType['type']);
            $advice = [];
            
            // Защитная обработка для случаев повреждения данных в кеше
            try {
                $cachedData = $managedCache->get($cacheKey);
                if ($cachedData !== null) {
                    $advice = $cachedData;
                }
            } catch (\Throwable $e) {
                // Если произошла ошибка десериализации, логируем и продолжаем
                SystemMessages::sysLogMsg(
                    __METHOD__, 
                    "Error getting advice from cache ({$cacheKey}): " . $e->getMessage(),
                    LOG_WARNING
                );
                // Удаляем повреждённый кеш
                try {
                    $managedCache->delete($cacheKey);
                } catch (\Throwable $e) {
                    // Игнорируем ошибки при очистке кеша
                }
                continue;
            }
            
            foreach ($advice as $key => $messages) {
                if (!isset($result[$key])) {
                    $result[$key] = [];
                }
                foreach ($messages as $message) {
                    if (isset($message['messageTpl'])) {
                        if (array_key_exists('messageParams', $message)) {
                            $advice = $translation->_($message['messageTpl'], $message['messageParams']);
                        } else {
                            $advice = $translation->_($message['messageTpl']);
                        }
                        $result[$key] = array_merge($result[$key], [$advice]);
                    }
                }
                if ($key === 'needUpdate') {
                    $result[$key] = array_merge($result[$key], $messages);
                }
            }
        }
        $res->data['advice'] = $result;
        if (count($result) > 0) {
            $di->get(EventBusProvider::SERVICE_NAME)->publish('advice', $res->getResult());
        }
        return $res;
    }

}
