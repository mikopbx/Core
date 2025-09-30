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

namespace MikoPBX\Tests\AdminCabinet\Tests\Data;

/**
 * Factory class for Dialplan Applications test data
 */
class DialplanApplicationsDataFactory
{
    /**
     * Application types
     */
    public const TYPE_PLAINTEXT = 'plaintext';
    public const TYPE_PHP_AGI = 'php';
    
    /**
     * Dialplan applications data storage
     * @var array
     */
    private static array $dialplanApplicationsData = [
        'echo.test' => [
            'name' => 'Echo Test Application',
            'extension' => '2300108',
            'type' => self::TYPE_PLAINTEXT,
            'applicationlogic' => 'NoOp(Echo test started)
Answer()
Echo()
Hangup()',
            'uniqid' => 'APP-ECHO-001',
            'description' => 'Simple echo test for audio verification',
        ],
        'time.announcement' => [
            'name' => 'Time Announcement',
            'extension' => '2300109',
            'type' => self::TYPE_PLAINTEXT,
            'applicationlogic' => 'Answer()
Wait(1)
SayUnixTime(,EST5EDT,IMp)
Playback(vm-goodbye)
Hangup()',
            'uniqid' => 'APP-TIME-001',
            'description' => 'Announces current time to caller',
        ],
        'weather.service' => [
            'name' => 'Weather Information',
            'extension' => '2300110',
            'type' => self::TYPE_PHP_AGI,
            'applicationlogic' => '<?php
// Weather service AGI script
require_once "phpagi.php";
$agi = new AGI();

$agi->answer();
$agi->stream_file("welcome");
$agi->say_digits("123");
$agi->hangup();
?>',
            'uniqid' => 'APP-WEATHER-001',
            'description' => 'Weather information service using PHP AGI',
        ],
        'callback.service' => [
            'name' => 'Callback Service',
            'extension' => '2300111',
            'type' => self::TYPE_PLAINTEXT,
            'applicationlogic' => 'Answer()
Read(CALLBACK_NUMBER,please-enter-your-callback-number,10,,,3,10)
NoOp(Callback requested to ${CALLBACK_NUMBER})
Playback(thank-you)
Hangup()',
            'uniqid' => 'APP-CALLBACK-001',
            'description' => 'Allows callers to request a callback',
        ],
        'voicemail.check' => [
            'name' => 'Voicemail Check',
            'extension' => '2300112',
            'type' => self::TYPE_PLAINTEXT,
            'applicationlogic' => 'Answer()
VoiceMailMain(${CALLERID(num)}@default)
Hangup()',
            'uniqid' => 'APP-VM-001',
            'description' => 'Direct voicemail access for users',
        ],
        'conference.info' => [
            'name' => 'Conference Information',
            'extension' => '2300113',
            'type' => self::TYPE_PLAINTEXT,
            'applicationlogic' => 'Answer()
Playback(conference-info)
Playback(for-sales-press-1)
Playback(for-support-press-2)
WaitExten(5)
Hangup()',
            'uniqid' => 'APP-CONFINFO-001',
            'description' => 'Provides conference room information',
        ],
        'directory.service' => [
            'name' => 'Company Directory',
            'extension' => '2300114',
            'type' => self::TYPE_PLAINTEXT,
            'applicationlogic' => 'Answer()
Directory(default,default,f)
Hangup()',
            'uniqid' => 'APP-DIR-001',
            'description' => 'Company directory by name',
        ],
        'music.on.hold.test' => [
            'name' => 'Music On Hold Test',
            'extension' => '2300115',
            'type' => self::TYPE_PLAINTEXT,
            'applicationlogic' => 'Answer()
MusicOnHold(default,30)
Hangup()',
            'uniqid' => 'APP-MOH-001',
            'description' => 'Tests music on hold for 30 seconds',
        ],
        'call.recording.test' => [
            'name' => 'Call Recording Test',
            'extension' => '2300116',
            'type' => self::TYPE_PLAINTEXT,
            'applicationlogic' => 'Answer()
Playback(this-call-may-be-monitored-or-recorded)
MixMonitor(test-${UNIQUEID}.wav)
Echo()
StopMixMonitor()
Hangup()',
            'uniqid' => 'APP-REC-001',
            'description' => 'Tests call recording functionality',
        ],
        'emergency.announcement' => [
            'name' => 'Emergency Announcement',
            'extension' => '2300117',
            'type' => self::TYPE_PLAINTEXT,
            'applicationlogic' => 'Answer()
Playback(emergency-announcement)
Playback(please-standby)
Wait(5)
Goto(main-ivr,s,1)',
            'uniqid' => 'APP-EMRG-001',
            'description' => 'Emergency announcement system',
        ],
        'custom.php.logic' => [
            'name' => 'Custom PHP Logic',
            'extension' => '2300118',
            'type' => self::TYPE_PHP_AGI,
            'applicationlogic' => '<?php
// Custom PHP AGI application
require_once "phpagi.php";
$agi = new AGI();

$agi->answer();
$caller = $agi->get_variable("CALLERID(num)");
$agi->verbose("Caller ID: " . $caller["data"]);

// Custom logic here
if ($caller["data"] == "201") {
    $agi->stream_file("welcome-vip");
} else {
    $agi->stream_file("welcome");
}

$agi->hangup();
?>',
            'uniqid' => 'APP-CUSTOM-001',
            'description' => 'Custom PHP AGI with caller ID logic',
        ],
    ];

    /**
     * Get dialplan application data by key
     *
     * @param string $applicationKey Application identifier
     * @return array Application data
     * @throws \RuntimeException If application data not found
     */
    public static function getApplicationData(string $applicationKey): array
    {
        if (!isset(self::$dialplanApplicationsData[$applicationKey])) {
            throw new \RuntimeException("Dialplan application data not found for key: $applicationKey");
        }
        return self::$dialplanApplicationsData[$applicationKey];
    }

    /**
     * Get all application keys
     *
     * @return array List of application keys
     */
    public static function getAllApplicationKeys(): array
    {
        return array_keys(self::$dialplanApplicationsData);
    }

    /**
     * Get all applications data
     *
     * @return array All applications data
     */
    public static function getAllApplicationsData(): array
    {
        return self::$dialplanApplicationsData;
    }

    /**
     * Get applications by type
     *
     * @param string $type Application type (plaintext, php, rest)
     * @return array Applications of specified type
     */
    public static function getApplicationsByType(string $type): array
    {
        $filtered = [];
        foreach (self::$dialplanApplicationsData as $key => $data) {
            if ($data['type'] === $type) {
                $filtered[$key] = $data;
            }
        }
        return $filtered;
    }

    /**
     * Get plaintext applications
     *
     * @return array Plaintext dialplan applications
     */
    public static function getPlaintextApplications(): array
    {
        return self::getApplicationsByType(self::TYPE_PLAINTEXT);
    }

    /**
     * Get PHP AGI applications
     *
     * @return array PHP AGI applications
     */
    public static function getPhpApplications(): array
    {
        return self::getApplicationsByType(self::TYPE_PHP_AGI);
    }

}