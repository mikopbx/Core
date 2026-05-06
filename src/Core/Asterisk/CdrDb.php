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

namespace MikoPBX\Core\Asterisk;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\CDRDatabaseProvider;
use MikoPBX\Core\System\{Directories, Util};
use Phalcon\Di\Di;
use Throwable;

/**
 * Additional methods
 */
class CdrDb
{
    /**
     * Returns the path to the CDR database file.
     *
     * @return string The path to the CDR database file.
     */
    public static function getPathToDB(): string
    {
        $di = Di::getDefault();
        if ($di === null) {
            return '';
        }
        return $di->getShared('config')->path('cdrDatabase.dbfile');
    }

    /**
     * Closes "broken" temporary CDR rows whose `endtime` was never set
     * (process crash, ungraceful shutdown, etc.).
     *
     * Implemented as a single parameterised SQL UPDATE in both modes:
     *
     *  - **Booting** (Asterisk not started yet): no live channels can exist,
     *    every row with empty `endtime` is by definition orphaned. The
     *    previous ORM-row-loop here used to stall `PbxConf::configure()` for
     *    minutes on 300k+ stale rows (3GB cdr.db boot regression).
     *
     *  - **Running**: queries AMI for active channels and excludes their
     *    linkedids via `linkedid NOT IN (…)`. The list of active linkedids
     *    is bounded by concurrent calls (typically <1000), so binding it
     *    inline is cheap.
     *
     * The `endtime` value mirrors the original branch's semantics: prefer
     * `answer` when present, otherwise fall back to `start`. `NULLIF(answer,
     * '')` collapses both NULL and empty-string answer columns to NULL, and
     * `COALESCE` then picks `start`.
     */
    public static function checkDb(): void
    {
        $di = Di::getDefault();
        if (!$di) {
            return;
        }
        $booting = ($di->getShared('registry')->booting === true);

        $activeLinkedIds = [];
        if (!$booting) {
            try {
                $am = Util::getAstManager('off');
                $activeLinkedIds = array_keys($am->GetChannels());
            } catch (Throwable $e) {
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
                return;
            }
        }

        try {
            /** @var \Phalcon\Db\Adapter\Pdo\Sqlite $connection */
            $connection = $di->get(CDRDatabaseProvider::SERVICE_NAME);

            $sql = "UPDATE cdr SET endtime = COALESCE(NULLIF(answer, ''), start) "
                 . "WHERE (endtime IS NULL OR endtime = '')";
            $bind = [];
            if (!empty($activeLinkedIds)) {
                $placeholders = implode(',', array_fill(0, count($activeLinkedIds), '?'));
                $sql         .= " AND linkedid NOT IN ($placeholders)";
                $bind         = array_values($activeLinkedIds);
            }
            $connection->execute($sql, $bind);
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
    }

    /**
     * Forms the path to the recording file without the extension.
     *
     * @param string $file_name The name of the file.
     *
     * @return string The path to the recording file without the extension.
     */
    public static function MeetMeSetRecFilename(string $file_name): string
    {
        $monitor_dir = Directories::getDir(Directories::AST_MONITOR_DIR);
        $sub_dir     = date("Y/m/d/H/");

        return "$monitor_dir/$sub_dir$file_name";
    }
}