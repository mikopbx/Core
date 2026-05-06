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

namespace MikoPBX\Common\Models;

use Phalcon\Mvc\Model\Relation;

/**
 * Class SoundFiles
 *
 * @package MikoPBX\Common\Models
 */
class SoundFiles extends ModelsBase
{
    public const string CATEGORY_MOH = 'moh';
    public const string CATEGORY_CUSTOM = 'custom';

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Human-readable name for the sound file displayed in the interface
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $name = '';

    /**
     * Path to the sound file
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $path = '';

    /**
     * Category of the sound file, either "moh" for music on hold or "custom" for a custom file
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $category = '';

    /**
     * Optional description of the sound file
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_SoundFiles');
        parent::initialize();
        $this->hasMany(
            'id',
            CallQueues::class,
            'periodic_announce_sound_id',
            [
                "alias" => "CallQueuesPeriodicAnnounce",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action" => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasMany(
            'id',
            CallQueues::class,
            'moh_sound_id',
            [
                "alias" => "CallQueuesMoh",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action" => Relation::ACTION_RESTRICT,
                ],
            ]
        );

        $this->hasMany(
            'id',
            OutWorkTimes::class,
            'audio_message_id',
            [
                "alias" => "OutWorkTimes",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action" => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasMany(
            'id',
            IvrMenu::class,
            'audio_message_id',
            [
                "alias" => "IvrMenu",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action" => Relation::ACTION_RESTRICT,
                ],
            ]
        );
    }

    /**
     * Delete physical sound file and related converted files after record deletion
     */
    public function afterDelete(): void
    {
        if (empty($this->path)) {
            return;
        }

        // Skip deletion for files on read-only /offload partition (default system sounds)
        if (str_starts_with($this->path, '/offload/')) {
            return;
        }

        // Delete the main file
        if (file_exists($this->path)) {
            unlink($this->path);
        }

        // Remove extension to get base filename
        $pathinfo = pathinfo($this->path);
        $baseFilename = $pathinfo['dirname'] . '/' . $pathinfo['filename'];

        // Delete all related converted files. Must stay in sync with the formats produced by
        // SoundFilesConf::convertAudioFile() — adding a new format there requires extending
        // this list, otherwise orphaned files leak on delete.
        $extensions = ['wav', 'wav16', 'wav48', 'mp3', 'g722', 'gsm', 'ulaw', 'alaw', 'sln', 'opus', 'webm'];
        foreach ($extensions as $ext) {
            $convertedFile = "$baseFilename.$ext";
            if ($convertedFile !== $this->path && file_exists($convertedFile)) {
                unlink($convertedFile);
            }
        }

        // Delete temporary files that may remain after interrupted conversion
        $tempSuffixes = ['.tmp.wav', '.normalized.wav'];
        foreach ($tempSuffixes as $suffix) {
            $tempFile = "$baseFilename$suffix";
            if (file_exists($tempFile)) {
                unlink($tempFile);
            }
        }

        // Sweep self-overwrite snapshot files left by SoundFilesConf::convertAudioFile().
        // Pattern: "$baseFilename.source-snapshot.<ext>" — created when source extension
        // collides with a target format and ffmpeg was killed before the cleanup loop ran.
        $snapshotFiles = glob("$baseFilename.source-snapshot.*") ?: [];
        foreach ($snapshotFiles as $snapshotFile) {
            if (is_file($snapshotFile)) {
                @unlink($snapshotFile);
            }
        }

        // Sweep any stray atomic-rename tempfiles left by SoundFilesConf::convertAudioFile()
        // if the worker was killed mid-conversion (e.g. "$baseFilename.mp3.converting").
        $strayTmpFiles = glob("$baseFilename.*.converting") ?: [];
        foreach ($strayTmpFiles as $strayTmpFile) {
            if (is_file($strayTmpFile)) {
                @unlink($strayTmpFile);
            }
        }

        // Delete sound conversion metadata cache file
        $metadataFile = $pathinfo['dirname'] . '/.' . $pathinfo['filename'] . '.sound-meta';
        if (file_exists($metadataFile)) {
            unlink($metadataFile);
        }
    }
}
