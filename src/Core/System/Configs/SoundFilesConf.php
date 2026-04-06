<?php

declare(strict_types=1);

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Common\Providers\LanguageProvider;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\PbxExtensionUtils;
use Phalcon\Di\Di;
use Redis;

/**
 * Class SoundFilesConf
 *
 * Manages Asterisk sound files initialization and module sound integration
 *
 * @package MikoPBX\Core\System\Configs
 */
class SoundFilesConf extends SystemConfigClass
{
    public const string PROC_NAME = 'soundfiles';

    /**
     * Source directory for system sound files (read-only)
     */
    private const string SOURCE_SOUNDS_DIR = '/offload/asterisk/sounds';

    /**
     * Redis key prefix for sound conversion cache
     * Used by WorkerSoundFilesInit to track conversion status
     */
    public const string REDIS_SOUND_CONVERSION_PREFIX = 'sound_conversion:';

    /**
     * Redis key for system sounds conversion status
     */
    public const string REDIS_SYSTEM_SOUNDS_KEY = self::REDIS_SOUND_CONVERSION_PREFIX . 'system';

    /**
     * Redis key prefix for module sounds conversion status
     * Full key format: sound_conversion:module:{moduleId}
     */
    public const string REDIS_MODULE_SOUNDS_PREFIX = self::REDIS_SOUND_CONVERSION_PREFIX . 'module:';

    /**
     * Start the service - initialize writable sounds directory with all available languages
     *
     * @return bool True if successful, false otherwise.
     */
    public function start(): bool
    {
        // Get target directory path
        $targetSoundsDir = Directories::getDir(Directories::AST_SOUNDS_DIR);

        // Check if sounds directory is already initialized
        if ($this->isSoundsDirectoryInitialized($targetSoundsDir)) {
            SystemMessages::sysLogMsg(__METHOD__, 'Sound files already initialized: ' . $targetSoundsDir, LOG_DEBUG);

            // Reinstall module sounds (in case container was restarted)
            $this->reinstallEnabledModuleSounds();

            return true;
        }

        // Create target directory if it doesn't exist
        Util::mwMkdir($targetSoundsDir);

        // Get all languages from source directory
        $sourceLanguages = $this->getSourceLanguages();

        if (empty($sourceLanguages)) {
            SystemMessages::sysLogMsg(__METHOD__, 'No languages found in source directory', LOG_WARNING);
            return false;
        }

        SystemMessages::sysLogMsg(
            __METHOD__,
            'Found ' . count($sourceLanguages) . ' languages in source directory: ' . implode(', ', $sourceLanguages),
            LOG_INFO
        );

        // Copy all language directories (without sync conversion)
        $success = true;
        foreach ($sourceLanguages as $lang) {
            if (!$this->copyLanguageDirectoryOnly($lang, $targetSoundsDir)) {
                $success = false;
            }
        }

        if ($success) {
            SystemMessages::sysLogMsg(__METHOD__, 'Sound files initialized successfully to: ' . $targetSoundsDir, LOG_INFO);


            // Reinstall module sounds after base languages initialization
            $this->reinstallEnabledModuleSounds();
        } else {
            SystemMessages::sysLogMsg(__METHOD__, 'Some sound files failed to initialize', LOG_WARNING);
        }

        return $success;
    }

