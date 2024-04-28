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

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\System\ConvertAudioFileAction;

/**
 * Class MusicOnHoldConf
 *
 * Represents the configuration class for musiconhold.conf.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class MusicOnHoldConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'musiconhold.conf';

    /**
     * Generates the configuration for musiconhold.conf.
     */
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

        // Write the configuration content to the file
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/musiconhold.conf', $conf);
        $this->checkMohFiles();
    }

    /**
     * Checks the MOH files in the specified path and adds them to the database if they exist.
     *
     */
    protected function checkMohFiles(): void
    {
        $path  = $this->config->path('asterisk.mohdir');
        $mask  = '/*.mp3';

        // Get the list of MP3 files in the specified path
        $fList = glob("{$path}{$mask}");
        if (count($fList) !== 0) {
            // Iterate through the MP3 files and add them to the database
            foreach ($fList as $resultMp3) {
                $this->checkAddFileToDB($resultMp3);
            }

            return;
        }

        // If no MP3 files are found in the specified path, attempt to restore from the default location
        SystemMessages::sysLogMsg(static::class, 'Attempt to restore MOH from default...');

        // Get the list of MP3 files from the default location
        $filesList = glob("/offload/asterisk/sounds/moh{$mask}");
        $cpPath    = Util::which('cp');
        foreach ($filesList as $srcFile) {
            $resultMp3 = "{$path}/" . basename($srcFile);
            $resultWav = Util::trimExtensionForFile($resultMp3) . '.wav';

            // Copy the file to the specified path
            Processes::mwExec("{$cpPath} $srcFile {$resultMp3}");

            // Convert the MP3 file to WAV format
            ConvertAudioFileAction::main($resultMp3);
            if ( ! file_exists($resultWav)) {
                SystemMessages::sysLogMsg(static::class, "Failed to convert file {$resultWav}...");
            }

            // Add the MP3 file to the database
            $this->checkAddFileToDB($resultMp3);
        }
    }

    /**
     * Check and add file to the database.
     *
     * @param string $resultMp3 The path of the mp3 file.
     */
    protected function checkAddFileToDB(string $resultMp3): void
    {
        /** @var SoundFiles $sf */
        $sf = SoundFiles::findFirst("path='{$resultMp3}'");
        if ($sf === null) {
            $sf           = new SoundFiles();
            $sf->category = SoundFiles::CATEGORY_MOH;
            $sf->name     = basename($resultMp3);
            $sf->path     = $resultMp3;
            if ( ! $sf->save()) {
                SystemMessages::sysLogMsg(static::class, "Error save SoundFiles record {$sf->name}...");
            }
        }
    }
}