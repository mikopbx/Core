<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\CallQueueMembers;
use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Models\ConferenceRooms;
use MikoPBX\Common\Models\CustomFiles;
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
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\SipHosts;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Common\Models\Users;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use Phalcon\Di\Injectable;

class ProcessOtherModels extends Injectable
{
    public static function getDependencyTable(): array
    {
        $tables = [];
        $tables[] = [
            'settingName' => [
                AsteriskManagerUsers::class,
            ],
            'functions' => [
                WorkerModelsEvents::R_MANAGERS,
                WorkerModelsEvents::R_ADVICE,
            ],
        ];

        $tables[] = [
            'settingName' => [
                CallQueueMembers::class,
            ],
            'functions' => [
                WorkerModelsEvents::R_QUEUES,
            ],
        ];

        $tables[] = [
            'settingName' => [
                CallQueues::class,
            ],
            'functions' => [
                WorkerModelsEvents::R_QUEUES,
                WorkerModelsEvents::R_DIALPLAN,
            ],
        ];
        $tables[] = [
            'settingName' => [
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
            'functions' => [
                WorkerModelsEvents::R_DIALPLAN,
            ],
        ];

        $tables[] = [
            'settingName' => [
                CustomFiles::class,
            ],
            'functions' => [
                WorkerModelsEvents::R_CUSTOM_F,
                WorkerModelsEvents::R_ADVICE,
            ],
        ];

        $tables[] = [
            'settingName' => [
                Sip::class,
            ],
            'functions' => [
                WorkerModelsEvents::R_SIP,
                WorkerModelsEvents::R_DIALPLAN,
                WorkerModelsEvents::R_FIREWALL,
                WorkerModelsEvents::R_ADVICE,
            ],
        ];

        $tables[] = [
            'settingName' => [
                Users::class,
                ExtensionForwardingRights::class,
            ],
            'functions' => [
                WorkerModelsEvents::R_SIP,
                WorkerModelsEvents::R_DIALPLAN,
            ],
        ];

        $tables[] = [
            'settingName' => [
                FirewallRules::class,
                Fail2BanRules::class,
            ],
            'functions' => [
                WorkerModelsEvents::R_FIREWALL,
            ],
        ];

        $tables[] = [
            'settingName' => [
                Iax::class,
            ],
            'functions' => [
                WorkerModelsEvents::R_IAX,
                WorkerModelsEvents::R_DIALPLAN,
            ],
        ];

        $tables[] = [
            'settingName' => [
                Codecs::class,
            ],
            'functions' => [
                WorkerModelsEvents::R_IAX,
                WorkerModelsEvents::R_SIP,
            ],
        ];

        $tables[] = [
            'settingName' => [
                SoundFiles::class,
            ],
            'functions' => [
                WorkerModelsEvents::R_MOH,
                WorkerModelsEvents::R_DIALPLAN,
            ],
        ];

        $tables[] = [
            'settingName' => [
                LanInterfaces::class,
            ],
            'functions' => [
                WorkerModelsEvents::R_NETWORK,
                WorkerModelsEvents::R_IAX,
                WorkerModelsEvents::R_SIP,
                WorkerModelsEvents::R_ADVICE,
            ],
        ];

        $tables[] = [
            'settingName' => [
                SipHosts::class,
            ],
            'functions' => [
                WorkerModelsEvents::R_FIREWALL,
                WorkerModelsEvents::R_SIP,
            ],
        ];

        $tables[] = [
            'settingName' => [
                NetworkFilters::class,
            ],
            'functions' => [
                WorkerModelsEvents::R_FIREWALL,
                WorkerModelsEvents::R_SIP,
                WorkerModelsEvents::R_MANAGERS,
                WorkerModelsEvents::R_ADVICE,
            ],
        ];
        
        return $tables;
    }
}