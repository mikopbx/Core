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

namespace MikoPBX\PBXCoreREST\Lib\Modules\Pipeline;

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\PbxExtensionUtils;
use Throwable;

/**
 * Class RollbackService
 *
 * Restores the system to its pre-operation state from an install/update
 * journal row. The install pipeline never destroys the previous version
 * before the new one succeeds, and records `backupPath` write-ahead
 * (BEFORE moving the live dir aside), so the journal always knows where
 * the previous version can be.
 *
 * The restore decision is STATE-driven (see decideRestoreAction): what to do
 * is derived from which directories actually exist, not from flags alone —
 * that is what makes retries safe:
 *
 *  - backup dir exists            -> full restore (any swap phase: when
 *    swapDone='0' the live dir is either absent or contains the never-
 *    installed new code, never the previous version);
 *  - backupPath recorded, dir gone -> a previous rollback attempt already
 *    restored it; live dir must NOT be touched;
 *  - no backupPath, swapDone='1'  -> fresh install swapped into live:
 *    remove it and its registration row;
 *  - no backupPath, swapDone='0'  -> live system untouched.
 *
 * Callers finalize the journal row themselves — this service only restores
 * the system state and reports problems.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules\Pipeline
 */
class RollbackService
{
    // Restore decisions of decideRestoreAction()
    public const string ACTION_RESTORE_BACKUP = 'restore_backup';
    public const string ACTION_KEEP_LIVE = 'keep_live';
    public const string ACTION_REMOVE_FRESH = 'remove_fresh';
    public const string ACTION_NONE = 'none';

    /**
     * Pure decision function: what should the rollback do to the live dir.
     * Extracted for table-driven unit testing — this logic is what keeps
     * retries from destroying an already-restored module.
     *
     * @param string $backupPath backupPath recorded in the journal ('' when none)
     * @param bool $backupDirExists Whether that directory currently exists
     * @param bool $swapDone Journal swapDone flag
     *
     * @return string One of the ACTION_* constants
     */
    public static function decideRestoreAction(string $backupPath, bool $backupDirExists, bool $swapDone): string
    {
        if ($backupPath !== '' && $backupDirExists) {
            return self::ACTION_RESTORE_BACKUP;
        }
        if ($backupPath !== '') {
            // Recorded but gone: either restored by a previous attempt or the
            // write-ahead record preceded a rename that never happened (live
            // still holds the previous version). Both cases: keep live as is.
            return self::ACTION_KEEP_LIVE;
        }
        if ($swapDone) {
            return self::ACTION_REMOVE_FRESH; // fresh install reached live
        }
        return self::ACTION_NONE; // live system untouched
    }

