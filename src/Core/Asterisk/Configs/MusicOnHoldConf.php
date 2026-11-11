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
     * Marker in AST_MOH_DIR: the shipped default tracks were installed once.
     * While it exists an empty MOH directory is the administrator's choice and
     * defaults are not copied back (the [default] class then plays the read-only
     * shipped tracks, see getDefaultClassDirectory()). It lives next to the tracks (not in
     * PbxSettings) so a replaced or recreated storage gets the defaults again.
     * Asterisk skips dot-files when scanning the files-mode directory.
     */
    public const string DEFAULTS_MARKER = '.defaults-installed';

    /**
     * Glob of the MOH tracks registered in SoundFiles (relative to the MOH directory).
     * mp3 for the shipped defaults and legacy uploads, webm for current uploads.
     */
    private const string TRACK_MASK = '/*.{mp3,webm}';

    /**
     * Formats every MOH track is converted to. ulaw/alaw/g722 match the call codec and are
     * streamed without transcoding; wav/sln cover slin channels.
     */
    private const array TRACK_FORMATS = ['wav', 'ulaw', 'alaw', 'gsm', 'g722', 'sln'];

    /**
     * Subdirectory of AST_MOH_DIR with the shipped tracks converted for the [default] class
     * fallback. A dot-name keeps it out of the files-mode scan of AST_MOH_DIR, out of
     * TRACK_MASK and out of restoreDefaultMoh()'s cleanup; it is not shown in the UI.
     */
    public const string FALLBACK_DIR = '.defaults';

    /**
     * Generates the configuration for musiconhold.conf.
     */
    protected function generateConfigProtected(): void
    {
        // Sync the DB with the disk before building the playlist classes,
        // otherwise freshly installed defaults appear only on the next regeneration.
        $this->checkMohFiles();

        $defaultClassDir = $this->getDefaultClassDirectory($this->getMohDir());
        $conf    = "[default]\n" .
            "mode=files\n" .
            "directory=$defaultClassDir\n\n";

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
    }

    /**
     * Checks the MOH files in the specified path and adds them to the database if they exist.
     * Removes orphaned DB records where the file no longer exists on disk.
     * Installs the shipped default tracks once, when the directory is empty and
     * DEFAULTS_MARKER is absent.
     */
    protected function checkMohFiles(): void
    {
        $path  = $this->getMohDir();
        $marker = "$path/" . self::DEFAULTS_MARKER;
        // Discovery glob includes webm because ConvertAudioFileAction now produces a WebM/Opus
        // preview file as the canonical SoundFiles.path value (mp3 was dropped from the upload
        // pipeline). Both extensions need to be re-discoverable after a DB restore/reset, or
        // user-uploaded MOH tracks would silently disappear from the UI on rescan.
        // The shipped default MOH files (under sounds-base/moh/) remain mp3.
        $userMask = self::TRACK_MASK;

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

            // Installs that already have tracks (upgrade, own uploads) count as initialised.
            $this->markDefaultsInstalled($marker);
            return;
        }

        // Empty directory after defaults were installed once: the administrator removed them.
        if (file_exists($marker)) {
            return;
        }

        $this->installDefaultMohFiles($path);
        if (!empty(glob("$path$userMask", GLOB_BRACE))) {
            $this->markDefaultsInstalled($marker);
        }
    }

    /**
     * Returns the directory for the [default] class.
     *
     * Asterisk drops a files-mode class whose directory holds no playable files. Without
     * a "default" class MusicOnHold() fails and hangs up the channel, while queues, hold and
     * classes that fall back to "default" (deleted moh-N) leave the caller in silence. When
     * the administrator removed every track, play the shipped tracks converted into
     * FALLBACK_DIR; the read-only mp3 originals are the last resort if conversion failed.
     *
     * @param string $mohPath MOH directory (AST_MOH_DIR).
     */
    protected function getDefaultClassDirectory(string $mohPath): string
    {
        if (!empty(glob($mohPath . self::TRACK_MASK, GLOB_BRACE))) {
            return $mohPath;
        }
        $fallbackDir = "$mohPath/" . self::FALLBACK_DIR;
        if ($this->buildFallbackTracks($fallbackDir)) {
            return $fallbackDir;
        }
        return SoundFilesConf::SOURCE_SOUNDS_DIR . '/moh';
    }

    /**
     * Converts the shipped default tracks into $fallbackDir (no mp3 copy, so Asterisk always
     * streams a raw codec file) and drops files of tracks no longer shipped. Conversion is
     * cached by .sound-meta, so only the first call after the tracks were removed converts.
     *
     * @param string $fallbackDir Target directory.
     * @return bool True when every shipped track is available as wav.
     */
    protected function buildFallbackTracks(string $fallbackDir): bool
    {
        $sources = glob(SoundFilesConf::SOURCE_SOUNDS_DIR . '/moh/*.mp3') ?: [];
        if (empty($sources) || !Util::mwMkdir($fallbackDir)) {
            return false;
        }

        $shipped = array_map(
            static fn(string $source): string => Util::trimExtensionForFile(basename($source)),
            $sources
        );
        foreach (glob("$fallbackDir/{,.}*", GLOB_BRACE) ?: [] as $file) {
            $name = basename($file);
            if (!is_file($file)) {
                continue;
            }
            $baseName = str_ends_with($name, '.sound-meta')
                ? substr($name, 1, -strlen('.sound-meta'))
                : pathinfo($name, PATHINFO_FILENAME);
            if (!in_array($baseName, $shipped, true)) {
                unlink($file);
            }
        }

        $complete = true;
        foreach ($sources as $source) {
            $baseName = Util::trimExtensionForFile(basename($source));
            $this->convertTrack($source, $fallbackDir, $baseName);
            $complete = $complete && file_exists("$fallbackDir/$baseName.wav");
        }
        return $complete;
    }

    /**
     * Converts one MOH track to TRACK_FORMATS.
     *
     * @param string $source Source audio file.
     * @param string $outputDir Directory for the converted files.
     * @param string $baseName Output filename without extension.
     */
    protected function convertTrack(string $source, string $outputDir, string $baseName): void
    {
        $result = SoundFilesConf::convertAudioFile(
            $source,
            self::TRACK_FORMATS,
            [
                'normalize' => false,
                'use_cache' => true,
                'force' => false,
                'output_dir' => $outputDir,
                'base_name' => $baseName,
            ]
        );

        if (!$result['success']) {
            SystemMessages::sysLogMsg(
                static::class,
                "Failed to convert MOH file $source: " . ($result['error'] ?? 'Unknown error')
            );
        } elseif (!file_exists("$outputDir/$baseName.wav")) {
            SystemMessages::sysLogMsg(static::class, "Failed to create WAV file $outputDir/$baseName.wav");
        }
    }

    /**
     * Returns the MOH directory that holds the [default] class tracks.
     */
    protected function getMohDir(): string
    {
        return Directories::getDir(Directories::AST_MOH_DIR);
    }

    /**
     * Creates DEFAULTS_MARKER so that an emptied MOH directory stays empty.
     *
     * @param string $marker Full path of the marker file.
     */
    protected function markDefaultsInstalled(string $marker): void
    {
        if (file_exists($marker)) {
            return;
        }
        if (file_put_contents($marker, date('Y-m-d H:i:s') . PHP_EOL) === false) {
            SystemMessages::sysLogMsg(static::class, "Failed to create MOH marker $marker");
        }
    }

    /**
     * Copies the shipped default tracks (mp3) from the read-only sounds-base,
     * converts them to the Asterisk formats and registers them in the DB.
     * Reads sounds-base directly: the writable sounds tree behind
     * /offload/asterisk/sounds is filled by WorkerSoundFilesInit only after boot.
     *
     * @param string $path MOH directory (AST_MOH_DIR).
     */
    protected function installDefaultMohFiles(string $path): void
    {
        SystemMessages::sysLogMsg(static::class, 'Attempt to restore MOH from default...');

        $filesList = glob(SoundFilesConf::SOURCE_SOUNDS_DIR . '/moh/*.mp3') ?: [];
        if (empty($filesList)) {
            SystemMessages::sysLogMsg(
                static::class,
                'No default MOH files found in ' . SoundFilesConf::SOURCE_SOUNDS_DIR . '/moh'
            );
            return;
        }
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
            $this->convertTrack($resultMp3, $path, $baseName);

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

        // The glob above skips dot-files: drop the marker so defaults are installed again
        $marker = "$mohPath/" . self::DEFAULTS_MARKER;
        if (file_exists($marker)) {
            unlink($marker);
        }

        // Restore defaults from sounds-base/moh/
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