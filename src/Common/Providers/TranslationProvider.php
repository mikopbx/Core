<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\Common\Providers;


use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Translate\InterpolatorFactory;
use Phalcon\Translate\TranslateFactory;

/**
 * Localization service
 * @method string _(string $translateKey, array $placeholders = array())
 */
class TranslationProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'translation';

    /**
     * Register translation service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($di) {
                $interpolator = new InterpolatorFactory();
                $factory      = new TranslateFactory($interpolator);

                // Return a translation object
                return $factory->newInstance(
                    'array',
                    [
                        'content' => $di->getShared('messages'),
                    ]
                );
            }
        );
    }
}