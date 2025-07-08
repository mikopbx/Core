<?php

namespace MikoPBX\Tests\AdminCabinet\Tests\Data;

/**
 * Class StorageDataFactory
 * Factory for generating test data for storage settings
 */
class StorageDataFactory
{
    /**
     * Get storage retention period test values
     *
     * @return array Array of test values with descriptions
     */
    public static function getRetentionPeriodTestData(): array
    {
        return [
            [
                'position' => 0,
                'value' => '30',
                'label' => '1 month',
                'description' => 'Keep recordings for 1 month'
            ],
            [
                'position' => 1,
                'value' => '90',
                'label' => '3 months',
                'description' => 'Keep recordings for 3 months'
            ],
            [
                'position' => 2,
                'value' => '180',
                'label' => '6 months',
                'description' => 'Keep recordings for 6 months'
            ],
            [
                'position' => 3,
                'value' => '360',
                'label' => '1 year',
                'description' => 'Keep recordings for 1 year'
            ],
            [
                'position' => 4,
                'value' => '1080',
                'label' => '3 years',
                'description' => 'Keep recordings for 3 years'
            ],
            [
                'position' => 5,
                'value' => '',
                'label' => '∞',
                'description' => 'Keep all recordings (unlimited)'
            ],
        ];
    }

    /**
     * Get random retention period value
     *
     * @return array Random retention period data
     */
    public static function getRandomRetentionPeriod(): array
    {
        $testData = self::getRetentionPeriodTestData();
        return $testData[array_rand($testData)];
    }

    /**
     * Get specific retention period by position
     *
     * @param int $position Slider position (0-5)
     * @return array|null Retention period data or null if position invalid
     */
    public static function getRetentionPeriodByPosition(int $position): ?array
    {
        $testData = self::getRetentionPeriodTestData();
        return $testData[$position] ?? null;
    }

    /**
     * Get specific retention period by value
     *
     * @param string $value Period value in days (or empty for unlimited)
     * @return array|null Retention period data or null if value not found
     */
    public static function getRetentionPeriodByValue(string $value): ?array
    {
        $testData = self::getRetentionPeriodTestData();
        
        foreach ($testData as $data) {
            if ($data['value'] === $value) {
                return $data;
            }
        }
        
        return null;
    }
}