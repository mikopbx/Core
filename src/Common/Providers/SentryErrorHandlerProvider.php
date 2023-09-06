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

namespace MikoPBX\Common\Providers;

use MikoPBX\Core\System\Configs\SentryConf;
use MikoPBX\Core\System\Network;
use Sentry\ClientBuilder;
use Sentry\SentrySdk;
use Sentry\State\HubInterface;
use Sentry\State\Scope;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * Registers the Sentry error handler service.
 *
 * @package MikoPBX\Common\Providers
 */
class SentryErrorHandlerProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'sentryErrorHandler';


    /**
     * Registers sentry error handler service provider
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $di->set(
            self::SERVICE_NAME,
            function () use ($di): ?HubInterface {

                // No internet no sentry
                if (!file_exists(Network::INTERNET_FLAG_FILE)){
                    return null;
                }
                // Check if config file exists, return null if not and disable sentry logger
                if (!file_exists(SentryConf::CONF_FILE)) {
                    return null;
                }
                $options = json_decode(file_get_contents(SentryConf::CONF_FILE) ?? '', true);
                if (empty($options)) {
                    return null;
                }

                $moduleTag = 'unknown';
                if ($di->has(RegistryProvider::SERVICE_NAME)) {
                    $moduleTag = $di->getShared(RegistryProvider::SERVICE_NAME)->libraryName ?? 'unknown';
                }

                // Create and bind the Sentry client
                $client = ClientBuilder::create($options)->getClient();
                SentrySdk::init()->bindClient($client);

                // Configure Sentry scope with user info, license info, and library tag
                $licenseInfo = self::prepareLicenseInfo();

                SentrySdk::getCurrentHub()->configureScope(
                    function (Scope $scope) use ($licenseInfo, $moduleTag): void {
                        if (!empty($licenseInfo->key)) {
                            $scope->setUser(
                                [
                                    'id'=>$licenseInfo->key,
                                    'email' => $licenseInfo->email,
                                    'username'=>$licenseInfo->companyname
                                ]
                            );
                        }
                        if (isset($moduleTag)) {
                            $scope->setTag('library', $moduleTag);
                        }
                    }
                );

                return SentrySdk::getCurrentHub();
            }
        );
    }

    /**
     * Prepares and returns the license info object.
     *
     * @return \stdClass The prepared license info object.
     */
    private static function prepareLicenseInfo(): \stdClass
    {
        $licenseInfo = new \stdClass();
        $licenseInfo->key = '';
        $licenseInfo->email = '';
        $licenseInfo->companyname = '';

        if (!file_exists(MarketPlaceProvider::LIC_FILE_PATH)){
            return $licenseInfo;
        }
        // Retrieve the last get license request from the cache
       $encodedContent = file_get_contents(MarketPlaceProvider::LIC_FILE_PATH);
       $licenseInfoResult =  json_decode($encodedContent,true);

        if (is_array($licenseInfoResult)) {
            foreach ($licenseInfoResult['@attributes'] as $attribute => $value) {
                if (!empty($value) and property_exists($licenseInfo, $attribute)) {
                    $licenseInfo->$attribute = $value;
                }
            }
        }
        return $licenseInfo;
    }
}