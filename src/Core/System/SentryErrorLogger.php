<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\System;

use Exception;
use Sentry;

/**
 * Collects errors and send them to Sentry cloud for software improvement reasons
 */
class SentryErrorLogger
{

    protected $dsn; // Sentry unique ID
    protected $libraryName;
    protected $licKey;
    protected $companyName;
    protected $email;
    protected $release; // MikoPBX release
    protected $environment; // development or production
    protected $enabled; // MikoPBX general settings "send errors to developers"


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
        $this->enabled = file_exists('/tmp/sendmetrics');
    }

    /**
     * Если в настройках PBX разрешено отправлять сообщения об ошибках на сервер,
     * то функция инициализирует подпистему облачного логирования ошибок Sentry
     *
     * @return Boolean - initialization result
     */
    public function init(): bool
    {
        if ($this->enabled) {
            Sentry\init(
                [
                    'dsn'         => $this->dsn,
                    'release'     => $this->release,
                    'environment' => $this->environment,
                ]
            );
            Sentry\configureScope(
                function (Sentry\State\Scope $scope): void {
                    if (isset($this->email)) {
                        $scope->setUser(['id' => $this->email], true);
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
     * Process errors and send it to sentry cloud
     *
     * @param \Error $e
     */
    public function captureException(\Error $e): void
    {
        Sentry\captureException($e);
    }
}

