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

use MikoPBX\Common\Providers\EventBusProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\Modules\Journal\OperationJournal;
use Phalcon\Di\Injectable;

class UnifiedModulesEvents extends Injectable
{
    private string $asyncChannelId;
    private string $moduleUniqueId;
    private string $batchId;

    /**
     * Journal dual-write context: [operationUid, fencingToken] or null.
     * When set, every pushed stage is mirrored into the operations journal
     * and the message carries operationId for the UI polling fallback.
     */
    private ?array $journalContext = null;

    public function __construct(string $asyncChannelId, string $moduleUniqueId, string $batchId = '')
    {
        $this->asyncChannelId = $asyncChannelId;
        $this->moduleUniqueId = $moduleUniqueId;
        $this->batchId = $batchId;
    }

    /**
     * Sets the operations journal context produced by OperationJournal::begin().
     *
     * @param array|null $journalContext [operationUid, fencingToken] or null
     */
    public function setJournalContext(?array $journalContext): void
    {
        $this->journalContext = $journalContext;
    }

    /**
     * Pushes messages to browser
     * @param string $stage module event stage name
     * @param array $data pushing data
     * @return void
     */
    public function pushMessageToBrowser(string $stage, array $data): void
    {
        // Mirror the stage into the journal BEFORE notifying the browser, so
        // the polling fallback never lags behind nchan on terminal statuses.
        OperationJournal::recordStage($this->journalContext, $stage, $data);

        $message = [
            'stage' => $stage,
            'moduleUniqueId' => $this->moduleUniqueId,
            'stageDetails' => $data,
            'pid' => posix_getpid()
        ];
        if ($this->journalContext !== null) {
            $message['operationId'] = $this->journalContext[0];
        }
        if ($this->batchId !== '') {
            $message['batchId'] = $this->batchId;
            $message['batchMode'] = true;
        }

        SystemMessages::sysLogMsg(
            __CLASS__,
            json_encode($message, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT),
            LOG_DEBUG
        );
        $this->di->get(EventBusProvider::SERVICE_NAME)->publish($this->asyncChannelId, $message);
    }
}
