<?php
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

namespace MikoPBX\Core\Asterisk\Configs\Generators;

use MikoPBX\Common\Models\Codecs;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;

/**
 * Class CodecSync
 *
 * Synchronizes codec database with Asterisk's available codecs.
 * Ensures only supported codecs are enabled in configuration.
 *
 * @package MikoPBX\Core\Asterisk\Configs\Generators
 */
class CodecSync
{
    /**
     * Default codec priorities for audio codecs.
     * Used when adding new codecs to database.
     */
    private const array DEFAULT_AUDIO_PRIORITIES = [
        'alaw' => 1,
        'ulaw' => 2,
        'opus' => 3,
        'g722' => 4,
        'g729' => 5,
        'ilbc' => 6,
        'g726' => 7,
        'g726aal2' => 8,
        'gsm' => 9,
        'adpcm' => 10,
        'lpc10' => 11,
        'speex' => 12,
        'speex16' => 13,
        'speex32' => 14,
        'slin' => 15,
        'slin12' => 16,
        'slin16' => 17,
        'slin24' => 18,
        'slin32' => 19,
        'slin44' => 20,
        'slin48' => 21,
        'slin96' => 22,
        'slin192' => 23,
        'g719' => 24,
        'silk' => 25,
        'silk8' => 26,
        'silk12' => 27,
        'silk16' => 28,
        'silk24' => 29,
        'siren7' => 30,
        'siren14' => 31,
        'codec2' => 32,
        'g723' => 33,
    ];

    /**
     * Default codec priorities for video codecs.
     * Used when adding new codecs to database.
     */
    private const array DEFAULT_VIDEO_PRIORITIES = [
        'h264' => 1,
        'h263' => 2,
        'h263p' => 3,
        'vp8' => 4,
        'vp9' => 5,
        'h261' => 6,
        'h265' => 7,
        'mpeg4' => 8,
    ];

    /**
     * Codecs to ignore during synchronization.
     * These codecs are rarely used in real-world scenarios and clutter the interface.
     */
    private const array IGNORED_CODECS = [
        // PCM formats (internal Asterisk use only, not for SIP)
        'slin', 'slin12', 'slin16', 'slin24', 'slin32', 'slin44', 'slin48', 'slin96', 'slin192',

        // Skype codecs (not used in standard IP telephony)
        'silk', 'silk8', 'silk12', 'silk16', 'silk24',

        // Obsolete or rarely used audio codecs
        'speex16', 'speex32',  // Keep only base speex for compatibility
        'lpc10',               // Very old, poor quality
        'adpcm',               // Obsolete
        'codec2',              // Open source but exotic, rare device support
        'siren7', 'siren14',   // Polycom proprietary, rare
        'g723',                // Obsolete, replaced by g729

        // Obsolete video codecs
        'h261', 'h263', 'h263p', 'mpeg4',
    ];

    /**
     * Human-readable descriptions for codecs.
     * Maps technical names to display names.
     */
    private const array CODEC_DESCRIPTIONS = [
        // Audio codecs
        'alaw' => 'G.711 A-law',
        'ulaw' => 'G.711 μ-law',
        'opus' => 'Opus',
        'g722' => 'G.722',
        'g729' => 'G.729',
        'ilbc' => 'iLBC',
        'g726' => 'G.726',
        'g726aal2' => 'G.726 AAL2',
        'gsm' => 'GSM',
        'adpcm' => 'ADPCM',
        'lpc10' => 'LPC-10',
        'speex' => 'Speex',
        'speex16' => 'Speex 16kHz',
        'speex32' => 'Speex 32kHz',
        'slin' => 'Signed Linear PCM',
        'slin12' => 'Signed Linear PCM 12kHz',
        'slin16' => 'Signed Linear PCM 16kHz',
        'slin24' => 'Signed Linear PCM 24kHz',
        'slin32' => 'Signed Linear PCM 32kHz',
        'slin44' => 'Signed Linear PCM 44kHz',
        'slin48' => 'Signed Linear PCM 48kHz',
        'slin96' => 'Signed Linear PCM 96kHz',
        'slin192' => 'Signed Linear PCM 192kHz',
        'g719' => 'G.719',
        'silk' => 'SILK',
        'silk8' => 'SILK 8kHz',
        'silk12' => 'SILK 12kHz',
        'silk16' => 'SILK 16kHz',
        'silk24' => 'SILK 24kHz',
        'siren7' => 'Siren7',
        'siren14' => 'Siren14',
        'codec2' => 'Codec2',
        'g723' => 'G.723',

        // Video codecs
        'h264' => 'H.264',
        'h263' => 'H.263',
        'h263p' => 'H.263+',
        'vp8' => 'VP8',
        'vp9' => 'VP9',
        'h261' => 'H.261',
        'h265' => 'H.265',
        'mpeg4' => 'MPEG-4',
    ];

