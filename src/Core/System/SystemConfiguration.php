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

namespace MikoPBX\Core\System;

use MikoPBX\Common\Providers\ConfigProvider;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * SystemConfiguration class
 *
 * @package MikoPBX\Core\System
 *
 */
class SystemConfiguration extends Injectable
{
    private string $configDBPath='';
    private const string DEFAULT_CONFIG_DB = '/conf.default/mikopbx.db';

    public function __construct()
    {
        $this->configDBPath = $this->di->getShared(ConfigProvider::SERVICE_NAME)->path('database.dbfile');
    }
    /**
     * SQLite database file magic header (first 16 bytes).
     * Used to distinguish a binary database snapshot from a legacy SQL dump.
     *
     * @see https://www.sqlite.org/fileformat.html#magic_header_string
     */
    private const string SQLITE_MAGIC = "SQLite format 3\0";

    /**
     * Trying to restore the backup
     * @return void
     */
    public function tryRestoreConf():void
    {
        $di = Di::getDefault();
        if ($di === null) {
            return;
        }
        $storage = new Storage();
        $storages = $storage->getStorageCandidate();
        $tmpMountDir = '/tmp/mnt';
        $confBackupDir = Directories::getDir(Directories::CORE_CONF_BACKUP_DIR);
        $backupDir   = str_replace(['/storage/usbdisk1','/mountpoint'], ['',''], $confBackupDir);
        $confFile    = $this->configDBPath;
        foreach ($storages as $dev => $fs) {
            SystemMessages::echoStartMsg(" - Mounting $dev...");
            Util::mwMkdir($tmpMountDir."/$dev");
            $res = Storage::mountDisk($dev, $fs, $tmpMountDir."/$dev");
            if (!$res) {
                SystemMessages::echoResultMsg(SystemMessages::RESULT_FAILED);
            } else {
                SystemMessages::echoResultMsg(SystemMessages::RESULT_DONE);
            }
        }

        $lastBackUp = $this->pickFreshestBackup($tmpMountDir, $backupDir);
        if (!empty($lastBackUp)) {
            $this->restoreFromArchive($lastBackUp, $confFile);
        } else {
            // Operator-visible breadcrumb: empty $lastBackUp means none of
            // the mounted storage candidates yielded a usable backup file.
            // Without this, an unattended boot fails over to default config
            // silently and the only diagnostic is "settings reverted".
            SystemMessages::echoStartMsg(' - No backups found on mounted storage');
            SystemMessages::echoResultMsg(SystemMessages::RESULT_SKIPPED);
            SystemMessages::sysLogMsg(
                'SystemConfiguration',
                'tryRestoreConf: no backup archives found on any mounted storage',
                LOG_NOTICE
            );
        }
        $umount = Util::which('umount');
        foreach ($storages as $dev => $fs) {
            SystemMessages::echoStartMsg(" - Unmounting $dev...");
            shell_exec("$umount $dev");
            SystemMessages::echoResultMsg(SystemMessages::RESULT_DONE);
        }
    }

    /**
     * One-shot marker preventing a restore-reboot loop within a single boot.
     * Lives on tmpfs (/var/run) so it disappears on the next reboot and the
     * restore path is allowed to fire again if the DB is missing on next boot.
     */
    private const string REBOOT_MARKER = '/var/run/conf-restored';

    /**
     * Pick the backup archive to restore from across all mounted storage
     * candidates, preferring the newest binary snapshot (current format)
     * over any legacy SQL-dump archives. Legacy archives are only chosen
     * when no binary snapshot is available anywhere — that keeps boxes
     * with mixed-age archive directories from regressing onto the
     * vulnerable SQL-replay path when a fresh binary snapshot exists.
     *
     * @return string Absolute path to a gzipped backup, or empty string
     *                if no backup was found.
     */
    private function pickFreshestBackup(string $tmpMountDir, string $backupDir): string
    {
        $find = Util::which('find');
        $sort = Util::which('sort');
        $cut  = Util::which('cut');

        // Newest first; each line is an absolute path to a .gz archive.
        $raw = shell_exec(
            "$find $tmpMountDir/dev/*$backupDir -type f -printf '%T@ %p\\n' "
            . "| $sort -rn | $cut -f 2- -d ' '"
        ) ?? '';

        $binaryPick = '';
        $legacyPick = '';
        foreach (preg_split('/\R/', trim($raw)) as $candidate) {
            $candidate = trim($candidate);
            if ($candidate === '' || !is_file($candidate)) {
                continue;
            }
            if ($this->isBinaryArchive($candidate)) {
                $binaryPick = $candidate;
                break;  // newest binary wins outright
            }
            if ($legacyPick === '') {
                $legacyPick = $candidate;  // newest non-binary as fallback
            }
        }

        return $binaryPick !== '' ? $binaryPick : $legacyPick;
    }

