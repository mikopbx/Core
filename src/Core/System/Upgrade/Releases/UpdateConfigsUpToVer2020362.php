<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Models\CallQueueMembers;
use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Models\IvrMenuActions;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;
use MikoPBX\Core\System\MikoPBXConfig;
use Phalcon\Config as ConfigAlias;

class UpdateConfigsUpToVer2020362 extends Injectable implements UpgradeSystemConfigInterface
{
  	public const PBX_VERSION = '2020.3.62';

	private ConfigAlias $config;
    private MikoPBXConfig $mikoPBXConfig;

	/**
     * Class constructor.
     */
    public function __construct()
    {
        $this->config = $this->getDI()->getShared('config');
        $this->mikoPBXConfig = new MikoPBXConfig();
    }

	/**
     * Main function
     */
    public function processUpdate():void
    {
        if ($this->isLiveCD) {
            return;
        }
        $this->deleteOrphanedProviders();
        $this->deleteOrphanedQueueMembers();
        $this->deleteOrphanedIVRMenuActions();
    }

    /**
     * Deletes m_Sip and m_Iax records without links to m_Providers and m_Extensions
     */
    private function deleteOrphanedProviders():void
    {
        $sipRecords = Sip::find();
        foreach ($sipRecords as $sipRecord){
            if ($sipRecord->Providers===null && $sipRecord->Extensions===null){
                $sipRecord->delete();
            }
        }

        $iaxRecords = Iax::find();
        foreach ($iaxRecords as $iaxRecord){
            if ($iaxRecord->Providers===null){
                $iaxRecord->delete();
            }
        }

    }

    /**
     * Deletes m_CallQueueMembers records without links to m_CallQueue and m_Extensions
     */
    private function deleteOrphanedQueueMembers():void
    {
        $records = CallQueueMembers::find();
        foreach ($records as $record){
            if ($record->Extensions===null
                || $record->CallQueues===null
             ){
                $record->delete();
            }
        }
    }

    /**
     * Deletes m_IvrMenuActions records without links to m_IvrMenu and m_Extensions
     */
    private function deleteOrphanedIVRMenuActions():void
    {
        $records = IvrMenuActions::find();
        foreach ($records as $record){
            if ($record->Extensions===null
                || $record->IvrMenu===null
            ){
                $record->delete();
            }
        }
    }

}