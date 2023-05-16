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

declare(strict_types=1);

namespace MikoPBX\Common\Providers;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * The LanguageProvider class is responsible for registering the language service.
 *
 * @package MikoPBX\Common\Providers
 */
class LanguageProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'language';

    /**
     * Register language service provider
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($di){
                if (php_sapi_name() === 'cli') {
                    if (cli_get_process_title() === WorkerApiCommands::class
                        || $di->has('PREFERRED_LANG_WEB')
                        || cli_get_process_title() === WorkerModelsEvents::class) {
                        $language = PbxSettings::getValueByKey('WebAdminLanguage');
                    } else {
                        $language = PbxSettings::getValueByKey('SSHLanguage');
                    }
                } else {
                    $session = $di->getShared(SessionProvider::SERVICE_NAME);
                    $language = $session->get('WebAdminLanguage')??'';
                    if (empty($language)){
                        $language = PbxSettings::getValueByKey('WebAdminLanguage');
                    }
                }
                return $language;
            }
        );
    }
}