    /**
     * Check if sounds directory is already initialized
     *
     * @param string $targetDir Target sounds directory
     * @return bool True if initialized
     */
    private function isSoundsDirectoryInitialized(string $targetDir): bool
    {
        if (!is_dir($targetDir)) {
            return false;
        }

        // Check if directory has any language subdirectories
        $dirs = glob("$targetDir/*", GLOB_ONLYDIR);

        if (empty($dirs)) {
            return false;
        }

        // Check if at least one directory is a valid language directory with files
        foreach ($dirs as $dir) {
            $lang = basename($dir);
            // Only check directories that match language-country format (xx-xx)
            if (preg_match('/^[a-z]{2}-[a-z]{2}$/i', $lang)) {
                $files = scandir($dir);
                if (count($files) > 2) { // More than just . and ..
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get all available languages from source directory
     *
     * Scans the source sounds directory for language subdirectories matching
     * the language-country format (xx-xx). This allows automatic discovery
     * of all packaged languages without hardcoding the list.
     *
     * @return array List of language codes found in source directory
     */
    private function getSourceLanguages(): array
    {
        if (!is_dir(self::SOURCE_SOUNDS_DIR)) {
            SystemMessages::sysLogMsg(__METHOD__, 'Source sounds directory not found: ' . self::SOURCE_SOUNDS_DIR, LOG_WARNING);
            return [];
        }

        $languages = [];
        $dirs = glob(self::SOURCE_SOUNDS_DIR . '/*', GLOB_ONLYDIR);

        foreach ($dirs as $dir) {
            $lang = basename($dir);
            // Only include directories that match language-country format (xx-xx)
            if (preg_match('/^[a-z]{2}-[a-z]{2}$/i', $lang)) {
                $languages[] = $lang;
            }
        }

        sort($languages);
        return $languages;
    }

    /**
     * Copy language directory from source to target (without conversion)
     *
     * @param string $language Language code (e.g., 'en-en', 'ru-ru')
     * @param string $targetSoundsDir Target sounds directory
     * @return bool True if successful
     */
    private function copyLanguageDirectoryOnly(string $language, string $targetSoundsDir): bool
    {
        $sourceLangDir = self::SOURCE_SOUNDS_DIR . '/' . $language;
        $targetLangDir = $targetSoundsDir . '/' . $language;

        // Check if source exists
        if (!is_dir($sourceLangDir)) {
            SystemMessages::sysLogMsg(__METHOD__, "Source language directory not found: $sourceLangDir", LOG_WARNING);
            return false;
        }

        // Create target language directory
        Util::mwMkdir($targetLangDir);

        // Use cp command for efficient recursive copy
        $cpPath = Util::which('cp');
        $sourceDir = escapeshellarg($sourceLangDir);
        $targetDir = escapeshellarg($targetSoundsDir);

        $command = "$cpPath -r $sourceDir $targetDir";
        $exitCode = Processes::mwExec($command);

        if ($exitCode !== 0) {
            SystemMessages::sysLogMsg(__METHOD__, "Failed to copy language '$language'. Exit code: $exitCode", LOG_WARNING);
            return false;
        }

        SystemMessages::sysLogMsg(__METHOD__, "Language '$language' copied successfully", LOG_DEBUG);

        return true;
    }

    /**
     * Reinstall sound files for all enabled modules
     *
     * This method is called during system startup to restore module sound files
     * after container restart when /mountpoint is cleared.
     *
     * @return void
     */
    private function reinstallEnabledModuleSounds(): void
    {
        // Query all enabled modules from database
        $di = \Phalcon\Di\Di::getDefault();
        if ($di === null) {
            SystemMessages::sysLogMsg(__METHOD__, 'DI container not available, skipping module sounds reinstallation', LOG_WARNING);
            return;
        }

        // Check if database is available and accessible
        try {
            $dbService = $di->get('db');
            if ($dbService === null) {
                SystemMessages::sysLogMsg(__METHOD__, 'Database service not available, skipping module sounds reinstallation', LOG_WARNING);
                return;
            }
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(__METHOD__, "Database service unavailable: " . $e->getMessage(), LOG_WARNING);
            return;
        }

        $parameters = [
            'conditions' => 'disabled=0',
        ];

        try {
            $modules = \MikoPBX\Common\Models\PbxExtensionModules::find($parameters)->toArray();
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(__METHOD__, "Failed to query enabled modules: " . $e->getMessage(), LOG_WARNING);
            return;
        }

        if (empty($modules)) {
            SystemMessages::sysLogMsg(__METHOD__, 'No enabled modules found, skipping sounds reinstallation', LOG_DEBUG);
            return;
        }

        SystemMessages::sysLogMsg(__METHOD__, 'Reinstalling sound files for ' . count($modules) . ' enabled modules', LOG_INFO);

        foreach ($modules as $module) {
            $moduleUniqueID = $module['uniqid'];

            SystemMessages::sysLogMsg(__METHOD__, "Processing module: $moduleUniqueID", LOG_DEBUG);

            // Check if module has Sounds directory
            $moduleDir = PbxExtensionUtils::getModuleDir($moduleUniqueID);
            SystemMessages::sysLogMsg(__METHOD__, "Module directory: $moduleDir", LOG_DEBUG);

            $moduleSoundsDir = "$moduleDir/Sounds";

            if (!is_dir($moduleSoundsDir)) {
                SystemMessages::sysLogMsg(__METHOD__, "Module $moduleUniqueID has no Sounds directory, skipping", LOG_DEBUG);
                continue; // Module doesn't have sounds
            }

            SystemMessages::sysLogMsg(__METHOD__, "Module $moduleUniqueID has Sounds directory, installing...", LOG_DEBUG);

            // Reinstall sound files without conversion (worker will convert everything)
            try {
                self::installModuleSounds($moduleUniqueID);
                SystemMessages::sysLogMsg(__METHOD__, "Module $moduleUniqueID sounds installation completed", LOG_DEBUG);
            } catch (\Throwable $e) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "Failed to reinstall sounds for module $moduleUniqueID: " . $e->getMessage(),
                    LOG_WARNING
                );
            }
        }

        SystemMessages::sysLogMsg(__METHOD__, 'Module sounds reinstallation completed', LOG_INFO);
    }

    /**
     * Install sound files from module to system sounds directory
     *
     * Supports two module types:
     * 1. Language Pack modules: Files copied WITHOUT prefix (replace/extend system sounds)
     * 2. Feature modules: Files copied WITH prefix (modulename-sound.wav)
     *
     * Structure: ModuleName/Sounds/{lang}/*.wav
     *
     * Note: Only copies files without format conversion. WorkerSoundFilesInit handles conversion.
     *
     * @param string $moduleUniqueID Module unique identifier
     * @return bool True if successful
     */
    public static function installModuleSounds(string $moduleUniqueID): bool
    {
        $moduleDir = PbxExtensionUtils::getModuleDir($moduleUniqueID);
        $moduleSoundsDir = "$moduleDir/Sounds";
        $systemSoundsDir = Directories::getDir(Directories::AST_SOUNDS_DIR);

        if (!is_dir($moduleSoundsDir)) {
            SystemMessages::sysLogMsg(__METHOD__, "Module $moduleUniqueID has no Sounds directory", LOG_DEBUG);
            return true; // Not an error - module just doesn't have sounds
        }

        // Get all language directories in module
        $langDirs = glob("$moduleSoundsDir/*", GLOB_ONLYDIR);
        if (empty($langDirs)) {
            SystemMessages::sysLogMsg(__METHOD__, "Module $moduleUniqueID sounds directory is empty", LOG_DEBUG);
            return true;
        }

        // Determine module type
        $isLanguagePack = PbxExtensionUtils::isLanguagePackModule($moduleUniqueID);
        $moduleType = $isLanguagePack ? 'Language Pack' : 'Feature';

        SystemMessages::sysLogMsg(__METHOD__, "Installing $moduleType module sounds: $moduleUniqueID", LOG_INFO);

        $success = true;
        $stats = [
            'total_files' => 0,
            'copied_files' => 0,
            'failed_files' => 0,
        ];

        foreach ($langDirs as $langDir) {
            $lang = basename($langDir);
            $targetLangDir = "$systemSoundsDir/$lang";

            // Create language directory if it doesn't exist
            if (!is_dir($targetLangDir)) {
                Util::mwMkdir($targetLangDir);
            }

            // Copy sound files (with or without prefix based on module type)
            $soundFiles = glob("$langDir/*.{wav,ulaw,alaw,gsm,g722,sln,mp3}", GLOB_BRACE);
            foreach ($soundFiles as $soundFile) {
                $stats['total_files']++;
                $fileName = basename($soundFile);

                // Language Pack: no prefix, Feature module: with prefix
                $destFileName = $isLanguagePack
                    ? $fileName
                    : strtolower($moduleUniqueID) . '-' . $fileName;

                $destFile = "$targetLangDir/$destFileName";

                if (!copy($soundFile, $destFile)) {
                    SystemMessages::sysLogMsg(__METHOD__, "Failed to copy sound file: $soundFile", LOG_WARNING);
                    $stats['failed_files']++;
                    $success = false;
                } else {
                    $stats['copied_files']++;
                }
            }

            // Copy subdirectories (e.g., digits/, letters/)
            $subDirs = glob("$langDir/*", GLOB_ONLYDIR);
            foreach ($subDirs as $subDir) {
                $subDirName = basename($subDir);
                $targetSubDir = "$targetLangDir/$subDirName";

                if (!is_dir($targetSubDir)) {
                    Util::mwMkdir($targetSubDir);
                }

                $subSoundFiles = glob("$subDir/*.{wav,ulaw,alaw,gsm,g722,sln,mp3}", GLOB_BRACE);
                foreach ($subSoundFiles as $soundFile) {
                    $stats['total_files']++;
                    $fileName = basename($soundFile);

                    // Language Pack: no prefix, Feature module: with prefix
                    $destFileName = $isLanguagePack
                        ? $fileName
                        : strtolower($moduleUniqueID) . '-' . $fileName;

                    $destFile = "$targetSubDir/$destFileName";

                    if (!copy($soundFile, $destFile)) {
                        SystemMessages::sysLogMsg(__METHOD__, "Failed to copy sound file: $soundFile", LOG_WARNING);
                        $stats['failed_files']++;
                        $success = false;
                    } else {
                        $stats['copied_files']++;
                    }
                }
            }
        }

        // Invalidate conversion cache to trigger WorkerSoundFilesInit
        if ($stats['copied_files'] > 0) {
            self::invalidateModuleSoundCache($moduleUniqueID);
        }

        // Log installation summary
        $summaryParts = [];
        $summaryParts[] = "{$stats['copied_files']} files copied";
        if ($stats['failed_files'] > 0) {
            $summaryParts[] = "{$stats['failed_files']} failed";
        }

        $summary = implode(', ', $summaryParts);
        $logLevel = $success ? LOG_INFO : LOG_WARNING;
        $status = $success ? 'completed' : 'completed with errors';

        SystemMessages::sysLogMsg(
            __METHOD__,
            "Module $moduleUniqueID ($moduleType) installation $status: $summary",
            $logLevel
        );

        return $success;
    }

    /**
     * Invalidate sound conversion cache for a module
     *
     * Called after installing module sounds to trigger WorkerSoundFilesInit
     * to convert new sound files to all required formats.
     *
     * @param string $moduleUniqueID Module unique identifier
     */
    public static function invalidateModuleSoundCache(string $moduleUniqueID): void
    {
        try {
            $di = Di::getDefault();
            if ($di === null) {
                return;
            }

            /** @var Redis $redis */
            $redis = $di->getShared('redis');
            $cacheKey = self::REDIS_MODULE_SOUNDS_PREFIX . $moduleUniqueID;
            $redis->del($cacheKey);

            SystemMessages::sysLogMsg(
                __METHOD__,
                "Invalidated sound cache for module $moduleUniqueID",
                LOG_DEBUG
            );
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Failed to invalidate sound cache: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }

    /**
     * Convert audio file to specified formats with optional normalization
     *
     * This is the unified method for audio conversion used by both REST API and Worker.
     * Supports multiple target formats, audio normalization, and smart caching.
     *
     * @param string $sourceFile Source audio file path
     * @param array $targetFormats Target formats to generate: ['wav', 'mp3', 'ulaw', 'alaw', 'gsm', 'g722', 'sln']
     * @param array $options Conversion options:
     *   - 'normalize' (bool): Apply loudnorm filter for consistent volume (default: false)
     *   - 'force' (bool): Skip cache, force reconversion (default: false)
     *   - 'use_cache' (bool): Use .sound-meta caching (default: true)
     *   - 'output_dir' (string): Output directory (default: source file directory)
     *   - 'base_name' (string): Output filename without extension (default: source filename)
     *   - 'sample_rate' (int): Override sample rate for WAV (default: 8000)
     *   - 'bitrate' (string): MP3 bitrate (default: '16k')
     * @return array Results with conversion status per format:
     *   [
     *     'success' => bool,
     *     'formats' => [
     *       'wav' => ['path' => '/path/to/file.wav', 'status' => 'converted|skipped|failed', 'error' => '...'],
     *       'mp3' => ['path' => '/path/to/file.mp3', 'status' => 'converted|skipped|failed', 'error' => '...'],
     *     ],
     *     'stats' => ['converted' => 2, 'skipped' => 1, 'failed' => 0]
     *   ]
     */
    public static function convertAudioFile(string $sourceFile, array $targetFormats, array $options = []): array
    {
        // Initialize result structure
        $result = [
            'success' => true,
            'formats' => [],
            'stats' => ['converted' => 0, 'skipped' => 0, 'failed' => 0],
        ];

        // Parse options with defaults
        $normalize = $options['normalize'] ?? false;
        $forceReconvert = $options['force'] ?? false;
        $useCache = $options['use_cache'] ?? true;
        $sampleRate = $options['sample_rate'] ?? 8000;
        $mp3Bitrate = $options['bitrate'] ?? '16k';

        // Get output directory and base name
        $pathInfo = pathinfo($sourceFile);
        $outputDir = $options['output_dir'] ?? $pathInfo['dirname'];
        $baseName = $options['base_name'] ?? $pathInfo['filename'];
        $sourceExtension = strtolower($pathInfo['extension'] ?? '');

        // Get tool paths
        $ffmpegPath = Util::which('ffmpeg');
        $ffprobePath = Util::which('ffprobe');

        if (empty($ffmpegPath)) {
            $result['success'] = false;
            $result['error'] = 'ffmpeg not found';
            return $result;
        }

        // Check if source file exists
        if (!file_exists($sourceFile)) {
            $result['success'] = false;
            $result['error'] = "Source file not found: $sourceFile";
            return $result;
        }

        // Validate source file with ffprobe
        if (!empty($ffprobePath)) {
            $sourceEscaped = escapeshellarg($sourceFile);
            $probeCommand = "$ffprobePath -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $sourceEscaped 2>&1";
            exec($probeCommand, $probeOutput, $probeExitCode);

            if ($probeExitCode !== 0 || empty($probeOutput)) {
                $result['success'] = false;
                $result['error'] = "Source file is corrupted or unreadable";
                SystemMessages::sysLogMsg(__METHOD__, "Corrupted source file: $sourceFile", LOG_WARNING);
                return $result;
            }
        }

        // Detect source codec for special handling (MPEG formats)
        $sourceCodec = '';
        if (!empty($ffprobePath)) {
            $sourceEscaped = escapeshellarg($sourceFile);
            $codecCommand = "$ffprobePath -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 $sourceEscaped 2>&1";
            exec($codecCommand, $codecOutput, $codecExitCode);
            if ($codecExitCode === 0 && !empty($codecOutput)) {
                $sourceCodec = trim($codecOutput[0] ?? '');
            }
        }

        // Check metadata for smart caching
        $metadataFile = "$outputDir/.$baseName.sound-meta";
        $sourceHash = md5_file($sourceFile);
        $needsConversion = $forceReconvert || !$useCache;

        if ($useCache && !$forceReconvert && file_exists($metadataFile)) {
            $metadata = @json_decode(file_get_contents($metadataFile), true);
            if ($metadata && isset($metadata['source_hash']) && $metadata['source_hash'] === $sourceHash) {
                // Check if all target formats exist
                $allFormatsExist = true;
                foreach ($targetFormats as $format) {
                    $targetFile = "$outputDir/$baseName.$format";
                    if (!file_exists($targetFile)) {
                        $allFormatsExist = false;
                        break;
                    }
                }

                if ($allFormatsExist) {
                    // All formats exist and hash matches - return cached results
                    foreach ($targetFormats as $format) {
                        $result['formats'][$format] = [
                            'path' => "$outputDir/$baseName.$format",
                            'status' => 'skipped',
                        ];
                        $result['stats']['skipped']++;
                    }
                    return $result;
                }
            }
            $needsConversion = true;
        }

        // Define format conversion parameters
        $formatSpecs = [
            'wav' => [
                'options' => "-ar $sampleRate -ac 1 -acodec pcm_s16le -f wav",
                'container' => 'wav',
            ],
            'mp3' => [
                'options' => "-codec:a libmp3lame -b:a $mp3Bitrate",
                'container' => 'mp3',
            ],
            'ulaw' => [
                'options' => '-ar 8000 -ac 1 -acodec pcm_mulaw -f wav',
                'container' => 'wav',
            ],
            'alaw' => [
                'options' => '-ar 8000 -ac 1 -acodec pcm_alaw -f wav',
                'container' => 'wav',
            ],
            'gsm' => [
                'options' => '-ar 8000 -ac 1 -acodec libgsm -f gsm',
                'container' => 'gsm',
            ],
            'g722' => [
                'options' => '-ar 16000 -ac 1 -acodec adpcm_g722 -f wav',
                'container' => 'wav',
            ],
            'sln' => [
                'options' => '-ar 8000 -ac 1 -acodec pcm_s16le -f wav',
                'container' => 'wav',
            ],
        ];

        // Prepare source file for conversion
        $conversionSource = $sourceFile;
        $tempFiles = [];

        // Handle MPEG formats: convert to WAV first
        if (in_array($sourceCodec, ['mp3', 'mp2', 'mp1'], true) && in_array('wav', $targetFormats)) {
            $tempWavFile = "$outputDir/$baseName.tmp.wav";
            $tempFiles[] = $tempWavFile;

            $sourceEscaped = escapeshellarg($sourceFile);
            $tempEscaped = escapeshellarg($tempWavFile);
            $convertCmd = "$ffmpegPath -i $sourceEscaped -y $tempEscaped 2>&1";
            $exitCode = Processes::mwExec($convertCmd);

            if ($exitCode === 0) {
                $conversionSource = $tempWavFile;
            } else {
                SystemMessages::sysLogMsg(__METHOD__, "Failed to convert MPEG to WAV: $sourceFile", LOG_WARNING);
            }
        }

        // Apply normalization if requested
        $normalizedSource = $conversionSource;
        if ($normalize) {
            $tempNormalizedFile = "$outputDir/$baseName.normalized.wav";
            $tempFiles[] = $tempNormalizedFile;

            $sourceEscaped = escapeshellarg($conversionSource);
            $normalizedEscaped = escapeshellarg($tempNormalizedFile);
            $normalizeCmd = "$ffmpegPath -i $sourceEscaped -af 'loudnorm=I=-16:TP=-1.5:LRA=11' -ac 1 -ar $sampleRate -acodec pcm_s16le -y $normalizedEscaped 2>&1";
            $exitCode = Processes::mwExec($normalizeCmd);

            if ($exitCode === 0) {
                $normalizedSource = $tempNormalizedFile;
            } else {
                SystemMessages::sysLogMsg(__METHOD__, "Failed to normalize audio: $conversionSource", LOG_WARNING);
            }
        }

        // Convert to all target formats
        $source = escapeshellarg($normalizedSource);
        foreach ($targetFormats as $format) {
            // Skip unsupported formats
            if (!isset($formatSpecs[$format])) {
                $result['formats'][$format] = [
                    'status' => 'failed',
                    'error' => "Unsupported format: $format",
                ];
                $result['stats']['failed']++;
                $result['success'] = false;
                continue;
            }

            $spec = $formatSpecs[$format];
            $targetFile = "$outputDir/$baseName.$format";
            $dest = escapeshellarg($targetFile);

            // Skip if target file already exists (unless force reconvert)
            if (!$forceReconvert && file_exists($targetFile)) {
                $result['formats'][$format] = [
                    'path' => $targetFile,
                    'status' => 'skipped',
                ];
                $result['stats']['skipped']++;
                continue;
            }

            // Build and execute ffmpeg command
            $command = "$ffmpegPath -i $source {$spec['options']} -y $dest 2>&1";
            $exitCode = Processes::mwExec($command, $output);

            if ($exitCode === 0) {
                $result['formats'][$format] = [
                    'path' => $targetFile,
                    'status' => 'converted',
                ];
                $result['stats']['converted']++;
            } else {
                $outputText = implode("\n", $output);
                $result['formats'][$format] = [
                    'status' => 'failed',
                    'error' => "Exit code: $exitCode. Output: $outputText",
                ];
                $result['stats']['failed']++;
                $result['success'] = false;

                // Check if codec is not supported (not critical for some formats)
                if (strpos($outputText, "Unknown encoder") === false) {
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        "Failed to convert to $format format. Exit code: $exitCode",
                        LOG_WARNING
                    );
                }
            }
        }

        // Clean up temporary files
        foreach ($tempFiles as $tempFile) {
            if (file_exists($tempFile)) {
                @unlink($tempFile);
            }
        }

        // Save metadata file if conversion was successful and cache is enabled
        if ($result['success'] && $useCache) {
            $metadata = [
                'source_file' => basename($sourceFile),
                'source_format' => $sourceExtension,
                'source_hash' => $sourceHash,
                'target_formats' => $targetFormats,
                'options' => [
                    'normalize' => $normalize,
                    'sample_rate' => $sampleRate,
                    'mp3_bitrate' => $mp3Bitrate,
                ],
                'conversion_date' => date('Y-m-d H:i:s'),
                'ffmpeg_version' => trim(shell_exec("$ffmpegPath -version 2>&1 | head -1")),
            ];

            $metadataJson = json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            if (file_put_contents($metadataFile, $metadataJson) === false) {
                SystemMessages::sysLogMsg(__METHOD__, "Failed to save metadata file: $metadataFile", LOG_WARNING);
            }
        }

        return $result;
    }

    /**
     * Convert all sound files in directory recursively
     *
     * This method performs synchronous conversion of all sound files
     * to required formats (ulaw, alaw, gsm, g722, sln).
     *
     * @param string $soundsDir Base sounds directory path
     * @return void
     */
    public static function convertAllSoundFiles(string $soundsDir): void
    {
        if (!is_dir($soundsDir)) {
            SystemMessages::sysLogMsg(__METHOD__, "Sounds directory not found: $soundsDir", LOG_WARNING);
            return;
        }

        $convertibleFormats = '{wav,mp3,gsm,ulaw,alaw,g722,sln}';
        $stats = ['converted' => 0, 'skipped' => 0, 'failed' => 0];

        // Process all language directories
        $langDirs = glob("$soundsDir/*", GLOB_ONLYDIR);
        if (empty($langDirs)) {
            SystemMessages::sysLogMsg(__METHOD__, "No language directories found in: $soundsDir", LOG_DEBUG);
            return;
        }

        foreach ($langDirs as $langDir) {
            // Root directory
            $soundFiles = glob("$langDir/*.$convertibleFormats", GLOB_BRACE);
            foreach ($soundFiles as $file) {
                $convStats = ['converted' => 0, 'skipped' => 0];
                $result = self::convertSoundFileFormats($file, false, $convStats);
                if ($result === false) {
                    $stats['failed']++;
                } elseif ($result === 'skipped') {
                    $stats['skipped'] += $convStats['skipped'];
                } else {
                    $stats['converted'] += $convStats['converted'];
                }
            }

            // Subdirectories
            $subDirs = glob("$langDir/*", GLOB_ONLYDIR);
            foreach ($subDirs as $subDir) {
                $subSoundFiles = glob("$subDir/*.$convertibleFormats", GLOB_BRACE);
                foreach ($subSoundFiles as $file) {
                    $convStats = ['converted' => 0, 'skipped' => 0];
                    $result = self::convertSoundFileFormats($file, false, $convStats);
                    if ($result === false) {
                        $stats['failed']++;
                    } elseif ($result === 'skipped') {
                        $stats['skipped'] += $convStats['skipped'];
                    } else {
                        $stats['converted'] += $convStats['converted'];
                    }
                }

                // Nested subdirectories
                $nestedDirs = glob("$subDir/*", GLOB_ONLYDIR);
                foreach ($nestedDirs as $nestedDir) {
                    $nestedSoundFiles = glob("$nestedDir/*.$convertibleFormats", GLOB_BRACE);
                    foreach ($nestedSoundFiles as $file) {
                        $convStats = ['converted' => 0, 'skipped' => 0];
                        $result = self::convertSoundFileFormats($file, false, $convStats);
                        if ($result === false) {
                            $stats['failed']++;
                        } elseif ($result === 'skipped') {
                            $stats['skipped'] += $convStats['skipped'];
                        } else {
                            $stats['converted'] += $convStats['converted'];
                        }
                    }
                }
            }
        }

        // Log completion summary
        $summary = [];
        if ($stats['converted'] > 0) {
            $summary[] = "{$stats['converted']} formats converted";
        }
        if ($stats['skipped'] > 0) {
            $summary[] = "{$stats['skipped']} cached";
        }
        if ($stats['failed'] > 0) {
            $summary[] = "{$stats['failed']} failed";
        }

        SystemMessages::sysLogMsg(
            __METHOD__,
            'Sound file conversion completed: ' . implode(', ', $summary),
            LOG_INFO
        );
    }


    /**
     * Convert sound file to multiple formats using ffmpeg with smart caching
     *
     * Creates the following formats from source file:
     * - ulaw (G.711 μ-law in WAV container)
     * - alaw (G.711 A-law in WAV container)
     * - gsm (GSM 06.10 in raw GSM container)
     * - g722 (G.722 wideband in WAV container)
     * - sln (signed linear PCM in WAV container)
     *
     * Uses metadata files to track source file hash and skip conversion if file unchanged.
     * This allows efficient updates when sound files are replaced in new releases.
     *
     * @param string $sourceFile Source sound file path (wav, mp3, gsm, ulaw, alaw, g722, sln)
     * @param bool $forceReconvert Force reconversion even if metadata matches (default: false)
     * @param array|null $stats Output statistics: ['converted' => int, 'skipped' => int]
     * @return bool|string True if converted, 'skipped' if cached, false if failed
     */
    private static function convertSoundFileFormats(string $sourceFile, bool $forceReconvert = false, ?array &$stats = null): bool|string
    {
        // Initialize statistics
        if ($stats === null) {
            $stats = ['converted' => 0, 'skipped' => 0];
        }

        // Skip conversion if source is not a convertible format
        $pathInfo = pathinfo($sourceFile);
        $sourceExtension = strtolower($pathInfo['extension'] ?? '');
        $convertibleFormats = ['wav', 'mp3', 'ulaw', 'alaw', 'gsm', 'g722', 'sln'];
        if (!in_array($sourceExtension, $convertibleFormats, true)) {
            return 'skipped';
        }

        // Define target formats (all Asterisk formats except source format)
        $targetFormats = ['ulaw', 'alaw', 'gsm', 'g722', 'sln'];

        // Call unified converter
        $result = self::convertAudioFile($sourceFile, $targetFormats, [
            'force' => $forceReconvert,
            'use_cache' => true,
            'normalize' => false,
        ]);

        // Update statistics from result
        $stats['converted'] += $result['stats']['converted'];
        $stats['skipped'] += $result['stats']['skipped'];

        // Return legacy format for backward compatibility
        if (!$result['success']) {
            return false;
        }

        // If all were skipped, return 'skipped'
        if ($result['stats']['converted'] === 0 && $result['stats']['skipped'] > 0) {
            return 'skipped';
        }

        return true;
    }

    /**
     * Remove module sound files from system sounds directory
     *
     * Handles both module types:
     * 1. Language Pack: Removes entire language directory
     * 2. Feature module: Removes only prefixed files (modulename-*)
     *
     * For Feature modules, removes all format variants (wav, ulaw, alaw, gsm, g722, sln, mp3)
     *
     * @param string $moduleUniqueID Module unique identifier
     * @return bool True if successful
     */
    public static function removeModuleSounds(string $moduleUniqueID): bool
    {
        $systemSoundsDir = Directories::getDir(Directories::AST_SOUNDS_DIR);
        $isLanguagePack = PbxExtensionUtils::isLanguagePackModule($moduleUniqueID);
        $moduleType = $isLanguagePack ? 'Language Pack' : 'Feature';

        SystemMessages::sysLogMsg(__METHOD__, "Removing $moduleType module sounds: $moduleUniqueID", LOG_INFO);

        if ($isLanguagePack) {
            // Language Pack: Remove entire language directory
            $languageCode = PbxExtensionUtils::getLanguagePackCode($moduleUniqueID);

            if ($languageCode === null) {
                SystemMessages::sysLogMsg(__METHOD__, "Cannot determine language code for Language Pack: $moduleUniqueID", LOG_WARNING);
                return false;
            }

            $langDir = "$systemSoundsDir/$languageCode";

            if (!is_dir($langDir)) {
                SystemMessages::sysLogMsg(__METHOD__, "Language directory does not exist: $langDir", LOG_DEBUG);
                return true; // Not an error if directory doesn't exist
            }

            // Remove entire language directory
            $rmPath = Util::which('rm');
            $langDirEscaped = escapeshellarg($langDir);
            $command = "$rmPath -rf $langDirEscaped";
            $exitCode = Processes::mwExec($command);

            if ($exitCode !== 0) {
                SystemMessages::sysLogMsg(__METHOD__, "Failed to remove Language Pack $moduleUniqueID. Exit code: $exitCode", LOG_WARNING);
                return false;
            }

            SystemMessages::sysLogMsg(__METHOD__, "Language Pack $moduleUniqueID ($languageCode) directory removed successfully", LOG_INFO);

            // Try to restore original system sounds from /offload if they exist
            $sourceLanguageDir = self::SOURCE_SOUNDS_DIR . "/$languageCode";

            if (is_dir($sourceLanguageDir)) {
                SystemMessages::sysLogMsg(__METHOD__, "Restoring original system sounds from $sourceLanguageDir", LOG_INFO);

                $cpPath = Util::which('cp');
                $sourceDirEscaped = escapeshellarg($sourceLanguageDir);
                $targetDirEscaped = escapeshellarg($systemSoundsDir);
                $command = "$cpPath -r $sourceDirEscaped $targetDirEscaped";
                $exitCode = Processes::mwExec($command);

                if ($exitCode === 0) {
                    SystemMessages::sysLogMsg(__METHOD__, "Original system sounds for $languageCode restored successfully", LOG_INFO);

                    // Trigger sound file conversion for restored files
                    // Note: WorkerSoundFilesInit will handle conversion automatically on next run
                    SystemMessages::sysLogMsg(__METHOD__, "Sound file conversion will be handled by WorkerSoundFilesInit", LOG_DEBUG);
                } else {
                    SystemMessages::sysLogMsg(__METHOD__, "Failed to restore original sounds. Exit code: $exitCode", LOG_WARNING);
                }
            } else {
                SystemMessages::sysLogMsg(__METHOD__, "No original system sounds found in $sourceLanguageDir (this is normal for new languages)", LOG_DEBUG);
            }

            return true;

        } else {
            // Feature module: Remove only prefixed files (all format variants)
            $prefix = strtolower($moduleUniqueID) . '-';
            $findPath = Util::which('find');
            $soundsDir = escapeshellarg($systemSoundsDir);

            // Remove all format variants (wav, ulaw, alaw, gsm, g722, sln, mp3)
            $extensions = ['wav', 'ulaw', 'alaw', 'gsm', 'g722', 'sln', 'mp3'];
            $allSuccess = true;

            foreach ($extensions as $ext) {
                $pattern = escapeshellarg($prefix . "*.$ext");
                $command = "$findPath $soundsDir -type f -name $pattern -delete";
                $exitCode = Processes::mwExec($command, $output);

                if ($exitCode !== 0) {
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        "Failed to remove $ext files for module $moduleUniqueID. Exit code: $exitCode",
                        LOG_WARNING
                    );
                    $allSuccess = false;
                }
            }

            // Remove metadata files for module sounds
            $metadataPattern = escapeshellarg('.' . $prefix . '*.sound-meta');
            $command = "$findPath $soundsDir -type f -name $metadataPattern -delete";
            $exitCode = Processes::mwExec($command);

            if ($exitCode !== 0) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "Failed to remove metadata files for module $moduleUniqueID. Exit code: $exitCode",
                    LOG_WARNING
                );
                $allSuccess = false;
            }

            if ($allSuccess) {
                SystemMessages::sysLogMsg(__METHOD__, "Feature module $moduleUniqueID sound files (all formats) removed successfully", LOG_INFO);
            } else {
                SystemMessages::sysLogMsg(__METHOD__, "Some sound files for module $moduleUniqueID failed to be removed", LOG_WARNING);
            }

            return $allSuccess;
        }
    }

    /**
     * Update module sound files (removes old, installs new)
     *
     * @param string $moduleUniqueID Module unique identifier
     * @return bool True if successful
     */
    public static function updateModuleSounds(string $moduleUniqueID): bool
    {
        // Remove old sound files
        self::removeModuleSounds($moduleUniqueID);

        // Install new sound files
        return self::installModuleSounds($moduleUniqueID);
    }

    /**
     * Get list of languages available in system sounds directory
     *
     * Returns all language directories found in the sounds directory,
     * including base system languages and languages added by Language Pack modules.
     *
     * @return array List of language codes (e.g., ['en-en', 'ru-ru', 'de-de', 'ja-ja'])
     */
    public static function getAvailableLanguages(): array
    {
        $systemSoundsDir = Directories::getDir(Directories::AST_SOUNDS_DIR);

        if (!is_dir($systemSoundsDir)) {
            return [];
        }

        $languages = [];
        $dirs = glob("$systemSoundsDir/*", GLOB_ONLYDIR);

        foreach ($dirs as $dir) {
            $lang = basename($dir);
            // Only include directories that match language-country format (xx-xx)
            if (preg_match('/^[a-z]{2}-[a-z]{2}$/i', $lang)) {
                $languages[] = $lang;
            }
        }

        // Sort alphabetically
        sort($languages);

        return $languages;
    }

    /**
     * Mapping between Asterisk sound language codes (xx-xx) and Web admin language codes (xx)
     *
     * @var array<string, string>
     */
    private const array ASTERISK_TO_WEB_LANG_MAP = [
        'en-en' => 'en',
        'en-gb' => 'en',  // Use English translation for British English
        'ru-ru' => 'ru',
        'de-de' => 'de',
        'da-dk' => 'da',
        'es-es' => 'es',
        'gr-gr' => 'el',  // Greek: gr -> el (ISO 639-1)
        'fr-ca' => 'fr',
        'it-it' => 'it',
        'ja-jp' => 'ja',
        'nl-nl' => 'nl',
        'pl-pl' => 'pl',
        'pt-br' => 'pt_BR',
        'sv-sv' => 'sv',
        'cs-cs' => 'cs',
        'tr-tr' => 'tr',
        'uk-ua' => 'uk',
        'ka-ge' => 'ka',
        'vi-vn' => 'vi',
        'az-az' => 'az',
        'ro-ro' => 'ro',
        'th-th' => 'th',
        'hu-hu' => 'hu',
        'fi-fi' => 'fi',
        'hr-hr' => 'hr',
        'pt-pt' => 'pt',
        'zh-cn' => 'zh_Hans',
    ];

    /**
     * Get all supported languages
     *
     * Returns base system languages plus languages from enabled Language Pack modules.
     * Uses LanguageProvider::AVAILABLE_LANGUAGES as the single source of truth for language names.
     *
     * @return array Associative array of language codes to display names
     */
    public static function getSupportedLanguages(): array
    {
        $languages = [];

        // Get available Asterisk sound languages
        $availableLanguages = self::getAvailableLanguages();

        foreach ($availableLanguages as $asteriskCode) {
            // Map Asterisk code to web admin code
            $webCode = self::ASTERISK_TO_WEB_LANG_MAP[$asteriskCode] ?? null;

            if ($webCode !== null && array_key_exists($webCode, LanguageProvider::AVAILABLE_LANGUAGES)) {
                // Use native name from LanguageProvider
                $languages[$asteriskCode] = LanguageProvider::AVAILABLE_LANGUAGES[$webCode]['name'];
            } else {
                // Fallback: use uppercase language code if no mapping found
                $languages[$asteriskCode] = strtoupper($asteriskCode);
            }
        }

        // Sort by display name
        asort($languages, SORT_NATURAL | SORT_FLAG_CASE);

        return $languages;
    }

    /**
     * Check if language code is valid and supported
     *
     * @param string $languageCode Language code to validate
     * @return bool True if valid and supported
     */
    public static function isValidLanguageCode(string $languageCode): bool
    {
        return array_key_exists($languageCode, self::getSupportedLanguages());
    }
}
