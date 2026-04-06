<?php

namespace MikoPBX\Tests\AdminCabinet\Tests\Data;

/**
 * Class StorageDataFactory
 * Factory for generating test data for storage settings
 */
class StorageDataFactory
{
    /**
     * Cached S3 test data to ensure consistent values across calls
     */
    private static ?array $s3TestData = null;

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

    /**
     * Get S3 storage test data
     *
     * @return array S3 configuration test values
     */
    public static function getS3StorageTestData(): array
    {
        if (self::$s3TestData === null) {
            self::$s3TestData = [
                'enabled' => true,
                'endpoint' => 'https://s3.amazonaws.com',
                'region' => 'us-east-1',
                'bucket' => 'mikopbx-test-bucket-' . time(),
                'accessKey' => 'AKIAIOSFODNN7EXAMPLE',
                'secretKey' => 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            ];
        }
        return self::$s3TestData;
    }

    /**
     * Get S3 local retention period test values
     * Values: ['7', '30', '90', '180', '365'] - 5 positions (0-4)
     *
     * @return array Array of test values with descriptions
     */
    public static function getS3LocalRetentionTestData(): array
    {
        return [
            [
                'position' => 0,
                'value' => '7',
                'label' => '7 days',
                'description' => 'Keep recordings locally for 7 days'
            ],
            [
                'position' => 1,
                'value' => '30',
                'label' => '1 month',
                'description' => 'Keep recordings locally for 1 month'
            ],
            [
                'position' => 2,
                'value' => '90',
                'label' => '3 months',
                'description' => 'Keep recordings locally for 3 months'
            ],
            [
                'position' => 3,
                'value' => '180',
                'label' => '6 months',
                'description' => 'Keep recordings locally for 6 months'
            ],
            [
                'position' => 4,
                'value' => '365',
                'label' => '1 year',
                'description' => 'Keep recordings locally for 1 year'
            ],
        ];
    }

    /**
     * Get random S3 local retention period value
     *
     * @return array Random S3 local retention period data
     */
    public static function getRandomS3LocalRetentionPeriod(): array
    {
        $testData = self::getS3LocalRetentionTestData();
        return $testData[array_rand($testData)];
    }

    /**
     * Get specific S3 local retention period by position
     *
     * @param int $position Slider position (0-4)
     * @return array|null S3 local retention period data or null if position invalid
     */
    public static function getS3LocalRetentionByPosition(int $position): ?array
    {
        $testData = self::getS3LocalRetentionTestData();
        return $testData[$position] ?? null;
    }
}