    /**
     * Synchronize database codecs with Asterisk's available codecs.
     *
     * This method:
     * 1. Temporarily loads ALL codec modules for transcoding validation
     * 2. Queries Asterisk for available codecs
     * 3. Validates transcoding support (can codec be converted to PCM)
     * 4. Adds new codecs to database (enabled by default, if transcoding supported)
     * 5. Deletes unsupported codecs from database
     * 6. Preserves user enabled/disabled settings for existing codecs
     * 7. Ensures GSM codec is always enabled (system sounds use GSM format)
     *
     * @return array Statistics about sync operation
     */
    public static function syncCodecsWithAsterisk(): array
    {
        $stats = [
            'added' => 0,
            'deleted' => 0,
            'skipped' => 0,
            'no_transcoding' => 0,
            'errors' => [],
        ];

        // STEP 1: Temporarily load all codec modules for validation
        $loadedModules = self::temporarilyLoadAllCodecModules();
        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf('Temporarily loaded %d codec modules for validation', count($loadedModules)),
            LOG_INFO
        );

        // Get available codecs from Asterisk
        $availableCodecs = self::getAsteriskCodecs();
        if (empty($availableCodecs)) {
            $stats['errors'][] = 'Could not retrieve codec list from Asterisk';
            SystemMessages::sysLogMsg(__CLASS__, 'Failed to get Asterisk codec list', LOG_WARNING);
            return $stats;
        }

        // Get existing codecs from database (case-insensitive lookup)
        $existingCodecs = [];
        $dbCodecs = Codecs::find();
        foreach ($dbCodecs as $codec) {
            $existingCodecs[strtolower($codec->name)] = $codec;
        }

        // Build lookup of available codec names (lowercase)
        $availableCodecNames = array_map(
            fn($c) => strtolower($c['name']),
            $availableCodecs
        );

        // STEP 2: Add new codecs found in Asterisk but not in database
        foreach ($availableCodecs as $codecInfo) {
            $codecName = strtolower($codecInfo['name']);

            if (!isset($existingCodecs[$codecName])) {
                // Skip ignored codecs - don't add them to database
                if (in_array($codecName, self::IGNORED_CODECS, true)) {
                    $stats['skipped']++;
                    continue;
                }

                // Check transcoding support for audio codecs
                if ($codecInfo['type'] === 'audio' && !self::canTranscode($codecInfo['name'])) {
                    $stats['no_transcoding']++;
                    SystemMessages::sysLogMsg(
                        __CLASS__,
                        "Skipped codec without transcoding support: {$codecInfo['name']}",
                        LOG_INFO
                    );
                    continue;
                }

                // New codec - add to database (enabled by default if transcoding supported)
                if (self::addCodecToDatabase($codecInfo)) {
                    $stats['added']++;
                    SystemMessages::sysLogMsg(
                        __CLASS__,
                        "Added new codec: {$codecInfo['name']} ({$codecInfo['type']})",
                        LOG_INFO
                    );
                } else {
                    $stats['errors'][] = "Failed to add codec: {$codecInfo['name']}";
                }
            }
        }

        // STEP 3: Delete unwanted codecs from database
        foreach ($existingCodecs as $codecName => $codec) {
            $isAvailable = in_array($codecName, $availableCodecNames, true);
            $isIgnored = in_array($codecName, self::IGNORED_CODECS, true);

            // Check transcoding support for audio codecs
            $canTranscode = true;
            if ($codec->type === 'audio' && $isAvailable && !$isIgnored) {
                $canTranscode = self::canTranscode($codec->name);
            }

            // Delete if: not supported by Asterisk OR in ignored list OR cannot transcode (audio only)
            if (!$isAvailable || $isIgnored || !$canTranscode) {
                $reason = !$isAvailable ? 'unsupported' :
                         ($isIgnored ? 'ignored' : 'no_transcoding');
                if ($codec->delete()) {
                    $stats['deleted']++;
                    SystemMessages::sysLogMsg(
                        __CLASS__,
                        "Deleted $reason codec: {$codec->name}",
                        LOG_INFO
                    );
                } else {
                    $stats['errors'][] = "Failed to delete codec: {$codec->name}";
                }
            }
            // If codec is available, not ignored, and can transcode, preserve user's enabled/disabled setting
        }

