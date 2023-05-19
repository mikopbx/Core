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


use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * Class BeanstalkConnectionModelsProvider
 *
 * Service provider for registering the Beanstalk connection for sending model changes to the backend application.
 *
 * @package MikoPBX\Common\Providers
 */
class BeanstalkConnectionModelsProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'beanstalkConnectionModels';

    public const SOURCE_INVOKE_ACTION = 'WorkerModelsEvents->invokeAction';

    public const SOURCE_MODELS_CHANGED = 'ModelsBase->sendChangesToBackend';

    /**
     * Register beanstalkConnectionModels service provider.
     *
     * @param \Phalcon\Di\DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () {
                return new BeanstalkClient(WorkerModelsEvents::class);
            }
        );
    }
}