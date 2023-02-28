<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Tests\AdminCabinet\Lib;

use Facebook\WebDriver\Remote\RemoteWebDriver;
use PHPUnit\Framework\TestCase;
use BrowserStack\Local as BrowserStackLocal;
use GuzzleHttp\Client as GuzzleHttpClient;

require 'globals.php';

class BrowserStackTest extends TestCase
{
    protected static RemoteWebDriver $driver;
    protected static BrowserStackLocal $bs_local;
    protected static bool $testResult;
    protected static array $failureConditions;

    /**
     * Before all tests
     * @throws \BrowserStack\LocalException
     */
    public static function setUpBeforeClass(): void
    {
        $CONFIG  = $GLOBALS['CONFIG'];
        $task_id = getenv('TASK_ID') ? getenv('TASK_ID') : 0;

        $caps = $CONFIG['environments'][$task_id];

        foreach ($CONFIG["capabilities"] as $key => $value) {
            if ( ! array_key_exists($key, $caps)) {
                $caps[$key] = $value;
            }
        }
        if(array_key_exists("browserstack.local", $caps) && $caps["browserstack.local"])
        {
            $bs_local_args = [
                "key" => $GLOBALS['BROWSERSTACK_ACCESS_KEY'],
                "localIdentifier" => $caps['browserstack.localIdentifier'],
            ];
            self::$bs_local = new BrowserStackLocal();
            self::$bs_local->start($bs_local_args);
        } else {
            $caps = [
                'bstack:options' => [
                    "os" => "Windows",
                    "browserstack.local" => "".getenv('BROWSERSTACK_LOCAL'),
                    "browserstack.localIdentifier" => "".getenv('BROWSERSTACK_LOCAL_IDENTIFIER'),
                    "seleniumVersion" => "4.0.0",
                    "build"=> "MikoPBXTest",
                    "name"=> "local_test",
                    "resolution" => "1280x1024",
                    "acceptSslCerts"=> true,
                    "fixSessionCapabilities"=> true,
                    "remoteFiles"=> true,
                    "browserstack.networkLogs"=> true
                ],
                "browserName" => "Chrome",
            ];
        }

        $url  = "https://" . $GLOBALS['BROWSERSTACK_USERNAME'] . ":" . $GLOBALS['BROWSERSTACK_ACCESS_KEY'] . "@" . $CONFIG['server'] . "/wd/hub";

        $caps['project'] = "MikoPBX";
        $caps['build'] = $GLOBALS['BUILD_NUMBER'];

        self::$driver = RemoteWebDriver::create($url, $caps);
        self::$testResult = true;
        self::$failureConditions = [];

    }

    /**
     * Before execute test we set it name to RemoteWebdriver
     * @throws \GuzzleHttp\Exception\GuzzleException
     */
    public function setUp(): void
    {
        parent::setUp();
        $sessionID = self::$driver->getSessionID();
        $name = $this->getName(false);

        $client = new GuzzleHttpClient();
        $client->request('PUT', "https://api.browserstack.com/automate/sessions/{$sessionID}.json", [
            'auth' => [$GLOBALS['BROWSERSTACK_USERNAME'], $GLOBALS['BROWSERSTACK_ACCESS_KEY']],
            'json' => ['name' => $name]
        ]);
    }

    /**
     * After execute test we will update his status
     * @throws \GuzzleHttp\Exception\GuzzleException
     */
    public function tearDown(): void
    {
        parent::tearDown();
        if ($this->getStatus()!==0){
            self::$testResult = false;
            self::$failureConditions[] = 'Test: '.$this->getName().' Message:'. $this->getStatusMessage();
        }
    }

    /**
     * After all tests
     */
    public static function tearDownAfterClass(): void
    {
        $client = new GuzzleHttpClient();
        $sessionID = self::$driver->getSessionID();
        $status = self::$testResult?'passed':'failed';
        $statusMessage = implode(PHP_EOL, self::$failureConditions);
        $client->request('PUT', "https://api.browserstack.com/automate/sessions/{$sessionID}.json", [
            'auth' => [$GLOBALS['BROWSERSTACK_USERNAME'], $GLOBALS['BROWSERSTACK_ACCESS_KEY']],
            'json' => [
                'status' => $status,
                'reason' => $statusMessage,
            ]
        ]);


        self::$driver->quit();
        if (self::$bs_local) {
            self::$bs_local->stop();
        }
    }

}
