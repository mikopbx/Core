<?php

namespace MikoPBX\FunctionalTests\Lib;

use Facebook\WebDriver\Remote\RemoteWebDriver;
use PHPUnit\Framework\TestCase;

require 'globals.php';

class BrowserStackTest extends TestCase
{
    protected static RemoteWebDriver $driver;
    protected static \BrowserStack\Local $bs_local;

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
            self::$bs_local = new \BrowserStack\Local();
            self::$bs_local->start($bs_local_args);
        }

        $url  = "https://" . $GLOBALS['BROWSERSTACK_USERNAME'] . ":" . $GLOBALS['BROWSERSTACK_ACCESS_KEY'] . "@" . $CONFIG['server'] . "/wd/hub";

        $caps['project'] = "MikoPBX";
        $caps['build'] = $GLOBALS['BUILD_NUMBER'];

        self::$driver = RemoteWebDriver::create($url, $caps);

    }

    /**
     * Before execute test we set it name to RemoteWebdriver
     * @throws \GuzzleHttp\Exception\GuzzleException
     */
    public function setUp(): void
    {
        parent::setUp();
        $sessionID = self::$driver->getSessionID();
        $name = $this->getName();
        $client = new \GuzzleHttp\Client();
        $res = $client->request('PUT', "https://api.browserstack.com/automate/sessions/{$sessionID}.json", [
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
        $sessionID = self::$driver->getSessionID();
        $status = $this->getStatus()===0?'passed':'failed';
        $statusMessage = $this->getStatusMessage();
        $client = new \GuzzleHttp\Client();
        $res = $client->request('PUT', "https://api.browserstack.com/automate/sessions/{$sessionID}.json", [
            'auth' => [$GLOBALS['BROWSERSTACK_USERNAME'], $GLOBALS['BROWSERSTACK_ACCESS_KEY']],
            'json' => [
                'status' => $status,
                'reason' => $statusMessage,
            ]
        ]);


    }

    public static function tearDownAfterClass(): void
    {
        self::$driver->quit();
        if (self::$bs_local) {
            self::$bs_local->stop();
        }
    }

}