    /**
     * Quick magic-byte probe: peek the first 16 decompressed bytes of the
     * gzipped archive and check for the SQLite file header. Robust against
     * filename heuristics (binary and legacy archives share the same
     * `*_mikopbx.db.gz` naming convention).
     *
     * Implementation notes:
     *   - Uses popen() instead of `head -c 16` so we don't depend on the
     *     appliance's BusyBox `head` feature flags.
     *   - The pipe MUST be drained before pclose(). If we closed after
     *     reading only 16 bytes, gzip's next write would trip EPIPE /
     *     SIGPIPE and pclose() would return non-zero on EVERY valid
     *     archive — flooding syslog with spurious "probe failed" warnings.
     *     Draining costs one full decompression (~5 MB for a 20 MB DB)
     *     which is acceptable at boot time.
     */
    private function isBinaryArchive(string $gzPath): bool
    {
        $gzip = Util::which('gzip');
        // Util::which() falls back to returning the bare command name when
        // the binary isn't found anywhere. Absence of '/' in the result
        // is the only reliable signal that no real executable was located.
        if (!str_contains($gzip, '/')) {
            SystemMessages::sysLogMsg(
                'SystemConfiguration',
                'gzip binary missing — cannot probe archive format',
                LOG_ERR
            );
            return false;
        }

        $cmd  = "$gzip -c -d " . escapeshellarg($gzPath) . " 2>/dev/null";
        $pipe = popen($cmd, 'r');
        if ($pipe === false) {
            return false;
        }
        $magic = (string) fread($pipe, 16);
        // Drain the rest so gzip exits cleanly (avoid SIGPIPE noise).
        while (!feof($pipe)) {
            fread($pipe, 8192);
        }
        $status = pclose($pipe);
        if ($status !== 0) {
            SystemMessages::sysLogMsg(
                'SystemConfiguration',
                "gzip probe failed (exit=$status) for archive: $gzPath",
                LOG_WARNING
            );
            return false;
        }
        return $magic === self::SQLITE_MAGIC;
    }

