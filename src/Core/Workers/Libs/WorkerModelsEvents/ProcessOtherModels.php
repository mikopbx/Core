<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\CallQueueMembers;
use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Models\ConferenceRooms;
use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Common\Models\ExtensionForwardingRights;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\ExternalPhones;
use MikoPBX\Common\Models\Fail2BanRules;
use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Common\Models\IvrMenu;
use MikoPBX\Common\Models\IvrMenuActions;
use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Common\Models\OutWorkTimes;
use MikoPBX\Common\Models\OutWorkTimesRouts;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\SipHosts;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Common\Models\Users;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadDialplanAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadIAXAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadManagerAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadModuleStateAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadMOHAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadNetworkAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadPJSIPAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadQueuesAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadFirewallAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadRecordingSettingsAction;
use Phalcon\Di\Injectable;

class ProcessOtherModels extends Injectable
{
    public static function getDependencyTable(): array
    {
        $tables = [];
        $tables[] = [
            'modelClasses' => [
                AsteriskManagerUsers::class,
            ],
            'actions' => [
                ReloadManagerAction::class,
            ],
        ];

        $tables[] = [
            'modelClasses' => [
                CallQueueMembers::class,
            ],
            'actions' => [
                ReloadQueuesAction::class,
            ],
        ];

        $tables[] = [
            'modelClasses' => [
                CallQueues::class,
            ],
            'actions' => [
                ReloadQueuesAction::class,
                ReloadDialplanAction::class,
            ],
        ];
        $tables[] = [
            'modelClasses' => [
                ExternalPhones::class,
                Extensions::class,
                DialplanApplications::class,
                IncomingRoutingTable::class,
                IvrMenu::class,
                IvrMenuActions::class,
                OutgoingRoutingTable::class,
                OutWorkTimes::class,
                OutWorkTimesRouts::class,
                ConferenceRooms::class,
            ],
            'actions' => [
                ReloadDialplanAction::class,
            ],
        ];

        $tables[] = [
            'modelClasses' => [
                Sip::class,
            ],
            'actions' => [
                ReloadPJSIPAction::class,
                ReloadDialplanAction::class,
                ReloadFirewallAction::class,
            ],
        ];

        $tables[] = [
            'modelClasses' => [
                Users::class,
                ExtensionForwardingRights::class,
            ],
            'actions' => [
                ReloadPJSIPAction::class,
                ReloadDialplanAction::class,
            ],
        ];

        $tables[] = [
            'modelClasses' => [
                FirewallRules::class,
                Fail2BanRules::class,
            ],
            'actions' => [
                ReloadFirewallAction::class,
            ],
        ];

        $tables[] = [
            'modelClasses' => [
                Iax::class,
            ],
            'actions' => [
                ReloadIAXAction::class,
                ReloadDialplanAction::class,
            ],
        ];

        $tables[] = [
            'modelClasses' => [
                Codecs::class,
            ],
            'actions' => [
                ReloadIAXAction::class,
                ReloadPJSIPAction::class,
            ],
        ];

        $tables[] = [
            'modelClasses' => [
                SoundFiles::class,
            ],
            'actions' => [
                ReloadMOHAction::class,
                ReloadDialplanAction::class,
            ],
        ];

        $tables[] = [
            'modelClasses' => [
                LanInterfaces::class,
            ],
            'actions' => [
                ReloadNetworkAction::class,
                ReloadIAXAction::class,
                ReloadPJSIPAction::class,
            ],
        ];

        $tables[] = [
            'modelClasses' => [
                SipHosts::class,
            ],
            'actions' => [
                ReloadFirewallAction::class,
                ReloadPJSIPAction::class,
            ],
        ];

        $tables[] = [
            'modelClasses' => [
                NetworkFilters::class,
            ],
            'actions' => [
                ReloadFirewallAction::class,
                ReloadPJSIPAction::class,
                ReloadManagerAction::class,
            ],
        ];

        $tables[] = [
            'modelClasses' => [
                PbxExtensionModules::class,
            ],
            'actions' => [
                ReloadModuleStateAction::class
            ],
        ];

        // Recording settings for WorkerCallEvents
        $tables[] = [
            'modelClasses' => [
                Sip::class,
                Extensions::class,
            ],
            'actions' => [
                ReloadRecordingSettingsAction::class,
            ],
        ];

        return $tables;
    }
}