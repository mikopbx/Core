<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

namespace MikoPBX\Tests\AdminCabinet\Lib;

use Facebook\WebDriver\Remote\RemoteWebDriver;
use GuzzleHttp\Client as GuzzleHttpClient;
use GuzzleHttp\Exception\GuzzleException;
use PHPUnit\Framework\TestCase;
use BrowserStack\Local as BrowserStackLocal;
use RuntimeException;

require_once 'globals.php';


/**
 * Base class for BrowserStack integration tests
 *
 * @package MikoPBX\Tests\AdminCabinet\Lib
 */
abstract class BrowserStackTest extends TestCase
{
    protected const WAIT_TIMEOUT = 30;
    protected const DEFAULT_SCREENSHOT_DIR = 'test-screenshots';
    protected const INITIALIZATION_TIMEOUT = 120000;

    /**
     * WebDriver instance
     * @var RemoteWebDriver|null
     */
    protected static ?RemoteWebDriver $driver = null;

    /**
     * BrowserStack Local instance
     * @var BrowserStackLocal|null
     */
    protected static ?BrowserStackLocal $bs_local = null;

    /**
     * Test status tracking
     */
    protected static bool $testResult;
    protected static array $failureConditions;

    /**
     * HTTP Client for BrowserStack API
     * @var GuzzleHttpClient|null
     */
    protected static ?GuzzleHttpClient $httpClient = null;

    /**
     * Global test configuration
     */
    protected const CONFIG = [
        'browser' => [
            'timeouts' => [
                'page_load' => 30,
                'script' => 30,
                'element' => 10
            ],
            'window' => [
                'width' => 1920,
                'height' => 1080
            ]
        ],
        'test' => [
            'retries' => 3,
            'delay' => 1,
            'screenshot_dir' => 'test-screenshots'
        ],
        'paths' => [
            'temp' => '/tmp/mikopbx-tests',
            'logs' => '/tmp/mikopbx-tests/logs'
        ]
    ];


    /**
     * Configure and start BrowserStack session
     *
     */
    public static function setUpBeforeClass(): void
    {
        try {
            self::initializeHttpClient();
            self::setupBrowserStackCapabilities();
            self::initializeTestState();
        } catch (\Exception $e) {
            throw new RuntimeException(
                "Failed to initialize BrowserStack test environment: " . $e->getMessage(),
                0,
                $e
            );
        }
    }

    /**
     * Initialize HTTP client for API requests
     *
     * @throws RuntimeException
     */
    private static function initializeHttpClient(): void
    {
        if (!isset($GLOBALS['BROWSERSTACK_USERNAME']) || !isset($GLOBALS['BROWSERSTACK_ACCESS_KEY'])) {
            throw new RuntimeException('BrowserStack credentials not configured');
        }

        self::$httpClient = new GuzzleHttpClient([
            'base_uri' => 'https://api.browserstack.com',
            'auth' => [
                $GLOBALS['BROWSERSTACK_USERNAME'],
                $GLOBALS['BROWSERSTACK_ACCESS_KEY']
            ]
        ]);
    }

    /**
     * Setup BrowserStack capabilities and start session
     *
     * @throws \BrowserStack\LocalException|RuntimeException
     */
    private static function setupBrowserStackCapabilities(): void
    {
        if (!isset($GLOBALS['CONFIG'])) {
            throw new RuntimeException('BrowserStack configuration not found');
        }

        $CONFIG = $GLOBALS['CONFIG'];
        $taskId = (int)getenv('TASK_ID') ?: 0;

        $caps = self::mergeBrowserStackCapabilities($CONFIG, $taskId);
        self::initializeBrowserStackLocal($caps);

        $url = sprintf(
            'https://%s:%s@%s/wd/hub',
            $GLOBALS['BROWSERSTACK_USERNAME'],
            $GLOBALS['BROWSERSTACK_ACCESS_KEY'],
            $CONFIG['server']
        );

        try {
            self::$driver = RemoteWebDriver::create(
                $url,
                $caps,
                self::INITIALIZATION_TIMEOUT,
                self::INITIALIZATION_TIMEOUT
            );

            if (!self::$driver) {
                throw new RuntimeException('Failed to create RemoteWebDriver instance');
            }
        } catch (\Exception $e) {
            throw new RuntimeException(
                "Failed to initialize WebDriver: " . $e->getMessage(),
                0,
                $e
            );
        }
    }

    /**
     * Initialize test state
     */
    private static function initializeTestState(): void
    {
        self::$testResult = true;
        self::$failureConditions = [];
    }

    /**
     * Merge BrowserStack capabilities
     *
     * @param array $config Configuration array
     * @param int $taskId Task identifier
     * @return array
     */
    private static function mergeBrowserStackCapabilities(array $config, int $taskId): array
    {
        $caps = $config['environments'][$taskId];
        foreach ($config['capabilities'] as $key => $value) {
            if (!array_key_exists($key, $caps)) {
                $caps[$key] = $value;
            }
        }
        $caps['build'] = $GLOBALS['BUILD_NUMBER'];
        return $caps;
    }

    /**
     * Initialize BrowserStack Local testing
     *
     * @param array $caps Capabilities array
     * @throws \BrowserStack\LocalException
     */
    private static function initializeBrowserStackLocal(array &$caps): void
    {
        if ($GLOBALS['BROWSERSTACK_DAEMON_STARTED'] === 'false') {
            $bs_local_args = [
                'key' => $GLOBALS['BROWSERSTACK_ACCESS_KEY'],
                'localIdentifier' => (string)$GLOBALS['bs_localIdentifier']
            ];
            self::$bs_local = new BrowserStackLocal();
            self::$bs_local->start($bs_local_args);
        } else {
            $caps['browserstack.local'] = (string)$GLOBALS['bs_local'];
            $caps['browserstack.localIdentifier'] = (string)$GLOBALS['bs_localIdentifier'];
        }
    }


