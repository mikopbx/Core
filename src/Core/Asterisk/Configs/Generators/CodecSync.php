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
     * 1. Queries Asterisk for available codecs
     * 2. Adds new codecs to database (disabled by default)
     * 3. Marks unavailable codecs as disabled
     * 4. Preserves user priority settings
     *
     * @return array Statistics about sync operation
     */
    public static function syncCodecsWithAsterisk(): array
    {
        $stats = [
            'added' => 0,
            'disabled' => 0,
            'enabled' => 0,
            'skipped' => 0,
            'errors' => [],
        ];

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

        // Add new codecs found in Asterisk but not in database
        foreach ($availableCodecs as $codecInfo) {
            $codecName = strtolower($codecInfo['name']);

            if (!isset($existingCodecs[$codecName])) {
                // New codec - add to database
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

        // Update existing codecs: enable if available, disable if not
        foreach ($existingCodecs as $codecName => $codec) {
            $isAvailable = in_array($codecName, $availableCodecNames, true);

            if ($isAvailable && $codec->disabled === '1') {
                // Codec became available - enable it
                $codec->disabled = '0';
                if ($codec->save()) {
                    $stats['enabled']++;
                    SystemMessages::sysLogMsg(
                        __CLASS__,
                        "Enabled available codec: {$codec->name}",
                        LOG_INFO
                    );
                } else {
                    $stats['errors'][] = "Failed to enable codec: {$codec->name}";
                }
            } elseif (!$isAvailable && $codec->disabled === '0') {
                // Codec not available in Asterisk - disable it
                $codec->disabled = '1';
                if ($codec->save()) {
                    $stats['disabled']++;
                    SystemMessages::sysLogMsg(
                        __CLASS__,
                        "Disabled unavailable codec: {$codec->name}",
                        LOG_INFO
                    );
                } else {
                    $stats['errors'][] = "Failed to disable codec: {$codec->name}";
                }
            }
        }

        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf(
                'Codec sync completed: %d added, %d enabled, %d disabled, %d errors',
                $stats['added'],
                $stats['enabled'],
                $stats['disabled'],
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
     * Get list of enabled and supported codecs.
     *
     * Returns only codecs that are:
     * 1. Enabled in database (disabled='0')
     * 2. Available in current Asterisk build
     *
     * @return array Array of codec names
     */
    public static function getEnabledSupportedCodecs(): array
    {
        // Get available codecs from Asterisk
        $availableCodecs = self::getAsteriskCodecs();
        $availableNames = array_map(
            fn($c) => strtolower($c['name']),
            $availableCodecs
        );

        // Get enabled codecs from database
        $enabledCodecs = Codecs::find([
            'conditions' => 'disabled = "0"',
            'order' => 'type, priority',
        ]);

        $result = [];
        foreach ($enabledCodecs as $codec) {
            $codecName = strtolower($codec->name);
            // Only include if available in Asterisk
            if (in_array($codecName, $availableNames, true)) {
                $result[] = $codec->name;
            }
        }

        return $result;
    }
}
