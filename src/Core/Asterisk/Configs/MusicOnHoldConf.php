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
use MikoPBX\Core\System\Configs\SoundFilesConf;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;

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
        $mohPath = Directories::getDir(Directories::AST_MOH_DIR);
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
        $directory = Directories::getDir(Directories::AST_ETC_DIR);
        Util::fileWriteContent($directory . '/musiconhold.conf', $conf);
        $this->checkMohFiles();
    }

    /**
     * Checks the MOH files in the specified path and adds them to the database if they exist.
     * Removes orphaned DB records where the file no longer exists on disk.
     */
    protected function checkMohFiles(): void
    {
        $path  = Directories::getDir(Directories::AST_MOH_DIR);
        // Discovery glob includes webm because ConvertAudioFileAction now produces a WebM/Opus
        // preview file as the canonical SoundFiles.path value (mp3 was dropped from the upload
        // pipeline). Both extensions need to be re-discoverable after a DB restore/reset, or
        // user-uploaded MOH tracks would silently disappear from the UI on rescan.
        // The shipped default MOH files (under /offload/.../moh/) remain mp3 — the same brace
        // pattern just falls through to mp3 there.
        $userMask = '/*.{mp3,webm}';
        $defaultMask = '/*.mp3';

        // Remove orphaned MOH records where the underlying file no longer exists on disk
        $this->cleanOrphanedMohRecords();

        // Get the list of audio files in the specified path (mp3 + webm).
        // Dedup by basename (without extension): one MOH track may have BOTH a legacy
        // .mp3 (original upload preserved before the WebM-first conversion landed) and
        // its canonical .webm sibling on disk. checkAddFileToDB() keys on the full path,
        // so naive globbing would create two SoundFiles rows for the same track and
        // duplicate the entry in musiconhold.conf after every regenerate/restore.
        // Resolution rule: prefer .webm when present (current canonical preview path),
        // otherwise fall back to whatever extension exists.
        $fList = glob("$path$userMask", GLOB_BRACE);
        if (!empty($fList)) {
            $byBasename = [];
            foreach ($fList as $resultFile) {
                $key = pathinfo($resultFile, PATHINFO_FILENAME);
                $existing = $byBasename[$key] ?? null;
                if ($existing === null) {
                    $byBasename[$key] = $resultFile;
                    continue;
                }
                // Already have a candidate for this basename — keep the .webm one.
                if (strtolower(pathinfo($resultFile, PATHINFO_EXTENSION)) === 'webm') {
                    $byBasename[$key] = $resultFile;
                }
            }
            foreach ($byBasename as $resultFile) {
                $this->checkAddFileToDB($resultFile);
            }

            return;
        }

        // If nothing found, fall back to shipped defaults (mp3-only) and convert them.
        SystemMessages::sysLogMsg(static::class, 'Attempt to restore MOH from default...');

        $filesList = glob("/offload/asterisk/sounds/moh$defaultMask");
        $cp    = Util::which('cp');
        foreach ($filesList as $srcFile) {
            $resultMp3 = "$path/" . basename($srcFile);
            $baseName = Util::trimExtensionForFile(basename($resultMp3));

            // Copy the file to the specified path
            Processes::mwExec("$cp $srcFile $resultMp3");

            // Verify copy succeeded before proceeding
            if (!file_exists($resultMp3)) {
                SystemMessages::sysLogMsg(
                    static::class,
                    "Failed to copy MOH file $srcFile to $resultMp3"
                );
                continue;
            }

            // Convert the MP3 file to all Asterisk formats
            $result = SoundFilesConf::convertAudioFile(
                $resultMp3,
                ['wav', 'ulaw', 'alaw', 'gsm', 'g722', 'sln'],
                [
                    'normalize' => false,
                    'use_cache' => true,
                    'force' => false,
                    'output_dir' => $path,
                    'base_name' => $baseName,
                ]
            );

            if (!$result['success']) {
                SystemMessages::sysLogMsg(
                    static::class,
                    "Failed to convert MOH file $resultMp3: " . ($result['error'] ?? 'Unknown error')
                );
            } else {
                // Check if at least WAV was created
                $resultWav = "$path/$baseName.wav";
                if (!file_exists($resultWav)) {
                    SystemMessages::sysLogMsg(static::class, "Failed to create WAV file $resultWav");
                }
            }

            // Add the MP3 file to the database
            $this->checkAddFileToDB($resultMp3);
        }
    }

    /**
     * Removes MOH database records where the mp3 file no longer exists on disk.
     */
    protected function cleanOrphanedMohRecords(): void
    {
        $mohRecords = SoundFiles::find([
            'conditions' => 'category = :category:',
            'bind' => ['category' => SoundFiles::CATEGORY_MOH],
        ]);
        foreach ($mohRecords as $record) {
            if (empty($record->path) || !file_exists($record->path)) {
                SystemMessages::sysLogMsg(
                    static::class,
                    "Removing orphaned MOH record: {$record->name} (path: {$record->path})"
                );
                $record->delete();
            }
        }
    }

    /**
     * Check and add file to the database if the file exists on disk.
     *
     * @param string $resultMp3 The path of the mp3 file.
     */
    protected function checkAddFileToDB(string $resultMp3): void
    {
        if (!file_exists($resultMp3)) {
            return;
        }
        /** @var SoundFiles|null $sf */
        $sf = SoundFiles::findFirst("path='$resultMp3'");
        if ($sf === null) {
            $sf           = new SoundFiles();
            $sf->category = SoundFiles::CATEGORY_MOH;
            $sf->name     = basename($resultMp3);
            $sf->path     = $resultMp3;
            if ( ! $sf->save()) {
                SystemMessages::sysLogMsg(static::class, "Error save SoundFiles record $sf->name...");
            }
        }
    }

    /**
     * Restores default MOH files from the system default location.
     * Cleans the MOH directory first, then copies and converts default files.
     * Creates database records for restored files.
     */
    public static function restoreDefaultMoh(): void
    {
        $mohPath = Directories::getDir(Directories::AST_MOH_DIR);
        Util::mwMkdir($mohPath);

        // Clean any remaining files in MOH directory (converted formats, leftovers)
        $rm = Util::which('rm');
        Processes::mwExec("$rm -rf " . escapeshellarg($mohPath) . "/*");

        // Restore defaults from /offload/asterisk/sounds/moh/
        $conf = new self();
        $conf->checkMohFiles();
    }

    /**
     * Reloads the Asterisk music on hold module.
     */
    public static function reload(): void
    {
        $conf = new self();
        $conf->generateConfig();
        $asterisk = Util::which('asterisk');
        Processes::mwExec("$asterisk -rx 'moh reload'");
    }
}