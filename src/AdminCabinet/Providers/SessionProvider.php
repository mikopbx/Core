<?php

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\AdminCabinet\Providers;


use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Session\Adapter\Stream as SessionAdapter;
use Phalcon\Session\Manager as SessionManager;

/**
 * Start the session the first time some component request the session service
 */
class SessionProvider implements ServiceProviderInterface
{
    public function register(DiInterface $di): void
    {
        $phpSessionDir = $di->getShared('config')->path('www.phpSessionDir');
        $di->setShared(
            'session',
            function () use ($phpSessionDir) {
                $session = new SessionManager();
                $files   = new SessionAdapter(
                    [
                        'savePath' => $phpSessionDir,
                        'prefix'   => 'sess_',
                    ]
                );
                $session->setAdapter($files);
                $session->start();

                return $session;
            }
        );
    }
}