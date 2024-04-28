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

use MikoPBX\Common\Models\CallQueueMembers;
use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Models\IvrMenuActions;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\SipHosts;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;
use MikoPBX\Core\System\MikoPBXConfig;
use Phalcon\Config as ConfigAlias;

class UpdateConfigsUpToVer2020362 extends Injectable implements UpgradeSystemConfigInterface
{
    public const PBX_VERSION = '2020.3.62';

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
     * Main function
     */
    public function processUpdate(): void
    {
        $this->deleteOrphanedProviders();
        $this->deleteOrphanedQueueMembers();
        $this->deleteOrphanedIVRMenuActions();
        $this->updateSipHosts();
    }

    private function updateSipHosts():void{
        /** @var Sip $data */
        $db_data    = Sip::find("type = 'friend' AND ( disabled <> '1')");
        foreach ($db_data as $data){
            $parameters    = [
                'conditions' => 'provider_id=:provider: AND address=:address:',
                'bind'       => [
                    'provider' => $data->uniqid,
                    'address'  => $data->host,
                ],
            ];
            $hostData = SipHosts::findFirst($parameters);
            if($hostData){
                continue;
            }
            $hostData = new SipHosts();
            $hostData->provider_id = $data->uniqid;
            $hostData->address = $data->host;
            if(!$hostData->save()){
                SystemMessages::sysLogMsg(self::class, 'Error save SipHosts', LOG_ERR);
            }
        }
    }

    /**
     * Deletes m_Sip and m_Iax records without links to m_Providers and m_Extensions
     */
    private function deleteOrphanedProviders(): void
    {
        $sipRecords = Sip::find();
        foreach ($sipRecords as $sipRecord) {
            if ($sipRecord->Providers === null && $sipRecord->Extensions === null) {
                $sipRecord->delete();
            }
        }

        $iaxRecords = Iax::find();
        foreach ($iaxRecords as $iaxRecord) {
            if ($iaxRecord->Providers === null) {
                $iaxRecord->delete();
            }
        }
    }

    /**
     * Deletes m_CallQueueMembers records without links to m_CallQueue and m_Extensions
     */
    private function deleteOrphanedQueueMembers(): void
    {
        $records = CallQueueMembers::find();
        foreach ($records as $record) {
            if ($record->Extensions === null
                || $record->CallQueues === null
            ) {
                $record->delete();
            }
        }
    }

    /**
     * Deletes m_IvrMenuActions records without links to m_IvrMenu and m_Extensions
     */
    private function deleteOrphanedIVRMenuActions(): void
    {
        $records = IvrMenuActions::find();
        foreach ($records as $record) {
            if ($record->Extensions === null
                || $record->IvrMenu === null
            ) {
                $record->delete();
            }
        }
    }

}