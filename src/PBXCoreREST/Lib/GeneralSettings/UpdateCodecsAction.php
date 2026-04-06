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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\GeneralSettings;

use MikoPBX\Common\Models\Codecs;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * UpdateCodecsAction - updates codec configuration
 *
 * Custom action specifically for updating codec priorities and enabled/disabled status.
 * This is separated from general settings to provide a cleaner API.
 *
 * @package MikoPBX\PBXCoreREST\Lib\GeneralSettings
 */
class UpdateCodecsAction extends AbstractSaveRecordAction
{
    /**
     * Codecs that are hidden from UI but always enabled with lowest priority.
     * WHY: GSM is required for playing system sound files (.gsm format).
     * Without GSM codec, Asterisk cannot transcode .gsm files to other formats.
     */
    private const HIDDEN_CODECS = ['gsm'];
    /**
     * Update codec priorities and enabled/disabled status
     *
     * @param array<string, mixed> $data Request data containing 'codecs' array
     * @return PBXApiResult Result with success status and messages
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        try {
            // Extract codecs data
            $codecs = $data['codecs'] ?? [];

            if (empty($codecs) || !is_array($codecs)) {
                $res->messages['error'][] = 'No codec data provided';
                return $res;
            }

            // Execute in transaction for consistency
            $result = self::executeInTransaction(function() use ($codecs) {
                return self::updateCodecs($codecs);
            });

            if ($result) {
                $res->success = true;
                $res->messages['success'][] = 'Codecs updated successfully';
                $res->data = ['updated_count' => count($codecs)];
            } else {
                $res->messages['error'][] = 'Failed to update codecs';
            }

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }

    /**
     * Update codecs in database
     *
     * @param array<int, array<string, mixed>> $codecsData Array of codec configurations
     * @return bool Success status
     */
    private static function updateCodecs(array $codecsData): bool
    {
        $updateCount = 0;
        $maxAudioPriority = 0;

        foreach ($codecsData as $codecData) {
            $codecName = $codecData['name'] ?? '';

            if (empty($codecName)) {
                continue;
            }

            // Find codec by name
            $codecRecord = Codecs::findFirst([
                'conditions' => 'name = :name:',
                'bind' => ['name' => $codecName]
            ]);

            if (!$codecRecord) {
                continue;
            }

            // Prepare new values
            $newPriority = isset($codecData['priority']) ? (string)$codecData['priority'] : $codecRecord->priority;
            $newDisabled = isset($codecData['disabled']) ?
                ($codecData['disabled'] === true || $codecData['disabled'] === 'true' ? '1' : '0') :
                $codecRecord->disabled;

            // Track max audio priority for hidden codecs
            if ($codecRecord->type === 'audio') {
                $maxAudioPriority = max($maxAudioPriority, (int)$newPriority);
            }

            // Only update if values changed
            if ($codecRecord->priority !== $newPriority || $codecRecord->disabled !== $newDisabled) {
                $codecRecord->priority = $newPriority;
                $codecRecord->disabled = $newDisabled;

                if (!$codecRecord->update()) {
                    throw new \Exception(
                        "Failed to update codec $codecName: " .
                        implode(', ', $codecRecord->getMessages())
                    );
                }
                $updateCount++;
            }
        }

        // Ensure hidden codecs are always enabled with lowest priority
        self::ensureHiddenCodecsEnabled($maxAudioPriority);

        return true;
    }

    /**
     * Ensure hidden codecs are always enabled with lowest priority
     *
     * WHY: GSM codec is required for playing system sound files (.gsm format).
     * Without GSM codec enabled, Asterisk cannot transcode .gsm files to other
     * formats (like opus, alaw, ulaw), causing call disconnection during playback.
     *
     * @param int $maxAudioPriority Maximum priority among user-visible audio codecs
     */
    private static function ensureHiddenCodecsEnabled(int $maxAudioPriority): void
    {
        foreach (self::HIDDEN_CODECS as $codecName) {
            $codec = Codecs::findFirst([
                'conditions' => 'name = :name:',
                'bind' => ['name' => $codecName]
            ]);

            if ($codec !== null) {
                // Always enable with priority after all user-visible codecs
                $codec->disabled = '0';
                $codec->priority = (string)($maxAudioPriority + 1);
                $codec->save();
            }
        }
    }
}