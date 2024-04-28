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

namespace MikoPBX\Core\System\Upgrade\Releases;

use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use MikoPBX\Core\System\Util;
use Phalcon\Di;
use Phalcon\Di\Injectable;
use MikoPBX\Core\System\MikoPBXConfig;
use Phalcon\Config as ConfigAlias;

class UpdateConfigsUpToVer20212187 extends Injectable implements UpgradeSystemConfigInterface
{
    public const PBX_VERSION = '2021.2.187';

    private ConfigAlias $config;
    private MikoPBXConfig $mikoPBXConfig;
    private bool $isLiveCD;

    private const  OLD_MONITOR_PATH = '/storage/usbdisk1/mikopbx/voicemailarchive/monitor';

    private string $monitorDir = '/storage/usbdisk1/mikopbx/astspool/monitor';
    private string $mvPath;
    private string $findPath;
    private string $rmPath;

    /**
     * Class constructor.
     */
    public function __construct()
    {
        $this->config        = $this->getDI()->getShared('config');
        $this->mikoPBXConfig = new MikoPBXConfig();
        $this->isLiveCD      = file_exists('/offload/livecd');

        $di = Di::getDefault();
        if ($di !== null) {
            $this->monitorDir = $di->getConfig()->path('asterisk.monitordir');
        }

        $this->mvPath   = Util::which('mv');
        $this->rmPath   = Util::which('rm');
        $this->findPath = Util::which('find');
    }

    /**
     * Main function
     */
    public function processUpdate(): void
    {
        $this->updateFirewallRules();
        if ($this->isLiveCD) {
            return;
        }
        $this->moveOldRecords();
    }

    /**
     * Moves directory
     *
     * @param $oldPath
     * @param $newDir
     */
    public function moveDirCreateLink($oldPath, $newDir): void
    {
        if (file_exists($newDir)) {
            $lsDir = scandir($oldPath);
            foreach ($lsDir as $filename) {
                if ($filename === '.' || '..' === $filename) {
                    continue;
                }
                $_oldPath = $oldPath . "/" . $filename;
                $_newDir  = $newDir . "/" . $filename;
                $this->moveDirCreateLink($_oldPath, $_newDir);
            }
        } else {
            Processes::mwExec("{$this->mvPath} '{$oldPath}' '{$newDir}'");
        }
    }

    /**
     * Creates symlinks to old call records
     */
    private function moveOldRecords(): void
    {
        $lsDir = scandir(self::OLD_MONITOR_PATH);
        foreach ($lsDir as $filename) {
            if ($filename === '.' || '..' === $filename) {
                continue;
            }
            $oldPath = self::OLD_MONITOR_PATH . "/" . $filename;
            $newDir  = $this->monitorDir . "/" . $filename;
            $this->moveDirCreateLink($oldPath, $newDir);
            $out = [];
            Processes::mwExec("{$this->findPath} " . $this::OLD_MONITOR_PATH . " -type f", $out);
            if (count($out) !== 0) {
                SystemMessages::sysLogMsg(static::class, 'Error moving old recording dir.');
            } else {
                Processes::mwExec("{$this->rmPath} -rf '{$oldPath}'");
                Util::createUpdateSymlink($newDir, $oldPath);
            }
        }
    }

    /**
     * Fills new fields portFromKey and portToKey in FirewallRules table
     */
    private function updateFirewallRules(): void
    {
        $defaultRules = FirewallRules::getDefaultRules();
        $existsRules = FirewallRules::find();
        foreach ($existsRules as $rule){
            $category = $rule->category;
            foreach ($defaultRules as $defCategory=>$defaultRuleSet){
                if ($defCategory!==$category){
                    continue;
                }
                foreach ($defaultRuleSet['rules'] as $defaultRule){
                    if ($defaultRule['portfrom']===$rule->portfrom){
                        $rule->portFromKey = $defaultRule['portFromKey'];
                    }
                    if ($defaultRule['portto']===$rule->portto){
                        $rule->portToKey = $defaultRule['portToKey'];
                    }
                    $rule->update();
                }
            }
        }
    }
}