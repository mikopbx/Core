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

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Providers\ConfigProvider;
use Phalcon\Di\Injectable;

/**
 * Class SentryConf
 *
 * Represents the Sentry configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class SentryConf extends Injectable
{

    public const CONF_FILE = '/var/etc/sentry.conf';

    /**
     * Sets up the Sentry conf file.
     *
     * @return void
     */
    public function configure(): void
    {
        if (PbxSettings::getValueByKey(PbxSettingsConstants::SEND_METRICS) === '1') {
            touch(self::CONF_FILE);

            $sentryConfig = $this->getDI()->getShared(ConfigProvider::SERVICE_NAME)->path('sentry');

            // Set up options for the Sentry client
            $options = [
                'dsn'         => $sentryConfig->dsn,
                'environment' => $sentryConfig->enviroment??'development',
                'traces_sample_rate' =>($sentryConfig->enviroment !== 'development') ? 0.05: 1.0,
            ];

            // Set 'release' option if /etc/version file exists
            if (file_exists('/etc/version')) {
                $pbxVersion    = str_replace("\n", "", file_get_contents('/etc/version', false));
                $options['release']="mikopbx@{$pbxVersion}";
            }
            $conf = json_encode($options,JSON_PRETTY_PRINT);

            file_put_contents(self::CONF_FILE, $conf);

        } elseif (file_exists(self::CONF_FILE)) {
            unlink(self::CONF_FILE);
        }
    }
}