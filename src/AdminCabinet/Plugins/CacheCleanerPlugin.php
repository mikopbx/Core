<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

namespace MikoPBX\AdminCabinet\Plugins;

use Phalcon\Di\Injectable;

/**
 * CacheCleanerPlugin
 *
 * Check messages on clean cache queue
 */
class CacheCleanerPlugin extends Injectable
{
    /**
     * This action is executed before execute any action in the application
     *
     * @return bool
     */
    public function beforeDispatch(): bool
    {
        $queue = $this->getDI()->getShared('beanstalkConnectionCache');

        $arrayOfClearedModels = $queue->getMessagesFromTube();
        foreach ($arrayOfClearedModels as $clearedModel) {
            if (class_exists($clearedModel)) {
                call_user_func([$clearedModel, 'clearCache'], $clearedModel);
            }
        }

        return true;
    }
}
