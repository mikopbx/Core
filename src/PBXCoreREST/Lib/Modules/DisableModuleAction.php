<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\Modules;

use MikoPBX\Common\Models\ModuleOperations;
use MikoPBX\Common\Providers\MutexProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Modules\PbxExtensionState;
use MikoPBX\PBXCoreREST\Lib\Modules\Journal\OperationJournal;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;
use Throwable;

/**
 *  Class DisableModule
 *  Disables extension module.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class DisableModuleAction extends Injectable
{
    /**
     * Disables extension module.
     *
     * @param string $moduleUniqueID
     * @param string $reason Store the reason why the module was disabled as a flag
     * @param string $reasonText Store the reason why the module was disabled in text mode, some logs
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $moduleUniqueID, string $reason = '', string $reasonText = '', string $asyncChannelId = ''): PBXApiResult
    {
        // Journal dual-write: the toggle flow has no Stage_VII push, the row
        // is finalized here explicitly (mutex failures included).
        $journalContext = OperationJournal::begin(
            $moduleUniqueID,
            ModuleOperations::OPERATION_DISABLE,
            ['reason' => $reason, 'reasonText' => $reasonText],
            $asyncChannelId
        );

        try {
            $res = Di::getDefault()->get(MutexProvider::SERVICE_NAME)
                ->synchronized(
                    ModuleInstallationBase::MODULE_MANIPULATION_MUTEX_KEY,
                    function () use ($moduleUniqueID, $reason, $reasonText, $asyncChannelId, $journalContext) {
                        return self::disableModule($moduleUniqueID, $reason, $reasonText, $asyncChannelId, $journalContext);
                    },
                    10,
                    30
                );
        } catch (Throwable $e) {
            OperationJournal::finish($journalContext, false, ['error' => [$e->getMessage()]]);
            throw $e;
        }

        OperationJournal::finish($journalContext, $res->success, $res->messages);
        return $res;
    }


    /**
     * Disables extension module.
     *
     * @param string $moduleUniqueID
     * @param string $reason Store the reason why the module was disabled as a flag
     * @param string $reasonText Store the reason why the module was disabled in text mode, some logs
     * @param string $asyncChannelId Pub/sub nchan channel id for browser notifications
     * @param array|null $journalContext Operations journal context [operationUid, fencingToken]
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function disableModule(string $moduleUniqueID, string $reason = '', string $reasonText = '', string $asyncChannelId = '', ?array $journalContext = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $moduleStateProcessor = new PbxExtensionState($moduleUniqueID);
        if ($moduleStateProcessor->disableModule($reason, $reasonText) === false) {
            $res->success = false;
            $res->messages = $moduleStateProcessor->getMessages();
        } else {
            PBXConfModulesProvider::recreateModulesProvider();
            $res->data = $moduleStateProcessor->getMessages();
            $res->success = true;
        }

        if (!empty($asyncChannelId)) {
            $unifiedModulesEvents = new UnifiedModulesEvents($asyncChannelId, $moduleUniqueID);
            $unifiedModulesEvents->setJournalContext($journalContext);
            $unifiedModulesEvents->pushMessageToBrowser('Stage_I_ModuleDisable', $res->getResult());
        }

        return $res;
    }
}
