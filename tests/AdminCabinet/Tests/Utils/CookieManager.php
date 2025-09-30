<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Tests\AdminCabinet\Tests\Utils;

use Facebook\WebDriver\Cookie;
use Facebook\WebDriver\Remote\RemoteWebDriver;
use RuntimeException;

/**
 * Class CookieManager
 * Utility class for managing browser cookies in Selenium tests
 */
class CookieManager
{
    private RemoteWebDriver $driver;
    private string $domain;
    private string $cookieStorage;

    /**
     * CookieManager constructor
     *
     * @param RemoteWebDriver $driver WebDriver instance
     * @param string $domain Domain for cookies
     * @param string|null $storageDir Custom storage directory for cookies
     */
    public function __construct(RemoteWebDriver $driver, string $domain, ?string $storageDir = null)
    {
        $this->driver = $driver;
        $this->domain = $domain;

        // Setup storage directory
        $baseDir = $storageDir ?? sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'selenium_cookies';
        if (!is_dir($baseDir) && !mkdir($baseDir, 0777, true) && !is_dir($baseDir)) {
            throw new RuntimeException("Failed to create directory: {$baseDir}");
        }

        $this->cookieStorage = $baseDir . DIRECTORY_SEPARATOR . 'cookies_' . md5($domain) . '.json';
    }

    /**
     * Save all current cookies
     *
     * @return bool
     */
    public function saveCookies(): bool
    {
        try {
            $cookies = $this->driver->manage()->getCookies();
            $cookieData = [];

            foreach ($cookies as $cookie) {
                $cookieData[] = [
                    'name' => $cookie->getName(),
                    'value' => $cookie->getValue(),
                    'domain' => $cookie->getDomain() ?: $this->domain,
                    'path' => $cookie->getPath() ?: '/',
                    'expiry' => $cookie->getExpiry(),
                    'secure' => $cookie->isSecure(),
                    'httpOnly' => $cookie->isHttpOnly()
                ];
            }

            $saved = file_put_contents(
                $this->cookieStorage,
                json_encode($cookieData, JSON_PRETTY_PRINT)
            );

            return $saved !== false;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Load and restore saved cookies
     *
     * @return bool
     */
    public function loadCookies(): bool
    {
        if (!file_exists($this->cookieStorage)) {
            return false;
        }

        try {
            $cookieData = json_decode(file_get_contents($this->cookieStorage), true);
            if (!is_array($cookieData)) {
                return false;
            }

            // Delete all existing cookies first
            $this->driver->manage()->deleteAllCookies();

            // Add each saved cookie
            foreach ($cookieData as $cookieInfo) {
                $cookie = new Cookie(
                    $cookieInfo['name'],
                    $cookieInfo['value'],
                    $cookieInfo['domain'],
                    $cookieInfo['path'],
                    $cookieInfo['expiry'] ? new \DateTime('@' . $cookieInfo['expiry']) : null,
                    $cookieInfo['secure'],
                    $cookieInfo['httpOnly']
                );

                $this->driver->manage()->addCookie($cookie);
            }

            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Delete all cookies and cookie storage
     *
     * @return bool
     */
    public function clearAll(): bool
    {
        try {
            // Clear browser cookies
            $this->driver->manage()->deleteAllCookies();

            // Delete cookie storage file
            if (file_exists($this->cookieStorage)) {
                unlink($this->cookieStorage);
            }

            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}
