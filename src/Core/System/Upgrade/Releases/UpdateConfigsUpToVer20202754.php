<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 10 2020
 *
 */

namespace MikoPBX\Core\System\Upgrade\Releases;

use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use MikoPBX\Core\System\Util;
use Phalcon\Config as ConfigAlias;
use Phalcon\Di\Injectable;
use SQLite3;
use Throwable;

class UpdateConfigsUpToVer20202754 extends Injectable implements UpgradeSystemConfigInterface
{
    public const PBX_VERSION = '2020.2.754';

    private ConfigAlias $config;

    private MikoPBXConfig $mikoPBXConfig;

    private bool $isLiveCD;

    /**
     * Class constructor.
     */
    public function __construct()
    {
        $this->config        = $this->getDI()->getShared('config');
        $this->mikoPBXConfig = new MikoPBXConfig();
        $this->isLiveCD      = file_exists('/offload/livecd');
    }

    /**
     * Updates system configuration according to new rules
     */
    public function processUpdate(): void
    {
        if ($this->isLiveCD) {
            return;
        }

        $this->deleteOrphanCodecs();
        $this->addCustomCategoryToSoundFiles();
        $this->cleanAstDB();
        $this->copyMohFilesToStorage();
        $this->removeOldCacheFolders();
        $this->removeOldSessionsFiles();
        $this->updateExtensionsTable();
        $this->moveReadOnlySoundsToStorage();
    }

    /**
     * Deletes all not actual codecs
     */
    private function deleteOrphanCodecs()
    {
        $availCodecs = [
            // Видео кодеки.
            'h263p' => 'H.263+',
            'h263'  => 'H.263',
            'h264'  => 'H.264',
            // Аудио кодеки
            'adpcm' => 'ADPCM',
            'alaw'  => 'G.711 A-law',
            'ulaw'  => 'G.711 µ-law',
            'g719'  => 'G.719',
            'g722'  => 'G.722',
            'g726'  => 'G.726',
            'gsm'   => 'GSM',
            'ilbc'  => 'ILBC',
            'lpc10' => 'LPC-10',
            'speex' => 'Speex',
            'slin'  => 'Signed Linear PCM',
            'opus'  => 'Opus',
        ];
        $codecs      = Codecs::find();
        // Удалим лишние кодеки
        /** @var Codecs $codec */
        foreach ($codecs as $codec) {
            if (array_key_exists($codec->name, $availCodecs)) {
                $this->checkDisabledCodec($codec);
                continue;
            }
            if ( ! $codec->delete()) {
                Util::sysLogMsg(
                    __CLASS__,
                    'Can not delete codec ' . $codec->name . ' from MikoPBX\Common\Models\Codecs'
                );
            }
        }
        $this->addNewCodecs($availCodecs);
        $this->disableCodecs();
    }

    /**
     * Checks whether it correct field "disabled" for codec record.
     *
     * @param Codecs $codec
     */
    private function checkDisabledCodec(Codecs $codec): void
    {
        if ( ! in_array($codec->disabled, ['0', '1'], true)) {
            $codec->disabled = '0';
            $codec->save();
        }
    }

    /**
     * Adds new codecs from $availCodecs array if it doesn't exist
     *
     * @param array $availCodecs
     */
    private function addNewCodecs(array $availCodecs): void
    {
        foreach ($availCodecs as $availCodec => $desc) {
            $codecData = Codecs::findFirst('name="' . $availCodec . '"');
            if ($codecData === null) {
                $codecData = new Codecs();
            } elseif ($codecData->description === $desc) {
                unset($codecData);
                continue;
            }
            $codecData->name = $availCodec;
            if (strpos($availCodec, 'h26') === 0) {
                $type = 'video';
            } else {
                $type = 'audio';
            }
            $codecData->type        = $type;
            $codecData->description = $desc;
            if ( ! $codecData->save()) {
                Util::sysLogMsg(
                    __CLASS__,
                    'Can not update codec info ' . $codecData->name . ' from \MikoPBX\Common\Models\Codecs'
                );
            }
        }
    }

    /**
     * Disables unusable codecs
     */
    private function disableCodecs(): void
    {
        $availCodecs = [
            'h264' => 'H.264',
            'alaw' => 'G.711 A-law',
            'ulaw' => 'G.711 µ-law',
            'opus' => 'Opus',
            'ilbc' => 'ILBC',
        ];

        $codecs = Codecs::find();
        // Удалим лишние кодеки
        /** @var Codecs $codec */
        foreach ($codecs as $codec) {
            if (array_key_exists($codec->name, $availCodecs)) {
                continue;
            }
            $codec->disabled = '1';
            $codec->save();
        }
    }

    /**
     * Updates category attribute on SoundFiles table
     * Add custom category to all sound files
     */
    private function addCustomCategoryToSoundFiles(): void
    {
        $soundFiles = SoundFiles::find();
        foreach ($soundFiles as $sound_file) {
            $sound_file->category = SoundFiles::CATEGORY_CUSTOM;
            $sound_file->update();
        }
    }