    /**
     * Restore the configuration DB from a gzipped backup.
     *
     * Auto-detects the archive payload format and applies the matching
     * restoration strategy:
     *   - Binary SQLite snapshot (current format, produced by sqlite3 .backup):
     *     restored via atomic file copy. Schema and data are page-consistent
     *     by construction, so no INSERT/CREATE-TABLE ordering ambiguity is
     *     possible.
     *   - Legacy SQL text dump (produced by older sqlite3 .dump-based scripts):
     *     replayed through `sqlite3 < dump` for backward compatibility with
     *     pre-existing backup archives on disk.
     *
     * Detection is performed against the SQLite file magic header — the only
     * reliable on-disk discriminator that does not depend on the file name
     * or extension.
     *
     * On any failure the method falls back to DEFAULT_CONFIG_DB and logs the
     * reason via SystemMessages::sysLogMsg so the operator can diagnose why
     * the appliance came up with default settings.
     */
    private function restoreFromArchive(string $lastBackUp, string $confFile): void
    {
        $gzip    = Util::which('gzip');
        $sqlite3 = Util::which('sqlite3');

        // Hard prerequisites — without either of these the restore cannot
        // run AT ALL. Util::which() returns the bare command name as a
        // fallback when nothing executable is located, so the absence of
        // a path separator is the signal we need to check (NOT === '').
        if (!str_contains($gzip, '/') || !str_contains($sqlite3, '/')) {
            $this->failRestore(
                'required utility missing (gzip="' . $gzip . '", sqlite3="' . $sqlite3 . '")',
                null,
                $confFile
            );
            return;
        }

        SystemMessages::echoStartMsg(" - Restoring $lastBackUp...");

        // Clean slate UP FRONT: every failure path below ends in a
        // copy(DEFAULT_CONFIG_DB) fallback, and we must not leave stale
        // -wal/-shm/-journal sidecars behind that could later corrupt
        // an otherwise-pristine default DB on first open.
        $this->purgeConfDb($confFile);

        // tempnam() creates the file with mode 0600 and refuses to follow
        // an attacker-planted symlink — safer than a PID-predictable path
        // even though this code only ever runs as root at early boot.
        $tmpRestore = tempnam('/tmp', 'restore.');
        if ($tmpRestore === false) {
            $tmpRestore = '/tmp/restore.' . getmypid() . '.payload';
        }
        $escapedBackup  = escapeshellarg($lastBackUp);
        $escapedTmp     = escapeshellarg($tmpRestore);

        Processes::mwExec("$gzip -c -d $escapedBackup > $escapedTmp", $gzOut, $gzRet);
        if ($gzRet !== 0 || !is_file($tmpRestore) || filesize($tmpRestore) < 16) {
            $this->failRestore(
                "gunzip failed for $lastBackUp (rc=$gzRet, size="
                . (is_file($tmpRestore) ? filesize($tmpRestore) : 'n/a') . ')',
                $tmpRestore,
                $confFile
            );
            return;
        }

        $fh    = fopen($tmpRestore, 'rb');
        $magic = $fh ? (string) fread($fh, 16) : '';
        if ($fh) {
            fclose($fh);
        }
        $isBinarySnapshot = ($magic === self::SQLITE_MAGIC);

        if ($isBinarySnapshot) {
            // Binary: byte-for-byte file replacement — schema and data are
            // page-consistent by construction, no SQL parsing involved.
            if (!copy($tmpRestore, $confFile)) {
                $this->failRestore(
                    "copy('$tmpRestore' -> '$confFile') failed",
                    $tmpRestore,
                    $confFile
                );
                return;
            }
        } else {
            // Legacy SQL dump path — kept for archives produced by the
            // previous (textual) dump-conf-db.
            //
            // CAVEAT: archives produced by the OLD dump-conf-db (before the
            // atomic-mkdir-lock fix) may themselves contain interleaved SQL
            // from concurrent writers. Replaying them faithfully reproduces
            // whatever cross-table smearing was baked in at backup time.
            // Surface this to the operator so anomalous data post-boot has
            // a documented origin.
            SystemMessages::sysLogMsg(
                'SystemConfiguration',
                "Replaying LEGACY SQL archive '$lastBackUp' — data integrity "
                . 'depends on the producer; verify post-boot state if anomalies appear',
                LOG_WARNING
            );

            $escapedConf = escapeshellarg($confFile);
            Processes::mwExec(
                "$sqlite3 $escapedConf < $escapedTmp 2>&1",
                $sqlOut,
                $sqlRet
            );
            if ($sqlRet !== 0) {
                $this->failRestore(
                    'sqlite3 replay failed (rc=' . $sqlRet . '): '
                    . implode(' | ', (array) $sqlOut),
                    $tmpRestore,
                    $confFile
                );
                return;
            }
        }

        @unlink($tmpRestore);

        // Real integrity check — a SELECT can succeed against a corrupt
        // page-tree if it never touches the bad page. quick_check walks
        // the b-tree structure and is bounded.
        Processes::mwExec(
            "$sqlite3 " . escapeshellarg($confFile) . " 'PRAGMA quick_check;'",
            $checkOut,
            $checkRet
        );
        $firstLine = $checkOut[0] ?? '';
        if ($checkRet !== 0 || $firstLine !== 'ok') {
            $this->failRestore(
                'quick_check on restored DB failed (rc=' . $checkRet
                . ', out=' . implode(' | ', (array) $checkOut) . ')',
                null,
                $confFile
            );
            return;
        }

        // Best-effort diagnostic: report FK-constraint violations introduced
        // by the restore. We do NOT fail on FK errors — pre-existing schemas
        // may carry historical inconsistencies that predate FK enforcement,
        // and refusing to boot over them would be a regression.
        Processes::mwExec(
            "$sqlite3 " . escapeshellarg($confFile) . " 'PRAGMA foreign_key_check;'",
            $fkOut,
            $fkRet
        );
        if ($fkRet === 0 && !empty($fkOut)) {
            SystemMessages::sysLogMsg(
                'SystemConfiguration',
                'foreign_key_check reported violations after restore (continuing): '
                . implode(' | ', (array) $fkOut),
                LOG_WARNING
            );
        }

        SystemMessages::echoResultMsg(SystemMessages::RESULT_DONE);

        // Reboot to let the rest of the system pick up the restored settings,
        // but only once per boot — the marker on tmpfs evaporates on reboot
        // so a genuine "DB missing again next boot" scenario still triggers.
        if (!$this->isDefaultConf()) {
            // @touch returns false if /var/run is unwritable. If we can't
            // create the marker, refuse to reboot — otherwise we risk an
            // unbounded restore→reboot loop on a half-broken filesystem.
            if (file_exists(self::REBOOT_MARKER)) {
                SystemMessages::sysLogMsg(
                    'SystemConfiguration',
                    'Restore succeeded but reboot marker already set — skipping reboot to avoid loop',
                    LOG_WARNING
                );
                return;
            }
            if (@touch(self::REBOOT_MARKER) === false) {
                SystemMessages::sysLogMsg(
                    'SystemConfiguration',
                    'Cannot create reboot marker ' . self::REBOOT_MARKER
                    . ' — refusing to reboot (would risk infinite loop)',
                    LOG_ERR
                );
                return;
            }
            System::reboot();
        }
    }

