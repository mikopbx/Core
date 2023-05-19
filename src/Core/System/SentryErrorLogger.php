<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

declare(strict_types=1);

namespace MikoPBX\Core\System;

use Sentry\ClientBuilder;
use Sentry\SentrySdk;
use Sentry\State\Scope;
use Throwable;

/**
 * Collects errors and send them to Sentry cloud for software improvement reasons
 */
class SentryErrorLogger
{

    protected string $dsn; // Sentry unique ID
    protected string $libraryName;
    protected string $licKey;
    protected string $companyName;
    protected string $email;
    protected string $release; // MikoPBX release
    protected string $environment; // development or production
    protected bool $enabled; // MikoPBX general settings "send errors to developers"


    /**
     * SentryErrorLogger constructor.
     *
     * @param string $libraryName The name of the library.
     */
    public function __construct($libraryName)
    {
        $this->dsn         = 'https://07be0eff8a5c463fbac3e90ae5c7d039@sentry.miko.ru/1';
        $this->libraryName = $libraryName;
        $this->environment = 'development';
        if (file_exists('/tmp/licenseInfo')) {
            $licenseInfo       = json_decode(file_get_contents('/tmp/licenseInfo', false));
            $this->licKey      = $licenseInfo->{'@attributes'}->key;
            $this->email       = $licenseInfo->{'@attributes'}->email;
            $this->companyName = $licenseInfo->{'@attributes'}->companyname;
        }
        if (file_exists('/etc/version')) {
            $pbxVersion    = str_replace("\n", "", file_get_contents('/etc/version', false));
            $this->release = "mikopbx@{$pbxVersion}";
        }
        $this->enabled = file_exists('/etc/sendmetrics');
    }

    /**
     * Initializes the Sentry error logging subsystem if error sending is enabled in the PBX settings.
     *
     * @return bool The initialization result.
     */
    public function init(): bool
    {
        if ($this->enabled) {
            $options = [
                'dsn'         => $this->dsn,
                'release'     => $this->release,
                'environment' => $this->environment,
            ];
            if ($this->environment === 'development') {
                $options['traces_sample_rate'] = 1.0;
            } else {
                $options['traces_sample_rate'] = 0.05;
            }
            $client = ClientBuilder::create($options)->getClient();

            SentrySdk::init()->bindClient($client);

            SentrySdk::getCurrentHub()->configureScope(
                function (Scope $scope): void {
                    if (isset($this->email)) {
                        $scope->setUser(['id' => $this->email]);
                    }
                    if (isset($this->licKey)) {
                        $scope->setExtra('key', $this->licKey);
                    }
                    if (isset($this->companyName)) {
                        $scope->setExtra('company', $this->companyName);
                    }
                    if (isset($this->libraryName)) {
                        $scope->setTag('library', $this->libraryName);
                    }
                }
            );
        }

        return $this->enabled;
    }

    /**
     * Captures an exception and sends it to the Sentry cloud.
     *
     * @param Throwable $e The exception to capture.
     */
    public function captureException(Throwable $e): void
    {
        SentrySdk::getCurrentHub()->captureException($e);
    }
}

