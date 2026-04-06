<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\Extensions;

use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Throwable;

/**
 * Get extension statistics and availability metrics
 * 
 * @api {get} /pbxcore/api/v2/extensions/getStats/{extension} Get extension statistics
 * @apiVersion 2.0.0
 * @apiName GetStats
 * @apiGroup Extensions
 * 
 * @apiParam {String} extension Extension number
 * @apiParam {Number} [days=7] Number of days to retrieve statistics for
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Statistics data
 *
 * @package MikoPBX\PBXCoreREST\Lib\Extensions
 */
class GetStatsAction extends AbstractExtensionStatusAction
{
    /**
     * Get extension statistics
     *
     * @param string $extension Extension number
     * @param array $data Request parameters (days)
     * @return PBXApiResult
     */
    public static function main(string $extension, array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($extension)) {
            $res->messages['error'][] = 'Extension number is required';
            return $res;
        }
        
        try {
            $di = Di::getDefault();
            $redis = $di->get(RedisClientProvider::SERVICE_NAME);
            
            $days = isset($data['days']) ? max(1, min(30, (int)$data['days'])) : 7;
            
            $stats = self::getExtensionStatistics($extension, $days, $redis);
            
            $res->success = true;
            $res->data = [
                'extension' => $extension,
                'period_days' => $days,
                'statistics' => $stats
            ];
            
        } catch (Throwable $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
    
    /**
     * Get statistics for specific extension over given period
     */
    private static function getExtensionStatistics(string $extension, int $days, $redis): array
    {
        $stats = [
            'daily_stats' => [],
            'summary' => [
                'total_checks' => 0,
                'total_success' => 0,
                'total_failures' => 0,
                'overall_availability' => 0,
                'average_rtt' => null,
                'min_rtt' => null,
                'max_rtt' => null,
                'rtt_samples' => 0
            ]
        ];
        
        $totalChecks = 0;
        $totalSuccess = 0;
        $totalFailures = 0;
        $allRttValues = [];
        
        // Get statistics for each day
        for ($i = 0; $i < $days; $i++) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            $statsKey = self::DAILY_STATS_KEY_PREFIX . "{$extension}:{$date}";
            
            $dailyStatsJson = $redis->get($statsKey);
            $dailyStats = $dailyStatsJson ? json_decode($dailyStatsJson, true) : null;
            
            if ($dailyStats) {
                $stats['daily_stats'][$date] = [
                    'date' => $date,
                    'availability' => $dailyStats['availability'] ?? 0,
                    'total_checks' => $dailyStats['total_checks'] ?? 0,
                    'success_count' => $dailyStats['success_count'] ?? 0,
                    'failure_count' => $dailyStats['failure_count'] ?? 0,
                    'avg_rtt' => $dailyStats['avgRtt'] ?? null,
                    'rtt_values' => $dailyStats['rtt_values'] ?? []
                ];
                
                // Accumulate for summary
                $totalChecks += $dailyStats['total_checks'] ?? 0;
                $totalSuccess += $dailyStats['success_count'] ?? 0;
                $totalFailures += $dailyStats['failure_count'] ?? 0;
                
                // Collect RTT values
                if (!empty($dailyStats['rtt_values'])) {
                    $allRttValues = array_merge($allRttValues, $dailyStats['rtt_values']);
                }
            } else {
                $stats['daily_stats'][$date] = [
                    'date' => $date,
                    'availability' => null,
                    'total_checks' => 0,
                    'success_count' => 0,
                    'failure_count' => 0,
                    'avg_rtt' => null,
                    'rtt_values' => []
                ];
            }
        }
        
        // Calculate summary statistics
        $stats['summary']['total_checks'] = $totalChecks;
        $stats['summary']['total_success'] = $totalSuccess;
        $stats['summary']['total_failures'] = $totalFailures;
        
        if ($totalChecks > 0) {
            $stats['summary']['overall_availability'] = round(($totalSuccess / $totalChecks) * 100, 2);
        }
        
        if (!empty($allRttValues)) {
            $stats['summary']['average_rtt'] = round(array_sum($allRttValues) / count($allRttValues), 2);
            $stats['summary']['min_rtt'] = round(min($allRttValues), 2);
            $stats['summary']['max_rtt'] = round(max($allRttValues), 2);
            $stats['summary']['rtt_samples'] = count($allRttValues);
        }
        
        // Sort daily stats by date (newest first)
        ksort($stats['daily_stats']);
        $stats['daily_stats'] = array_reverse($stats['daily_stats'], true);
        
        return $stats;
    }
}