    /**
     * Remove the live config DB and any leftover SQLite sidecar files
     * (-wal, -shm, -journal). The operation stays entirely in PHP via
     * glob() + unlink() — no shell glob expansion, no unescaped path
     * interpolation, no dependency on an external `rm` utility.
     */
    private function purgeConfDb(string $confFile): void
    {
        $candidates = glob($confFile . '*') ?: [];
        foreach ($candidates as $f) {
            if (is_file($f)) {
                @unlink($f);
            }
        }
    }

    /**
     * Unified failure exit for restoreFromArchive(): logs the cause and
     * applies the DEFAULT_CONFIG_DB fallback so the box still boots.
     *
     * If the fallback copy itself fails (read-only target, missing default
     * source) the box would come up with NO database at all. We surface
     * that explicitly via LOG_CRIT — quieter alternatives would leave the
     * operator chasing a phantom-DB symptom with no breadcrumb.
     */
    private function failRestore(string $reason, ?string $tmpFile, string $confFile): void
    {
        SystemMessages::echoResultMsg(SystemMessages::RESULT_FAILED);
        SystemMessages::sysLogMsg(
            'SystemConfiguration',
            "Restore failed, falling back to default config: $reason",
            LOG_ERR
        );
        if ($tmpFile !== null) {
            @unlink($tmpFile);
        }
        // Re-purge before applying defaults: the failed restore may have
        // left a partially-written confFile or sidecar behind.
        $this->purgeConfDb($confFile);
        if (!copy(self::DEFAULT_CONFIG_DB, $confFile)) {
            SystemMessages::sysLogMsg(
                'SystemConfiguration',
                'CRITICAL: fallback copy of ' . self::DEFAULT_CONFIG_DB
                . ' to ' . $confFile . ' FAILED — box will boot without a DB',
                LOG_CRIT
            );
        }
    }

    /**
     * Is the configuration default?
     * @return bool
     */
    public function isDefaultConf():bool
    {
        $di = Di::getDefault();
        if ($di === null) {
            return false;
        }
        $confFile    = $this->configDBPath;
        $defaultConfFile =  self::DEFAULT_CONFIG_DB;
        $sqlite3 = Util::which('sqlite3');
        $md5sum = Util::which('md5sum');
        $cut = Util::which('cut');
        $md5_1 = shell_exec("$sqlite3 $confFile .dump | $md5sum | $cut -f 1 -d ' '");
        $md5_2 = shell_exec("$sqlite3 $defaultConfFile .dump | $md5sum | $cut -f 1 -d ' '");
        return $md5_1 === $md5_2;
    }
}
