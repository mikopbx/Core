<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Common\Models;

use Phalcon\Events\Manager;

/**
 * Class ModuleOperations
 *
 * Persistent journal of long-running module operations (install/update/enable/
 * disable/uninstall). Single source of truth for "is a module operation in
 * progress" and for UI progress recovery after page reload or nchan gaps.
 *
 * The table is written ONLY through raw SQL in
 * \MikoPBX\PBXCoreREST\Lib\Modules\Journal\ModuleOperationsRepository:
 * the orchestrator heartbeats every second and routing those writes through
 * the ORM would flood the Beanstalk models-events queue and the frontend
 * event bus (see ModelsBase::processSettingsChanges()). The model class exists
 * for schema auto-creation from annotations (UpdateDatabase) and for reads.
 *
 * @Indexes(
 *     [name='operationUid', columns=['operationUid'], type='UNIQUE'],
 *     [name='state', columns=['state'], type=''],
 *     [name='moduleUniqueId', columns=['moduleUniqueId'], type='']
 * )
 *
 * @package MikoPBX\Common\Models
 */
class ModuleOperations extends ModelsBase
{
    // Operation types
    public const string OPERATION_INSTALL_REPO = 'install_repo';
    public const string OPERATION_INSTALL_PACKAGE = 'install_package';
    public const string OPERATION_ENABLE = 'enable';
    public const string OPERATION_DISABLE = 'disable';
    public const string OPERATION_UNINSTALL = 'uninstall';

    // Operation states
    public const string STATE_PENDING = 'pending';
    public const string STATE_RUNNING = 'running';
    public const string STATE_ROLLING_BACK = 'rolling_back';
    public const string STATE_COMPLETED = 'completed';
    public const string STATE_FAILED = 'failed';
    public const string STATE_CANCELLED = 'cancelled';

    // States considered "operation is in progress"
    public const array ACTIVE_STATES = [
        self::STATE_PENDING,
        self::STATE_RUNNING,
        self::STATE_ROLLING_BACK,
    ];

    // Final states: every operation MUST end in one of these
    public const array TERMINAL_STATES = [
        self::STATE_COMPLETED,
        self::STATE_FAILED,
        self::STATE_CANCELLED,
    ];

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * External unique identifier of the operation, exposed to the UI
     *
     * @Column(type="string", nullable=false)
     */
    public ?string $operationUid = '';

    /**
     * Unique identifier of the module the operation works on
     *
     * @Column(type="string", nullable=false)
     */
    public ?string $moduleUniqueId = '';

    /**
     * Operation type: one of the OPERATION_* constants
     *
     * @Column(type="string", nullable=false)
     */
    public ?string $operation = '';

    /**
     * Operation state: one of the STATE_* constants
     *
     * @Column(type="string", nullable=false)
     */
    public ?string $state = self::STATE_PENDING;

    /**
     * Last reported stage name (Stage_I..Stage_VII, UI compatible)
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $stage = '';

    /**
     * Progress percentage 0..100
     *
     * @Column(type="integer", nullable=true)
     */
    public $progress;

    /**
     * JSON encoded operation parameters (releaseId, filePath, reason, ...)
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $params = '';

    /**
     * JSON encoded error messages in PBXApiResult::messages format.
     * Named errorData because Phalcon\Mvc\Model already declares an internal
     * $errorMessages property — redeclaring it with a type is a fatal error.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $errorData = '';

    /**
     * '1' when the module was enabled before the operation started
     * (re-enable intent survives worker restarts in the DB, not in Redis)
     *
     * @Column(type="string", length=1, nullable=true)
     */
    public ?string $wasEnabled = '0';

    /**
     * Module version before the operation
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $prevVersion = '';

    /**
     * Module version being installed
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $newVersion = '';

    /**
     * JSON snapshot of the m_PbxExtensionModules row before the operation,
     * used by rollback to restore the registration
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $rowSnapshot = '';

    /**
     * Staging directory the new version is extracted into before swap
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $stagingPath = '';

    /**
     * Backup directory the previous version was moved into during swap
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $backupPath = '';

    /**
     * '1' after the live/backup directory swap happened — rollback checkpoint
     *
     * @Column(type="string", length=1, nullable=true)
     */
    public ?string $swapDone = '0';

    /**
     * Batch identifier when operation is part of an Update All run
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $batchId = '';

    /**
     * Pub/sub nchan channel id used to notify the browser
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $channelId = '';

    /**
     * Fencing token: every state transition is a compare-and-set on this
     * value, so a reaped/zombie process can never finalize the operation
     *
     * @Column(type="string", nullable=false)
     */
    public ?string $fencingToken = '';

    /**
     * PID of the orchestrator process
     *
     * @Column(type="integer", nullable=true)
     */
    public $pid;

    /**
     * Process group id of the orchestrator (supervisor kills the whole group)
     *
     * @Column(type="integer", nullable=true)
     */
    public $pgid;

    /**
     * Unix time of the last orchestrator heartbeat
     *
     * @Column(type="integer", nullable=true)
     */
    public $heartbeatAt;

    /**
     * Unix time the operation switched to running
     *
     * @Column(type="integer", nullable=true)
     */
    public $startedAt;

    /**
     * Unix time the operation reached a terminal state
     *
     * @Column(type="integer", nullable=true)
     */
    public $finishedAt;

    /**
     * Unix time the operation row was created
     *
     * @Column(type="integer", nullable=false)
     */
    public $createdAt;

    /**
     * Checks whether the given state is terminal.
     */
    public static function isTerminalState(string $state): bool
    {
        return in_array($state, self::TERMINAL_STATES, true);
    }

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_ModuleOperations');
        parent::initialize();

        // Journal rows change every second (heartbeat). Detach the ModelsBase
        // events manager so ORM writes to this table never publish Beanstalk
        // model-change jobs or frontend event-bus notifications.
        $this->setEventsManager(new Manager());
    }
}
