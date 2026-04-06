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

namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * Get provider statistics and availability metrics
 * 
 * @api {get} /pbxcore/api/v2/providers/getStats/:id Get provider statistics
 * @apiVersion 2.0.0
 * @apiName GetStats
 * @apiGroup Providers
 * 
 * @apiParam {String} id Provider unique ID
 * @apiParam {Number} [days=30] Number of days to analyze (max 30)
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Provider statistics with daily breakdown
 *
 * @package MikoPBX\PBXCoreREST\Lib\Providers
 */
final class GetStatsAction extends Injectable
{
    private const DAILY_STATS_KEY_PREFIX = 'Workers:ProviderMonitor:daily:';
    private const MAX_DAYS = 30;
    private const DEFAULT_DAYS = 30;
    
    /**
     * Supported provider types
     */
    private const PROVIDER_TYPES = ['sip', 'iax'];
    
    /**
     * Get provider statistics
     *
     * @param string $providerId Provider unique ID
     * @param array $params Additional parameters (days)
     * @return PBXApiResult
     */
    public static function main(string $providerId, array $params = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($providerId)) {
            $res->messages['error'][] = 'pr_StatsProviderIdRequired';
            return $res;
        }
        
        try {
            $di = Di::getDefault();
            $redis = $di->get(RedisClientProvider::SERVICE_NAME);
            
            // Parse and validate days parameter
            $days = isset($params['days']) ? (int)$params['days'] : self::DEFAULT_DAYS;
            $days = min($days, self::MAX_DAYS);
            $days = max($days, 1);
            
            // Collect daily statistics
            $dailyStats = [];
            $totalUptime = 0;
            $totalDowntime = 0;
            $totalIncidents = 0;
            $totalChecks = 0;
            $successfulChecks = 0;
            $avgRttSum = 0;
            $avgRttCount = 0;
            $worstDay = null;
            $bestDay = null;
            
            // Iterate through requested days
            for ($i = 0; $i < $days; $i++) {
                $date = date('Y-m-d', strtotime("-$i days"));
                $statsKey = self::DAILY_STATS_KEY_PREFIX . "{$providerId}:{$date}";
                $dayStatsJson = $redis->get($statsKey);
                
                if ($dayStatsJson !== false && $dayStatsJson !== null) {
                    $dayData = json_decode($dayStatsJson, true);
                    
                    if (!$dayData) {
                        continue;
                    }
                    
                    // Enhance day data
                    $dayData['date'] = $date;
                    $dayData['dayOfWeek'] = date('l', strtotime($date));
                    
                    // Format availability as percentage
                    if (isset($dayData['availability'])) {
                        $dayData['availabilityPercent'] = self::formatPercentage($dayData['availability']);
                    }
                    
                    // Format downtime
                    if (isset($dayData['downtime'])) {
                        $dayData['downtimeFormatted'] = self::formatDuration($dayData['downtime']);
                    }
                    
                    $dailyStats[$date] = $dayData;
                    
                    // Aggregate totals
                    if (isset($dayData['uptime'])) {
                        $uptimeValue = is_string($dayData['uptime']) ? (int) preg_replace('/[^0-9]/', '', $dayData['uptime']) : $dayData['uptime'];
                        $totalUptime += $uptimeValue;
                    }
                    if (isset($dayData['downtime'])) {
                        $downtimeValue = is_string($dayData['downtime']) ? (int) preg_replace('/[^0-9]/', '', $dayData['downtime']) : $dayData['downtime'];
                        $totalDowntime += $downtimeValue;
                    }
                    if (isset($dayData['incidents'])) {
                        $totalIncidents += $dayData['incidents'];
                    }
                    if (isset($dayData['totalChecks'])) {
                        $totalChecks += $dayData['totalChecks'];
                    }
                    if (isset($dayData['successfulChecks'])) {
                        $successfulChecks += $dayData['successfulChecks'];
                    }
                    
                    // Average RTT calculation
                    if (isset($dayData['avgRtt']) && $dayData['avgRtt'] > 0) {
                        $avgRttSum += $dayData['avgRtt'];
                        $avgRttCount++;
                    }
                    
                    // Track best and worst days
                    if (isset($dayData['availability'])) {
                        if ($worstDay === null || $dayData['availability'] < $worstDay['availability']) {
                            $worstDay = [
                                'date' => $date,
                                'availability' => $dayData['availability']
                            ];
                        }
                        if ($bestDay === null || $dayData['availability'] > $bestDay['availability']) {
                            $bestDay = [
                                'date' => $date,
                                'availability' => $dayData['availability']
                            ];
                        }
                    }
                }
            }
            
            // Calculate aggregated statistics
            $totalTime = $totalUptime + $totalDowntime;
            $avgAvailability = $totalTime > 0 ? ($totalUptime / $totalTime) * 100 : 0;
            
            $aggregated = [
                'period' => self::formatPeriod($days),
                'avgAvailability' => round($avgAvailability, 2),
                'avgAvailabilityPercent' => self::formatPercentage($avgAvailability),
                'totalIncidents' => $totalIncidents,
                'totalUptime' => $totalUptime,
                'totalUptimeFormatted' => self::formatDuration($totalUptime),
                'totalDowntime' => $totalDowntime,
                'totalDowntimeFormatted' => self::formatDuration($totalDowntime),
                'avgRtt' => $avgRttCount > 0 ? round($avgRttSum / $avgRttCount, 1) : null,
                'daysWithData' => count($dailyStats),
                'totalChecks' => $totalChecks,
                'successRate' => $totalChecks > 0 ? round(($successfulChecks / $totalChecks) * 100, 2) : 0,
                'worstDay' => $worstDay,
                'bestDay' => $bestDay
            ];
            
            // Calculate SLA levels
            $aggregated['sla'] = self::calculateSLA($avgAvailability);
            
            // Get provider info
            $provider = self::getProviderInfo($providerId);
            if (!$provider) {
                $res->messages['error'][] = 'pr_StatsProviderNotFound';
                return $res;
            }
            
            // Sort daily stats by date (newest first)
            krsort($dailyStats);
            
            $res->data = [
                'provider' => $provider,
                'aggregated' => $aggregated,
                'daily' => array_values($dailyStats),
                'period' => [
                    'start' => date('Y-m-d', strtotime("-" . ($days - 1) . " days")),
                    'end' => date('Y-m-d'),
                    'days' => $days
                ]
            ];
            $res->success = true;
            
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Error getting provider statistics: " . $e->getMessage(),
                LOG_ERR
            );
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
    
