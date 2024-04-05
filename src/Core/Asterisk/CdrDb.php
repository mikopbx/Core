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

use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\{Directories, Util};
use Phalcon\Di;

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
     * Checks the CDR database for "broken" rows.
     */
    public static function checkDb(): void
    {
        $di = Di::getDefault();
        if(!$di){
            return;
        }
        $booting = ($di->getShared('registry')->booting === true);
        $channels_id = [];
        // Если booting, то asterisk не запущен.
        if(!$booting){
            $am          = Util::getAstManager('off');
            $channels_id = $am->GetChannels();
        }
        /** @var CallDetailRecordsTmp $data_cdr */
        /** @var CallDetailRecordsTmp $row_cdr */
        $data_cdr = CallDetailRecordsTmp::find();
        foreach ($data_cdr as $row_cdr) {
            if (array_key_exists($row_cdr->linkedid, $channels_id)) {
                continue;
            }
            if ( ! $row_cdr->endtime) {
                if ($row_cdr->answer) {
                    $row_cdr->endtime = $row_cdr->answer;
                } else {
                    $row_cdr->endtime = $row_cdr->start;
                }
                $row_cdr->save();
            }
        }
    }

    /**
     * Forms the path to the recording file without the extension.
     *
     * @param string $file_name The name of the file.
     *
     * @return string The path to the recording file without the extension.
     */
    public static function MeetMeSetRecFilename($file_name): string
    {
        $monitor_dir = Directories::getDir(Directories::AST_MONITOR_DIR);
        $sub_dir     = date("Y/m/d/H/");

        return "{$monitor_dir}/{$sub_dir}{$file_name}";
    }
}