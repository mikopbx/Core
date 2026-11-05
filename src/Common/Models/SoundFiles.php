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

use MikoPBX\Core\System\Directories;
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
     * Every audio format SoundFilesConf::convertAudioFile() can produce under one basename.
     * Adding a new format there requires extending this list, otherwise its files leak on delete.
     */
    public const array MANAGED_AUDIO_EXTENSIONS = [
        'wav', 'wav16', 'wav48', 'mp3', 'g722', 'gsm', 'ulaw', 'alaw', 'sln', 'opus', 'webm',
    ];

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
     * Resolve a usable Asterisk-side audio path for a stored SoundFiles.path value.
     *
     * Returns the path stripped of its extension (the form Asterisk's Background()
     * and Playback() applications expect), provided that *some* sibling file with a
     * recognisable audio extension exists next to it. Returns an empty string when
     * neither the stored path nor any sibling can be found on disk.
     *
     * Why this exists: dialplan generators (IVRConf, IncomingContexts, OutWorkTime,
     * announce-recording) historically did `if (file_exists($path)) trim(); else
     * fallback`. After upgrading from MikoPBX ≤ 2022.x — where SoundFiles.path was
     * stored as ".mp3" — a later format pipeline change can leave the .mp3 absent
     * while the .wav (or .webm) sibling still lives next to it. Strict file_exists
     * on the stored extension reports false in that case, the dialplan substitutes
     * 'vm-enter-num-to-call', the language pack may not ship that prompt, and the
     * IVR ends up dropping the call. Resolving by basename avoids that whole class
     * of failure without touching the DB row.
     *
     * @param string $storedPath Value of SoundFiles.path as persisted in the DB.
     * @return string Path without extension if any audio sibling exists, '' otherwise.
     */
    public static function resolveAsteriskAudioPath(string $storedPath): string
    {
        if ($storedPath === '') {
            return '';
        }

        // Fast path: the stored file is on disk — keep the historical behaviour.
        if (file_exists($storedPath)) {
            $pathinfo = pathinfo($storedPath);
            return ($pathinfo['dirname'] ?? '.') . '/' . ($pathinfo['filename'] ?? '');
        }

        // Stored extension is gone — look for a sibling with the same base name.
        // .mp3/.webm/.opus are intentionally excluded from candidates: the very
        // failure mode this function exists for is "the .mp3 stored in DB was
        // dropped by a later pipeline change and only the .wav/.gsm/.* siblings
        // remain". Probing for the same compressed format we're working around
        // would defeat the purpose. SoundFilesConf does load format_mp3 and
        // format_ogg_opus, so Asterisk *could* decode them — we just don't want
        // to pick them up here.
        $pathinfo = pathinfo($storedPath);
        $dirname = rtrim($pathinfo['dirname'] ?? '.', '/');
        $filename = $pathinfo['filename'] ?? '';
        if ($filename === '' || $dirname === '') {
            return '';
        }
        $base = $dirname . '/' . $filename;

        $candidateExtensions = ['wav', 'wav16', 'wav48', 'sln', 'gsm', 'ulaw', 'alaw', 'g722'];
        foreach ($candidateExtensions as $ext) {
            if (file_exists("$base.$ext")) {
                return $base;
            }
        }

        return '';
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

        // Unlink the checked canonical path, not the original one: re-resolving the
        // original would let a directory swapped for a symlink after the check redirect it.
        $deleteFile = function (string $candidate): void {
            $realCandidate = $this->resolveManagedDeletionCandidate($candidate);
            if ($realCandidate !== null) {
                @unlink($realCandidate);
            }
        };

        $deleteFile($this->path);

        // Remove extension to get base filename
        $pathinfo = pathinfo($this->path);
        $baseFilename = $pathinfo['dirname'] . '/' . $pathinfo['filename'];

        // Delete all related converted files.
        foreach (self::MANAGED_AUDIO_EXTENSIONS as $ext) {
            $convertedFile = "$baseFilename.$ext";
            if ($convertedFile !== $this->path) {
                $deleteFile($convertedFile);
            }
        }

        // Delete temporary files that may remain after interrupted conversion
        $tempSuffixes = ['.tmp.wav', '.normalized.wav'];
        foreach ($tempSuffixes as $suffix) {
            $tempFile = "$baseFilename$suffix";
            $deleteFile($tempFile);
        }

        // Sweep self-overwrite snapshot files left by SoundFilesConf::convertAudioFile().
        // Pattern: "$baseFilename.source-snapshot.<ext>" — created when source extension
        // collides with a target format and ffmpeg was killed before the cleanup loop ran.
        $snapshotFiles = glob("$baseFilename.source-snapshot.*") ?: [];
        foreach ($snapshotFiles as $snapshotFile) {
            $deleteFile($snapshotFile);
        }

        // Sweep any stray atomic-rename tempfiles left by SoundFilesConf::convertAudioFile()
        // if the worker was killed mid-conversion (e.g. "$baseFilename.mp3.converting").
        $strayTmpFiles = glob("$baseFilename.*.converting") ?: [];
        foreach ($strayTmpFiles as $strayTmpFile) {
            $deleteFile($strayTmpFile);
        }

        // Delete sound conversion metadata cache file
        $metadataFile = $pathinfo['dirname'] . '/.' . $pathinfo['filename'] . '.sound-meta';
        $deleteFile($metadataFile);
    }

    /** @return array{custom:string,moh:string,media:string} */
    protected function getManagedSoundRoots(): array
    {
        return self::getDefaultManagedSoundRoots();
    }

    /** @return array{custom:string,moh:string,media:string} */
    public static function getDefaultManagedSoundRoots(): array
    {
        return [
            'custom' => Directories::getDir(Directories::AST_CUSTOM_SOUND_DIR),
            'moh' => Directories::getDir(Directories::AST_MOH_DIR),
            'media' => Directories::getDir(Directories::AST_MEDIA_DIR),
        ];
    }

    protected function resolveManagedDeletionCandidate(string $candidate): ?string
    {
        $category = $this->category ?? self::CATEGORY_CUSTOM;
        return self::resolveManagedSoundFile($candidate, [$category], $this->getManagedSoundRoots());
    }

    /**
     * Canonical path of an existing regular file (not a symlink) that resolves inside the
     * sound roots of the given categories, the only place user sound files may be deleted
     * from; null otherwise. Callers must act on the returned path, not on $candidate.
     *
     * @param string[] $categories subset of CATEGORY_CUSTOM / CATEGORY_MOH; others never match
     * @param array{custom:string,moh:string,media:string} $roots
     */
    public static function resolveManagedSoundFile(string $candidate, array $categories, array $roots): ?string
    {
        if ($candidate === '' || is_link($candidate) || !is_file($candidate)) {
            return null;
        }
        $realCandidate = realpath($candidate);
        if ($realCandidate === false || !self::isWithinManagedSoundRoots($realCandidate, $categories, $roots)) {
            return null;
        }
        return $realCandidate;
    }

    /**
     * Pure location check of an already resolved (realpath'ed) path against the sound roots.
     *
     * @param string[] $categories subset of CATEGORY_CUSTOM / CATEGORY_MOH; others never match
     * @param array{custom:string,moh:string,media:string} $roots
     */
    public static function isWithinManagedSoundRoots(string $realPath, array $categories, array $roots): bool
    {
        $categoryRoots = [
            self::CATEGORY_CUSTOM => $roots['custom'],
            self::CATEGORY_MOH => $roots['moh'],
        ];
        $matched = false;
        foreach ($categories as $category) {
            if (!isset($categoryRoots[$category])) {
                continue;
            }
            $matched = true;
            $realCategoryRoot = realpath($categoryRoots[$category]);
            if ($realCategoryRoot === false) {
                continue;
            }
            if (str_starts_with($realPath, rtrim($realCategoryRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR)) {
                return true;
            }
        }
        if (!$matched) {
            return false;
        }

        // Compatibility with legacy installations that stored sounds directly in media/.
        $realMediaRoot = realpath($roots['media']);
        return $realMediaRoot !== false
            && dirname($realPath) === rtrim($realMediaRoot, DIRECTORY_SEPARATOR)
            && in_array(strtolower(pathinfo($realPath, PATHINFO_EXTENSION)), self::MANAGED_AUDIO_EXTENSIONS, true);
    }
}
