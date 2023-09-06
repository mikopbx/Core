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
use GuzzleHttp\Exception\GuzzleException;
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
        // Load the global configuration array
        $CONFIG  = $GLOBALS['CONFIG'];

        // Get the current task ID from an environment variable, or use 0 if the environment variable is not set
        $task_id = getenv('TASK_ID') ? getenv('TASK_ID') : 0;

        // Get the capabilities for the current task from the configuration array
        $caps = $CONFIG['environments'][$task_id];

        // Loop through all the capabilities defined in the configuration array
        foreach ($CONFIG["capabilities"] as $key => $value) {
            // If the capability is not already set in the current task's capabilities, add it
            if ( ! array_key_exists($key, $caps)) {
                $caps[$key] = $value;
            }
        }

        // If BrowserStack Local is enabled, start a BrowserStackLocal instance
        if(array_key_exists("browserstack.local", $caps) && $caps["browserstack.local"])
        {
            $bs_local_args = [
                "key" => $GLOBALS['BROWSERSTACK_ACCESS_KEY'],
                "localIdentifier" => $caps['browserstack.localIdentifier'],
            ];
            self::$bs_local = new BrowserStackLocal();
            self::$bs_local->start($bs_local_args);
        }
        // If BrowserStack Local is not enabled, set the BrowserStack Local capability values to the global variables
        else {
            $caps['browserstack.local'] = "".$GLOBALS['bs_local'];
            $caps['browserstack.localIdentifier']="".$GLOBALS['bs_localIdentifier'];
        }

        // Set the URL for the BrowserStack WebDriver endpoint
        $url  = "https://" . $GLOBALS['BROWSERSTACK_USERNAME'] . ":" . $GLOBALS['BROWSERSTACK_ACCESS_KEY'] . "@" . $CONFIG['server'] . "/wd/hub";

        // Set the  build capabilities
        $caps['build'] = $GLOBALS['BUILD_NUMBER'];

        // Create a new WebDriver instance with the specified URL and capabilities
        self::$driver = RemoteWebDriver::create($url, $caps);

        // Set the initial test result and failure conditions variables
        self::$testResult = true;
        self::$failureConditions = [];
    }


    /**
     * Before execute test we set it name to RemoteWebdriver
     * @throws GuzzleException
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
        if (isset(self::$bs_local) && self::$bs_local) {
            self::$bs_local->stop();
        }
    }

}