    /**
     * Clean UserBuddyStatus on AstDB
     */
    private function cleanAstDB(): void
    {
        $astDbPath = $this->config->path('astDatabase.dbfile');
        if (file_exists($astDbPath)) {
            $table = 'astdb';
            $sql   = 'DELETE FROM ' . $table . ' WHERE key LIKE "/DND/SIP%" OR key LIKE "/CF/SIP%" OR key LIKE "/UserBuddyStatus/SIP%"';
            $db    = new SQLite3($astDbPath);
            try {
                $db->exec($sql);
            } catch (Throwable $e) {
                Util::sysLogMsg(__CLASS__, 'Can clean astdb from UserBuddyStatus...' . $e->getMessage());
                sleep(2);
            }
            $db->close();
            unset($db);
        }
    }

    /**
     * Copies MOH sound files to storage and creates record on SoundFiles table
     */
    private function copyMohFilesToStorage(): void
    {
        $oldMohDir = $this->config->path('asterisk.astvarlibdir') . '/sounds/moh';
        if ( ! file_exists($oldMohDir)) {
            return;
        }
        $currentMohDir = $this->config->path('asterisk.mohdir');
        if ( ! Util::mwMkdir($currentMohDir)) {
            return;
        }

        $files = scandir($oldMohDir);
        foreach ($files as $file) {
            if (in_array($file, ['.', '..'])) {
                continue;
            }
            if (copy($oldMohDir . '/' . $file, $currentMohDir . '/' . $file)) {
                $sound_file           = new SoundFiles();
                $sound_file->path     = $currentMohDir . '/' . $file;
                $sound_file->category = SoundFiles::CATEGORY_MOH;
                $sound_file->name     = $file;
                $sound_file->save();
            }
        }
    }

    /**
     * Removes old cache folders
     */
    private function removeOldCacheFolders(): void
    {
        $mediaMountPoint = $this->config->path('core.mediaMountPoint');
        $oldCacheDirs    = [
            "$mediaMountPoint/mikopbx/cache_js_dir",
            "$mediaMountPoint/mikopbx/cache_img_dir",
            "$mediaMountPoint/mikopbx/cache_css_dir",
        ];
        foreach ($oldCacheDirs as $old_cache_dir) {
            if (is_dir($old_cache_dir)) {
                $rmPath = Util::which('rm');
                Processes::mwExec("{$rmPath} -rf $old_cache_dir");
            }
        }
    }
    /**
     * Removes old sessions files
     */
    private function removeOldSessionsFiles(): void
    {
        $mediaMountPoint = $this->config->path('core.mediaMountPoint');
        $oldCacheDirs    = [
            "$mediaMountPoint/mikopbx/log/nats/license.key",
            "$mediaMountPoint/mikopbx/log/nats/*.cache",
            "$mediaMountPoint/mikopbx/log/pdnsd/cache",
            "$mediaMountPoint/mikopbx/log/Module*",
            "$mediaMountPoint/mikopbx/php_session",
            "$mediaMountPoint/mikopbx/tmp/*",
            "$mediaMountPoint/mikopbx/log/ProvisioningServerPnP",
            "/cf/conf/need_clean_cashe_www",
        ];
        foreach ($oldCacheDirs as $old_cache_dir) {
            if (is_dir($old_cache_dir)) {
                $rmPath = Util::which('rm');
                Processes::mwExec("{$rmPath} -rf $old_cache_dir");
            }
        }
    }


    /**
     * Updates show_in_phonebook attribute on Extensions table
     */
    private function updateExtensionsTable(): void
    {
        $showInPhonebookTypes = [
            Extensions::TYPE_DIALPLAN_APPLICATION,
            Extensions::TYPE_SIP,
            Extensions::TYPE_EXTERNAL,
            Extensions::TYPE_QUEUE,
            Extensions::TYPE_IVR_MENU,
            Extensions::TYPE_CONFERENCE,

        ];
        $parameters=[
            'conditions'=>'show_in_phonebook!=1 and type IN ({ids:array})',
            'bind'       => [
                'ids' => $showInPhonebookTypes,
            ],
        ];
        $extensions           = Extensions::find($parameters);
        foreach ($extensions as $extension) {
            if (in_array($extension->type, $showInPhonebookTypes)) {
                $extension->show_in_phonebook = '1';
                $extension->update();
            }
        }
    }

    /**
     * Moves predefined sound files to storage disk
     * Changes SoundFiles records
     */
    private function moveReadOnlySoundsToStorage(): void
    {
        $currentMediaDir = $this->config->path('asterisk.customSoundDir') . '/';
        if ( ! is_dir($currentMediaDir)) {
            Util::mwMkdir($currentMediaDir);
        }
        $soundFiles = SoundFiles::find();
        foreach ($soundFiles as $soundFile) {
            if (stripos($soundFile->path, '/offload/asterisk/sounds/other/') === 0) {
                $newPath = $currentMediaDir . pathinfo($soundFile->path)['basename'];
                if (copy($soundFile->path, $newPath)) {
                    $soundFile->path = $newPath;
                    $soundFile->update();
                }
            }
        }
    }


}