    /**
     * Rolls back an install/update operation.
     *
     * @param array $row The journal row of the operation
     * @param callable|null $reEnable Optional callback(string $moduleUniqueId): bool
     *        that re-enables the restored version in an isolated child process
     *        (provided by the orchestrator); when null the re-enable is skipped
     *        and reported.
     *
     * @return array PBXApiResult::messages formatted problems ([] on full success)
     */
    public function rollback(array $row, ?callable $reEnable = null): array
    {
        $messages = [];
        $moduleUniqueId = (string)($row['moduleUniqueId'] ?? '');
        $stagingPath = (string)($row['stagingPath'] ?? '');
        $backupPath = (string)($row['backupPath'] ?? '');
        $swapDone = (string)($row['swapDone'] ?? '0') === '1';

        // Staging is never part of the live system — always safe to drop
        if ($stagingPath !== '' && is_dir($stagingPath) && self::isManagedPath($stagingPath)) {
            $rm = Util::which('rm');
            Processes::mwExec("$rm -rf " . escapeshellarg($stagingPath));
        }

        $action = self::decideRestoreAction($backupPath, $backupPath !== '' && is_dir($backupPath), $swapDone);
        if ($action === self::ACTION_NONE) {
            return $messages;
        }

        if ($moduleUniqueId === '') {
            $messages['error'][] = 'Rollback impossible: journal row carries no module id';
            return $messages;
        }
        $liveDir = PbxExtensionUtils::getModuleDir($moduleUniqueId);
        $restoredNow = false;

        switch ($action) {
            case self::ACTION_RESTORE_BACKUP:
                // Remove the new (failed) version from the live path
                if (is_dir($liveDir) && self::isManagedPath($liveDir)) {
                    $rm = Util::which('rm');
                    Processes::mwExec("$rm -rf " . escapeshellarg($liveDir));
                }
                if (!rename($backupPath, $liveDir)) {
                    $messages['error'][] = "Rollback failed: cannot restore $backupPath to $liveDir";
                    return $messages;
                }
                $restoredNow = true;
                break;
            case self::ACTION_KEEP_LIVE:
                // Already restored by a previous attempt (or the rename never
                // happened): the live dir holds the previous version — do not
                // touch it, only make sure the registration is consistent.
                if ((string)($row['wasEnabled'] ?? '0') === '1') {
                    // The previous attempt may have died before its re-enable
                    $messages['warning'][] = "Module $moduleUniqueId is restored but may be disabled";
                }
                break;
            case self::ACTION_REMOVE_FRESH:
                if (is_dir($liveDir) && self::isManagedPath($liveDir)) {
                    $rm = Util::which('rm');
                    Processes::mwExec("$rm -rf " . escapeshellarg($liveDir));
                }
                break;
        }

        $this->restoreRegistrationRow($moduleUniqueId, (string)($row['rowSnapshot'] ?? ''), $messages);

        // Re-enable only when THIS attempt restored the previous version
        if ($restoredNow && (string)($row['wasEnabled'] ?? '0') === '1') {
            if ($reEnable === null) {
                $messages['warning'][] = "Module $moduleUniqueId was restored but not re-enabled";
            } elseif (!$reEnable($moduleUniqueId)) {
                $messages['error'][] = "Module $moduleUniqueId was restored but failed to re-enable";
            }
        }

        SystemMessages::sysLogMsg(
            __CLASS__,
            "Rollback of module $moduleUniqueId completed ($action)"
            . ($messages === [] ? '' : ' with problems: ' . json_encode($messages)),
            $messages === [] ? LOG_NOTICE : LOG_WARNING
        );

        return $messages;
    }

    /**
     * Restores (or removes) the m_PbxExtensionModules row.
     *
     * A fresh install has an empty snapshot: the row registered by the failed
     * install must be deleted. An update restores the snapshot fields.
     */
    private function restoreRegistrationRow(string $moduleUniqueId, string $rowSnapshot, array &$messages): void
    {
        try {
            $snapshot = json_decode($rowSnapshot, true);
            $module = PbxExtensionModules::findFirstByUniqid($moduleUniqueId);

            if (!is_array($snapshot) || $snapshot === []) {
                // Fresh install: the module did not exist before the operation
                if ($module !== null) {
                    $module->delete();
                }
                return;
            }

            if ($module === null) {
                $module = new PbxExtensionModules();
            }
            foreach ($snapshot as $field => $value) {
                if ($field === 'id') {
                    continue;
                }
                if (property_exists($module, $field)) {
                    $module->$field = $value;
                }
            }
            if (!$module->save()) {
                $messages['error'][] = "Rollback: cannot restore registration of $moduleUniqueId";
            }
        } catch (Throwable $e) {
            $messages['error'][] = 'Rollback registration restore failed: ' . $e->getMessage();
        }
    }

    /**
     * Guard for rm -rf targets: only paths inside the modules storage are
     * ever removed by the rollback, regardless of what the journal says.
     */
    private static function isManagedPath(string $path): bool
    {
        $modulesDir = Directories::getDir(Directories::CORE_MODULES_DIR);
        return $modulesDir !== '' && str_starts_with($path, $modulesDir . '/');
    }
}