    /**
     * Set up before each test
     *
     * @throws GuzzleException|RuntimeException
     */
    protected function setUp(): void
    {
        parent::setUp();

        if (!self::$driver) {
            throw new RuntimeException('WebDriver not initialized');
        }

        try {
            $this->updateTestSessionName();
            $this->prepareTestEnvironment();
            $this->configureDriver();
            $this->createTestDirectories();
        } catch (\Exception $e) {
            throw new RuntimeException(
                "Failed to set up test environment: " . $e->getMessage(),
                0,
                $e
            );
        }
    }

    /**
     * Update test session name in BrowserStack
     *
     * @throws GuzzleException
     */
    private function updateTestSessionName(): void
    {
        if (!self::$driver || !self::$httpClient) {
            return;
        }

        $sessionId = self::$driver->getSessionID();
        self::$httpClient->request('PUT', "/automate/sessions/{$sessionId}.json", [
            'json' => ['name' => $this->getName(true)]
        ]);
    }

    /**
     * Prepare test environment
     *
     * @throws RuntimeException
     */
    private function prepareTestEnvironment(): void
    {
        if (!self::$driver) {
            throw new RuntimeException('WebDriver not initialized');
        }

        if (!isset($GLOBALS['SERVER_PBX'])) {
            throw new RuntimeException('SERVER_PBX not configured');
        }

        self::$driver->manage()->window()->maximize();

        // Only navigate if we're not already on the target domain
        // This preserves cookies between tests
        $currentUrl = self::$driver->getCurrentURL();
        $targetDomain = parse_url($GLOBALS['SERVER_PBX'], PHP_URL_HOST);
        $currentDomain = parse_url($currentUrl, PHP_URL_HOST);

        if ($currentDomain !== $targetDomain) {
            self::$driver->get($GLOBALS['SERVER_PBX']);
        }
    }

    /**
     * Take screenshot of current page
     *
     * @param string $name Screenshot name
     * @return string Screenshot path
     */
    protected function takeScreenshot(string $name): string
    {
        $screenshotDir = self::DEFAULT_SCREENSHOT_DIR;
        if (!is_dir($screenshotDir) && !@mkdir($screenshotDir, 0777, true) && !is_dir($screenshotDir)) {
            self::annotate("Warning: Cannot create screenshot directory: $screenshotDir");
            return '';
        }

        $path = sprintf('%s/%s_%s.png', $screenshotDir, date('Y-m-d_H-i-s'), $name);
        self::$driver->takeScreenshot($path);
        return $path;
    }

    /**
     * Tear down after each test
     */
    protected function tearDown(): void
    {
        parent::tearDown();
        if ($this->getStatus() !== 0) {
            self::$testResult = false;
            $screenshotPath = $this->takeScreenshot($this->getName());
            self::$failureConditions[] = sprintf(
                'Test: %s Message: %s Screenshot: %s',
                $this->getName(true),
                $this->getStatusMessage(),
                $screenshotPath
            );
        }
    }

    /**
     * Tear down after all tests
     */
    public static function tearDownAfterClass(): void
    {
        self::updateTestSessionStatus();
        self::cleanupResources();
    }

    /**
     * Update test session status in BrowserStack
     */
    private static function updateTestSessionStatus(): void
    {
        try {
            $sessionId = self::$driver->getSessionID();
            $status = self::$testResult ? 'passed' : 'failed';
            $statusMessage = implode(PHP_EOL, self::$failureConditions);

            self::$httpClient->request('PUT', "/automate/sessions/{$sessionId}.json", [
                'json' => [
                    'status' => $status,
                    'reason' => $statusMessage,
                ]
            ]);
        } catch (GuzzleException $e) {
            error_log("Failed to update test session status: " . $e->getMessage());
        }
    }

    /**
     * Cleanup test resources safely
     */
    private static function cleanupResources(): void
    {
        try {
            if (self::$driver) {
                self::$driver->quit();
                self::$driver = null;
            }
        } catch (\Exception $e) {
            error_log("Failed to quit WebDriver: " . $e->getMessage());
        }

        try {
            if (self::$bs_local) {
                self::$bs_local->stop();
                self::$bs_local = null;
            }
        } catch (\Exception $e) {
            error_log("Failed to stop BrowserStack Local: " . $e->getMessage());
        }
    }

    /**
     * Configure WebDriver settings
     */
    private function configureDriver(): void
    {
        self::$driver->manage()->window()->setSize(
            new \Facebook\WebDriver\WebDriverDimension(
                self::CONFIG['browser']['window']['width'],
                self::CONFIG['browser']['window']['height']
            )
        );

        self::$driver->manage()->timeouts()->pageLoadTimeout(
            self::CONFIG['browser']['timeouts']['page_load']
        );

        self::$driver->manage()->timeouts()->setScriptTimeout(
            self::CONFIG['browser']['timeouts']['script']
        );
    }

    /**
     * Create necessary test directories
     */
    private function createTestDirectories(): void
    {
        foreach (self::CONFIG['paths'] as $path) {
            if (!is_dir($path) && !mkdir($path, 0777, true) && !is_dir($path)) {
                throw new RuntimeException("Failed to create directory: $path");
            }
        }
    }
}
