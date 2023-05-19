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

use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\SipHosts;
use MikoPBX\Common\Models\Users;
use MikoPBX\Common\Providers\MainDatabaseProvider;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di;
use Phalcon\Di\Injectable;

class UpdateConfigsUpToVer20213130 extends Injectable implements UpgradeSystemConfigInterface
{
  	public const PBX_VERSION = '2021.3.130';

    private bool $isLiveCD;

	/**
     * Class constructor.
     */
    public function __construct()
    {
        $this->isLiveCD      = file_exists('/offload/livecd');
    }

	/**
     * Main function
     */
    public function processUpdate():void
    {
  		if ($this->isLiveCD) {
            return;
        }

        $this->deleteOutdatedTables();
        $this->deleteOrphanDBRecords();

    }

    /**
     * Delete unused data tables from DB
     */
    public function deleteOutdatedTables()
    {
        $di = Di::getDefault();
        $connectionService = $di->getShared(MainDatabaseProvider::SERVICE_NAME);
        $connectionService->dropTable('m_SipCodecs');
        $connectionService->dropTable('m_IaxCodecs');
        $connectionService->dropTable('m_BackupRules');
    }

    /**
     * Deletes all not actual db data
     * https://github.com/mikopbx/Core/issues/144
     */
    private function deleteOrphanDBRecords()
    {
        $sipRecords      = Sip::find();
        /** @var Sip $sipRecord */
        foreach ($sipRecords as $sipRecord){
            if ($sipRecord->Providers === null && $sipRecord->Extensions === null){
                $sipRecord->delete();
            }
        }

        $iaxRecords      = Iax::find();
        /** @var Iax $iaxRecord */
        foreach ($iaxRecords as $iaxRecord){
            if ($iaxRecord->Providers === null){
                $iaxRecord->delete();
            }
        }

        $sipHostsRecords      =  SipHosts::find();
        /** @var SipHosts $sipHostsRecord */
        foreach ($sipHostsRecords as $sipHostsRecord){
            if ($sipHostsRecord->Sip === null){
                $sipHostsRecord->delete();
            }
        }

        $usersRecords      =  Users::find('id>"1"');
        /** @var Users $usersRecord */
        foreach ($usersRecords as $usersRecord){
            if ($usersRecord->Extensions === null){
                $usersRecord->delete();
            }
        }

    }

}