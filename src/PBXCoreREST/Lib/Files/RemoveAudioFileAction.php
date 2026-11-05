<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\Files;

use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;

/**
 * Class RemoveAudioFile
 * Delete a custom / music-on-hold sound file and its converted siblings from disk.
 *
 * SECURITY (GHSA-hg3p-xp2m-crfr): the path comes straight from the REST URL, so it is
 * confined to the managed sound roots (custom sounds, MOH, legacy media/ top level).
 * Call recordings are NOT deletable here: they are removed only through
 * DELETE /cdr/{id}?deleteRecording=true (WorkerCallEvents\DeleteCDR), which confines
 * the path to the monitor directory and writes the recording-deletion audit log.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Files
 */
class RemoveAudioFileAction extends Injectable
{
    private const array ALLOWED_CATEGORIES = [SoundFiles::CATEGORY_CUSTOM, SoundFiles::CATEGORY_MOH];

    /**
     * Delete file from disk by filepath
     *
     * @param string $filePath
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $filePath): PBXApiResult
    {
        return self::removeManagedSoundFile($filePath, SoundFiles::getDefaultManagedSoundRoots());
    }

    /**
     * @param array{custom:string,moh:string,media:string} $roots managed sound roots
     */
    public static function removeManagedSoundFile(string $filePath, array $roots): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $extension      = strtolower(Util::getExtensionOfFile($filePath));

        // Whitelist must mirror everything SoundFilesConf::convertAudioFile() can produce
        // (and SoundFiles::afterDelete() cleans up), otherwise replacing an existing sound
        // through the edit flow rejects the cleanup of the previous physical file by
        // extension and leaks it on disk together with all its siblings.
        if (! in_array($extension, SoundFiles::MANAGED_AUDIO_EXTENSIONS, true)) {
            $res->success    = false;
            $res->httpCode   = 422;
            $res->messages[] = "It is forbidden to remove the file type $extension.";

            return $res;
        }

        if (! self::isDeletionLocationAllowed($filePath, $roots)) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                'Refused to delete file outside managed sound directories: ' . $filePath,
                LOG_WARNING
            );
            $res->success    = false;
            $res->httpCode   = 403;
            $res->messages['error'][] = TranslationProvider::translate('rest_err_file_delete_not_permitted');

            return $res;
        }

        $alreadyDeleted = ! file_exists($filePath);

        // Sibling list = same whitelist; the converter writes one file per extension under
        // the shared basename, so cleanup must hit them all to avoid leftover ulaw/gsm/etc.
        // It runs even when the requested file is already gone, so converted leftovers of a
        // half-deleted sound are still removed. The requested path itself goes first: its
        // extension may differ in case from the lowercase sibling list (Greeting.WAV).
        // Each candidate is re-checked: a symlink or directory planted under the basename
        // must never be followed or removed, and the checked canonical path is unlinked.
        $basePath   = Util::trimExtensionForFile($filePath);
        $candidates = [$filePath];
        foreach (SoundFiles::MANAGED_AUDIO_EXTENSIONS as $ext) {
            $candidates[] = $basePath . '.' . $ext;
        }
        foreach (array_unique($candidates) as $candidate) {
            $realCandidate = SoundFiles::resolveManagedSoundFile($candidate, self::ALLOWED_CATEGORIES, $roots);
            if ($realCandidate !== null) {
                @unlink($realCandidate);
            }
        }

        if (file_exists($filePath)) {
            $res->success  = false;
            $res->httpCode = 500;
            $res->messages['error'][] = "Failed to delete file '$filePath'";
        } else {
            $res->success = true;
            if ($alreadyDeleted) {
                $res->data['message'] = "File '$filePath' already deleted";
            }
        }

        return $res;
    }

    /**
     * The requested path (existing or not) must resolve inside the managed sound roots.
     * A missing file is checked through its resolved parent directory, so the
     * "already deleted" answer is not an existence oracle for arbitrary locations.
     *
     * @param array{custom:string,moh:string,media:string} $roots
     */
    private static function isDeletionLocationAllowed(string $filePath, array $roots): bool
    {
        // Only a ".." path segment is traversal; names like "promo..v2.wav" are legitimate.
        // Containment itself is enforced by realpath + root prefix below.
        if ($filePath === '' || str_contains($filePath, "\0") || in_array('..', explode('/', $filePath), true)) {
            return false;
        }
        if (is_link($filePath)) {
            return false;
        }
        if (file_exists($filePath)) {
            return SoundFiles::resolveManagedSoundFile($filePath, self::ALLOWED_CATEGORIES, $roots) !== null;
        }
        $realParent = realpath(dirname($filePath));
        if ($realParent === false) {
            return false;
        }

        return SoundFiles::isWithinManagedSoundRoots(
            $realParent . '/' . basename($filePath),
            self::ALLOWED_CATEGORIES,
            $roots
        );
    }
}
