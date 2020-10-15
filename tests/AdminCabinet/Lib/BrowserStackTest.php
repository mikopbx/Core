<?php

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

    /**
     * Before all tests
     * @throws \BrowserStack\LocalException
     */
    public static function setUpBeforeClass(): void
    {


    }

    /**
     * Before execute test we set it name to RemoteWebdriver
     * @throws \GuzzleHttp\Exception\GuzzleException
     */
    public function setUp(): void
    {
        parent::setUp();
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
        }

        $url  = "https://" . $GLOBALS['BROWSERSTACK_USERNAME'] . ":" . $GLOBALS['BROWSERSTACK_ACCESS_KEY'] . "@" . $CONFIG['server'] . "/wd/hub";

        $caps['project'] = "MikoPBX";
        $caps['build'] = $GLOBALS['BUILD_NUMBER'];
        $caps['name'] = $this->getName();

        self::$driver = RemoteWebDriver::create($url, $caps);

        // $sessionID = self::$driver->getSessionID();
        // $name = $this->getName();

        // $client = new GuzzleHttpClient();
        // $client->request('PUT', "https://api.browserstack.com/automate/sessions/{$sessionID}.json", [
        //     'auth' => [$GLOBALS['BROWSERSTACK_USERNAME'], $GLOBALS['BROWSERSTACK_ACCESS_KEY']],
        //     'json' => ['name' => $name]
        // ]);
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
        $client = new GuzzleHttpClient();
        $client->request('PUT', "https://api.browserstack.com/automate/sessions/{$sessionID}.json", [
            'auth' => [$GLOBALS['BROWSERSTACK_USERNAME'], $GLOBALS['BROWSERSTACK_ACCESS_KEY']],
            'json' => [
                'status' => $status,
                'reason' => $statusMessage,
            ]
        ]);


    }

    /**
     * After all tests
     */
    public static function tearDownAfterClass(): void
    {
        self::$driver->quit();
        if (self::$bs_local) {
            self::$bs_local->stop();
        }
    }

}
