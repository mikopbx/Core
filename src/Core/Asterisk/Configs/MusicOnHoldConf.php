<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\SystemManagementProcessor;

class MusicOnHoldConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'musiconhold.conf';

    protected function generateConfigProtected(): void
    {
        $mohPath = $this->config->path('asterisk.mohdir');
        $conf    = "[default]\n" .
            "mode=files\n" .
            "directory=$mohPath\n\n";

        $mohSounds = SoundFiles::find(["category='".SoundFiles::CATEGORY_MOH."'", 'columns' => 'id,name,path']);
        foreach ($mohSounds as $moh){
            $filename = Util::trimExtensionForFile($moh->path);
            if(!file_exists("$filename.wav")){
                continue;
            }
            $conf.= "[moh-$moh->id]; " . str_replace([PHP_EOL, ';'], '', $moh->name). PHP_EOL.
                "mode=playlist" .PHP_EOL.
                "entry=$filename".PHP_EOL.PHP_EOL;
        }

        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/musiconhold.conf', $conf);
        $this->checkMohFiles();
    }

    /**
     * Проверка существования MOH файлов.
     */
    protected function checkMohFiles(): void
    {
        $path  = $this->config->path('asterisk.mohdir');
        $mask  = '/*.mp3';
        $fList = glob("{$path}{$mask}");
        if (count($fList) !== 0) {
            foreach ($fList as $resultMp3) {
                $this->checkAddFileToDB($resultMp3);
            }

            return;
        }
        Util::sysLogMsg(static::class, 'Attempt to restore MOH from default...');
        $filesList = glob("/offload/asterisk/sounds/moh{$mask}");
        $cpPath    = Util::which('cp');
        foreach ($filesList as $srcFile) {
            $resultMp3 = "{$path}/" . basename($srcFile);
            $resultWav = Util::trimExtensionForFile($resultMp3) . '.wav';
            Processes::mwExec("{$cpPath} $srcFile {$resultMp3}");
            SystemManagementProcessor::convertAudioFile($resultMp3);
            if ( ! file_exists($resultWav)) {
                Util::sysLogMsg(static::class, "Failed to convert file {$resultWav}...");
            }

            $this->checkAddFileToDB($resultMp3);
        }
    }

    protected function checkAddFileToDB($resultMp3): void
    {
        /** @var SoundFiles $sf */
        $sf = SoundFiles::findFirst("path='{$resultMp3}'");
        if ($sf === null) {
            $sf           = new SoundFiles();
            $sf->category = SoundFiles::CATEGORY_MOH;
            $sf->name     = basename($resultMp3);
            $sf->path     = $resultMp3;
            if ( ! $sf->save()) {
                Util::sysLogMsg(static::class, "Error save SoundFiles record {$sf->name}...");
            }
        }
    }
}