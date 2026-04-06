<?php

namespace MikoPBX\Tests\AdminCabinet\Tests\Data;

/**
 * Factory class for Out of Work Periods test data
 */
class OutOfWorkPeriodsDataFactory
{
    /**
     * Out of Work Periods data
     */
    private static array $periodsData = [
        'new.year.holidays' => [
            'description' => 'New year holidays',
            'date_from' => '1 January, 2020',
            'date_to' => '5 January, 2020',
            'weekday_from' => '-1',
            'weekday_to' => '-1',
            'time_from' => '',
            'time_to' => '',
            'action' => 'extension',
            'extension' => '201',
            'allowRestriction' => false,
            'audio_message_id' => '',
            'inbound-rules-table' => []
        ],
        'may.holidays' => [
            'description' => 'First May holidays',
            'date_from' => '1 May, 2020',
            'date_to' => '3 May, 2020',
            'weekday_from' => '-1',
            'weekday_to' => '-1',
            'time_from' => '',
            'time_to' => '',
            'action' => 'playmessage',
            'extension' => '',
            'allowRestriction' => false,
            'audio_message_id' => '1',
            'inbound-rules-table' => []
        ],
        'weekend' => [
            'description' => 'Weekend',
            'date_from' => '',
            'date_to' => '',
            'weekday_from' => '6',
            'weekday_to' => '7',
            'time_from' => '',
            'time_to' => '',
            'action' => 'playmessage',
            'extension' => '',
            'audio_message_id' => '1',
            'allowRestriction' => true,
            'inbound-rules-table' => [
                '14' => false,
                '15' => false,
                '16' => false,
            ]
        ],
        'morning' => [
            'description' => 'OutOfWork morning',
            'date_from' => '',
            'date_to' => '',
            'weekday_from' => '1',
            'weekday_to' => '5',
            'time_from' => '0:00',
            'time_to' => '9:00',
            'action' => 'playmessage',
            'extension' => '',
            'audio_message_id' => '1',
            'allowRestriction' => true,
            'inbound-rules-table' => [
                '14' => true,
                '15' => true,
                '16' => false,
            ]
        ],
        'evening' => [
            'description' => 'OutOfWork evening',
            'date_from' => '',
            'date_to' => '',
            'weekday_from' => '1',
            'weekday_to' => '5',
            'time_from' => '19:00',
            'time_to' => '23:59',
            'action' => 'playmessage',
            'extension' => '',
            'audio_message_id' => '1',
            'allowRestriction' => true,
            'inbound-rules-table' => [
                '14' => false,
                '15' => true,
                '16' => false,
            ]
        ]
    ];

    public static function getPeriodData(string $periodKey): array
    {
        if (!isset(self::$periodsData[$periodKey])) {
            throw new \RuntimeException("Period data not found for key: $periodKey");
        }
        return self::$periodsData[$periodKey];
    }

    public static function getAllPeriodKeys(): array
    {
        return array_keys(self::$periodsData);
    }
}