<?php

namespace MikoPBX\FunctionalTests\Lib;

use Facebook\WebDriver\Remote\RemoteWebDriver;
use Facebook\WebDriver\WebDriverBy;
use PHPUnit\Framework\TestCase;

require 'globals.php';

class BrowserStackTest extends TestCase
{
    protected static $driver;
    protected static $bs_local;

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
    }

    protected function setUp(): void
    {
        parent::setUp();
        $CONFIG  = $GLOBALS['CONFIG'];
        $url  = "https://" . $GLOBALS['BROWSERSTACK_USERNAME'] . ":" . $GLOBALS['BROWSERSTACK_ACCESS_KEY'] . "@" . $CONFIG['server'] . "/wd/hub";
        $task_id = getenv('TASK_ID') ? getenv('TASK_ID') : 0;
        $caps = $CONFIG['environments'][$task_id];

        foreach ($CONFIG["capabilities"] as $key => $value) {
            if ( ! array_key_exists($key, $caps)) {
                $caps[$key] = $value;
            }
        }

        $caps['project'] = "MikoPBX";
        $caps['build'] = $GLOBALS['BUILD_NUMBER'];
        $caps['name'] = $this->getName();
        self::$driver = RemoteWebDriver::create($url, $caps);

    }

    public static function tearDownAfterClass(): void
    {
        self::$driver->quit();
        if (self::$bs_local) {
            self::$bs_local->stop();
        }
    }

}
