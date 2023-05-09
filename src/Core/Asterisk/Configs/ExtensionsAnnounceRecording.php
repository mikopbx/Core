<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2021 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\System\Util;

class ExtensionsAnnounceRecording extends AsteriskConfigClass
{
    /**
     * Prepares additional contexts sections in the extensions.conf file
     *
     * @return string
     */
    public function extensionGenContexts(): string
    {
        //
        return '[annonce-spy]' . PHP_EOL .
            'exten => _.!,1,ExecIf($[ "${EXTEN}" == "h" ]?Hangup())' . PHP_EOL . "\t" .
            'same => n,ExecIf($["${CHANNELS(PJSIP/${EXTEN})}x" != "x"]?Chanspy(PJSIP/${EXTEN},uBq))' . PHP_EOL . "\t" .
            'same => n,Hangup()' . PHP_EOL
            . PHP_EOL .
            '[annonce-playback-in]' . PHP_EOL .
            'exten => annonce,1,Answer()' . PHP_EOL . "\t" .
            'same => n,ExecIf("${PBX_REC_ANNONCE_IN}x" != "x"]?Playback(${PBX_REC_ANNONCE_IN}))' . PHP_EOL . "\t" .
            'same => n,Hangup()' . PHP_EOL
            . PHP_EOL .
            '[annonce-playback-out]' . PHP_EOL .
            'exten => annonce,1,Answer()' . PHP_EOL . "\t" .
            'same => n,ExecIf("${PBX_REC_ANNONCE_OUT}x" != "x"]?Playback(${PBX_REC_ANNONCE_OUT}))' . PHP_EOL . "\t" .
            'same => n,Hangup()' . PHP_EOL;
    }

    /**
     * Returns path to announce file by it's id
     *
     * @param string $id
     *
     * @return string
     */
    public static function getPathAnnounceFile(string $id): string
    {
        $filename = '';
        if ( ! empty($id)) {
            /** @var SoundFiles $fileData */
            $fileData = SoundFiles::findFirst($id);
            if ($fileData !== null) {
                $filename = Util::trimExtensionForFile($fileData->path);
            }
        }

        return $filename;
    }

    /**
     * Prepares additional parameters for each outgoing route context
     * before dial call in the extensions.conf file
     *
     * @param array $rout
     *
     * @return string
     */
    public function generateOutRoutContext(array $rout): string
    {
        return 'same => n,Set(_OUT_NEED_ANNONCE=1)' . "\n\t";
    }

    /**
     * Prepares additional parameters for each incoming context for each incoming route before dial in the
     * extensions.conf file
     *
     * @param string $rout_number
     *
     * @return string
     */
    public function generateIncomingRoutBeforeDial(string $rout_number): string
    {
        return 'same => n,Set(IN_NEED_ANNONCE=1)' . "\n\t";
    }

}