    /**
     * Get provider information from database using modern PHP patterns
     */
    private static function getProviderInfo(string $providerId): ?array
    {
        $findParams = [
            'conditions' => 'uniqid = :id:',
            'bind' => ['id' => $providerId]
        ];
        
        foreach (self::PROVIDER_TYPES as $type) {
            $provider = match ($type) {
                'sip' => Sip::findFirst($findParams),
                'iax' => Iax::findFirst($findParams),
                default => null,
            };
            
            if ($provider !== null) {
                return self::buildProviderData($provider, $providerId, $type);
            }
        }
        
        return null;
    }
    
    /**
     * Build provider data array
     */
    private static function buildProviderData(object $provider, string $providerId, string $type): array
    {
        return [
            'uniqid' => $providerId,
            'type' => $type,
            'description' => $provider->description ?? '',
            'host' => $provider->host ?? '',
            'username' => $provider->username ?? ''
        ];
    }
    
    /**
     * Format duration in human-readable format using translation keys
     */
    private static function formatDuration(int|string $seconds): string
    {
        // Handle string input like "0s" or numeric strings
        if (is_string($seconds)) {
            // Remove any non-numeric suffix like 's', 'm', 'h'
            $seconds = (int) preg_replace('/[^0-9]/', '', $seconds);
        }
        
        if ($seconds < 60) {
            return $seconds . ' ' . 'pr_StatsFormatSeconds';
        } elseif ($seconds < 3600) {
            $minutes = floor($seconds / 60);
            $secs = $seconds % 60;
            return $minutes . ' ' . 'pr_StatsFormatMinutes' . ' ' . $secs . ' ' . 'pr_StatsFormatSeconds';
        } elseif ($seconds < 86400) {
            $hours = floor($seconds / 3600);
            $minutes = floor(($seconds % 3600) / 60);
            return $hours . ' ' . 'pr_StatsFormatHours' . ' ' . $minutes . ' ' . 'pr_StatsFormatMinutes';
        } else {
            $days = floor($seconds / 86400);
            $hours = floor(($seconds % 86400) / 3600);
            return $days . ' ' . 'pr_StatsFormatDays' . ' ' . $hours . ' ' . 'pr_StatsFormatHours';
        }
    }
    
    /**
     * Format period using translation key
     */
    private static function formatPeriod(int $days): string
    {
        return $days . ' ' . 'pr_StatsPeriodDays';
    }
    
    /**
     * Format percentage using translation key
     */
    private static function formatPercentage(float $value): string
    {
        return round($value, 2) . ' ' . 'pr_StatsFormatPercent';
    }
    
    /**
     * Calculate SLA level based on availability using translation constants
     */
    private static function calculateSLA(float $availability): array
    {
        $slaLevels = [
            ['level' => '99.999%', 'min' => 99.999, 'name' => 'pr_StatsSLAFiveNines', 'downtime' => 'pr_StatsSLADowntimeMinutesPerYear'],
            ['level' => '99.99%', 'min' => 99.99, 'name' => 'pr_StatsSLAFourNines', 'downtime' => 'pr_StatsSLADowntimeMinutesPerYear'],
            ['level' => '99.95%', 'min' => 99.95, 'name' => 'pr_StatsSLAHighAvailability', 'downtime' => 'pr_StatsSLADowntimeHoursPerYear'],
            ['level' => '99.9%', 'min' => 99.9, 'name' => 'pr_StatsSLAThreeNines', 'downtime' => 'pr_StatsSLADowntimeHoursPerYear'],
            ['level' => '99.5%', 'min' => 99.5, 'name' => 'pr_StatsSLAStandard', 'downtime' => 'pr_StatsSLADowntimeDaysPerYear'],
            ['level' => '99%', 'min' => 99.0, 'name' => 'pr_StatsSLABasic', 'downtime' => 'pr_StatsSLADowntimeDaysPerYear'],
            ['level' => '95%', 'min' => 95.0, 'name' => 'pr_StatsSLALow', 'downtime' => 'pr_StatsSLADowntimeDaysPerYear'],
        ];
        
        foreach ($slaLevels as $sla) {
            if ($availability >= $sla['min']) {
                return [
                    'achieved' => $sla['level'],
                    'name' => $sla['name'],
                    'allowedDowntime' => $sla['downtime'],
                    'meets' => true
                ];
            }
        }
        
        return [
            'achieved' => round($availability, 2) . '%',
            'name' => 'pr_StatsSLABelowSLA',
            'allowedDowntime' => 'pr_StatsSLANotApplicable',
            'meets' => false
        ];
    }
}