        // STEP 4: Ensure GSM codec is always enabled (system sounds use GSM format)
        self::ensureGsmCodecEnabled();

        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf(
                'Codec sync completed: %d added, %d deleted, %d skipped, %d no_transcoding, %d errors',
                $stats['added'],
                $stats['deleted'],
                $stats['skipped'],
                $stats['no_transcoding'],
                count($stats['errors'])
            ),
            LOG_INFO
        );

        return $stats;
    }

    /**
     * Get list of codecs available in Asterisk.
     *
     * Parses output of 'core show codecs' command.
     *
     * @return array Array of codec info: [['name' => 'alaw', 'type' => 'audio'], ...]
     */
    private static function getAsteriskCodecs(): array
    {
        $asterisk = Util::which('asterisk');
        if (empty($asterisk)) {
            return [];
        }

        $output = [];
        Processes::mwExec("$asterisk -rx 'core show codecs'", $output);

        $codecs = [];
        foreach ($output as $line) {
            // Parse lines like: "  43 audio silk         silk8            (SILK Codec (8 KHz))"
            // Format: ID TYPE NAME FORMAT (DESCRIPTION)
            // We need FORMAT column (4th field), not NAME (3rd field)
            if (preg_match('/^\s+\d+\s+(audio|video|image)\s+\S+\s+(\S+)/', $line, $matches)) {
                $type = $matches[1];
                $format = $matches[2];

                // Skip non-RTP codecs (image, none)
                if (in_array($type, ['image'], true) || $format === 'none') {
                    continue;
                }

                $codecs[] = [
                    'name' => $format,
                    'type' => $type,
                ];
            }
        }

        return $codecs;
    }

    /**
     * Add a codec to the database.
     *
     * @param array $codecInfo Codec information from Asterisk
     * @return bool True on success, false on failure
     */
    private static function addCodecToDatabase(array $codecInfo): bool
    {
        $codec = new Codecs();
        // Keep codec name as-is from Asterisk (e.g., silk8, not silk)
        $codec->name = $codecInfo['name'];
        $codec->type = $codecInfo['type'];
        $codec->disabled = '0'; // Enable by default - codec is available

        // Set description (use lowercase for lookup)
        $codecNameLower = strtolower($codec->name);
        $codec->description = self::CODEC_DESCRIPTIONS[$codecNameLower] ?? ucfirst($codec->name);

        // Set priority based on type (use lowercase for lookup)
        if ($codec->type === 'audio') {
            $codec->priority = self::DEFAULT_AUDIO_PRIORITIES[$codecNameLower] ?? 99;
        } else {
            $codec->priority = self::DEFAULT_VIDEO_PRIORITIES[$codecNameLower] ?? 99;
        }

        if (!$codec->save()) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                'Failed to save codec ' . $codec->name . ': ' . implode(', ', $codec->getMessages()),
                LOG_ERR
            );
            return false;
        }

        return true;
    }

    /**
     * Get list of enabled codecs for configuration.
     *
     * Returns codecs that are enabled by user (disabled='0').
     *
     * Note: During sync, the following codecs are automatically deleted:
     * - Unsupported by current Asterisk build
     * - Listed in IGNORED_CODECS (PCM, Skype, obsolete formats)
     *
     * So all codecs in database are guaranteed to be:
     * - Supported by Asterisk
     * - Practical for real-world use
     *
     * @return array Array of codec names
     */
    public static function getEnabledSupportedCodecs(): array
    {
        // Get enabled codecs from database
        $enabledCodecs = Codecs::find([
            'conditions' => 'disabled = "0"',
            'order' => 'type, priority',
        ]);

        $result = [];
        foreach ($enabledCodecs as $codec) {
            $result[] = $codec->name;
        }

        return $result;
    }

    /**
     * Temporarily load all codec modules for transcoding validation.
     *
     * Attempts to load ALL potential codec modules to enable accurate
     * transcoding path detection during sync process.
     *
     * This includes modules that may not be currently loaded but are
     * available in the Asterisk installation.
     *
     * These modules will be unloaded after validation when Asterisk
     * restarts with the generated modules.conf configuration.
     *
     * @return array List of successfully loaded module names
     */
    private static function temporarilyLoadAllCodecModules(): array
    {
        $asterisk = Util::which('asterisk');
        if (empty($asterisk)) {
            return [];
        }

        // List of all known codec modules to attempt loading
        // This ensures we try to load even modules not currently loaded
        $codecModulesToTry = [
            // Core G.711 codecs
            'codec_alaw.so',
            'codec_ulaw.so',

            // Modern wideband codecs
            'codec_g722.so',
            'codec_opus.so',

            // Legacy/compatible codecs
            'codec_g726.so',
            'codec_gsm.so',
            'codec_ilbc.so',
            'codec_g729.so',

            // Experimental/extended codecs
            'codec_silk.so',
            'codec_adpcm.so',
            'codec_speex.so',
            'codec_lpc10.so',
            'codec_g719.so',
            'codec_codec2.so',
            'codec_g723.so',
        ];

        // Filter out modules whose .so files don't exist on this build
        $astModDir = Directories::getDir(Directories::AST_MOD_DIR);
        $codecModulesToTry = array_filter(
            $codecModulesToTry,
            static fn(string $m): bool => file_exists("$astModDir/$m")
        );

        $loadedModules = [];
        foreach ($codecModulesToTry as $module) {
            // First check if module is already loaded
            $checkOutput = [];
            Processes::mwExec("$asterisk -rx 'module show like " . basename($module, '.so') . "'", $checkOutput);

            $checkResult = implode(' ', $checkOutput);
            if (str_contains($checkResult, $module) && str_contains($checkResult, 'Running')) {
                // Module already loaded
                $loadedModules[] = $module;
                continue;
            }

            // Try to load module if not loaded
            $loadOutput = [];
            Processes::mwExec("$asterisk -rx 'module load $module'", $loadOutput);

            $loadResult = implode(' ', $loadOutput);
            // Check if module loaded successfully
            if (str_contains($loadResult, 'Loaded')) {
                $loadedModules[] = $module;
            }
            // Silently ignore modules that fail to load (not available on this platform)
        }

        return $loadedModules;
    }

    /**
     * Check if codec can be transcoded to PCM (required for recording).
     *
     * Tests if Asterisk can convert this codec to signed linear PCM (slin),
     * which is necessary for:
     * - Call recording (WAV files)
     * - Voicemail recording
     * - Conference bridges (MixMonitor)
     *
     * Codecs without transcoding paths (like Opus in builds without codec_opus.so)
     * can only be used for passthrough - direct RTP forwarding without any processing.
     *
     * This method assumes all codec modules have been temporarily loaded via
     * temporarilyLoadAllCodecModules() for accurate validation.
     *
     * @param string $codecName Codec name to check (e.g., 'opus', 'alaw')
     * @return bool True if codec can transcode to PCM, false otherwise
     */
    private static function canTranscode(string $codecName): bool
    {
        $asterisk = Util::which('asterisk');
        if (empty($asterisk)) {
            return false;
        }

        $output = [];
        Processes::mwExec("$asterisk -rx 'core show translation paths $codecName'", $output);

        // Check if codec can transcode to any slin format (required for WAV recording)
        // Format examples:
        // - Native transcode (direct):  "To slin:8000 : "  (empty = supported)
        // - Multi-step transcode:       "To slin:8000 : (codec@rate)->(slin@8000)"  (path shown = supported)
        // - No transcoding:             "To slin:8000 : No Translation Path"  (not supported)
        foreach ($output as $line) {
            // Look for lines targeting slin
            if (preg_match('/To slin:\d+\s+:\s*(.*)$/', $line, $matches)) {
                $path = trim($matches[1]);

                // If path is empty OR contains actual translation path, transcoding is supported
                // Only reject if explicitly states "No Translation Path"
                if ($path === '' || !str_contains($path, 'No Translation Path')) {
                    return true; // Codec can transcode to PCM
                }
            }
        }

        // No translation paths to slin found - codec cannot be used for recording
        return false;
    }

    /**
     * Ensure GSM codec is always enabled in database.
     *
     * GSM codec must be enabled because all system sound files are recorded
     * in GSM format by default. Disabling GSM would prevent playback of:
     * - IVR prompts
     * - System announcements
     * - Default voicemail greetings
     *
     * This method is called after sync to guarantee GSM remains enabled
     * even if validation logic tried to disable it.
     */
    private static function ensureGsmCodecEnabled(): void
    {
        $gsmCodec = Codecs::findFirst([
            'conditions' => 'LOWER(name) = :name:',
            'bind' => ['name' => 'gsm'],
        ]);

        if ($gsmCodec === null) {
            // GSM not in database - this shouldn't happen, but handle gracefully
            SystemMessages::sysLogMsg(
                __CLASS__,
                'GSM codec not found in database during ensureGsmCodecEnabled()',
                LOG_WARNING
            );
            return;
        }

        // Enable GSM if it was disabled
        if ($gsmCodec->disabled === '1') {
            $gsmCodec->disabled = '0';
            if ($gsmCodec->save()) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    'GSM codec automatically enabled (required for system sounds)',
                    LOG_INFO
                );
            } else {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    'Failed to enable GSM codec: ' . implode(', ', $gsmCodec->getMessages()),
                    LOG_ERR
                );
            }
        }
    }
}
