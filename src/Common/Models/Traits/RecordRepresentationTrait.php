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

namespace MikoPBX\Common\Models\Traits;

use MikoPBX\AdminCabinet\Controllers\ApiKeysController;
use MikoPBX\AdminCabinet\Controllers\AsteriskManagersController;
use MikoPBX\AdminCabinet\Controllers\CallQueuesController;
use MikoPBX\AdminCabinet\Controllers\ConferenceRoomsController;
use MikoPBX\AdminCabinet\Controllers\CustomFilesController;
use MikoPBX\AdminCabinet\Controllers\DialplanApplicationsController;
use MikoPBX\AdminCabinet\Controllers\ExtensionsController;
use MikoPBX\AdminCabinet\Controllers\Fail2BanController;
use MikoPBX\AdminCabinet\Controllers\FirewallController;
use MikoPBX\AdminCabinet\Controllers\GeneralSettingsController;
use MikoPBX\AdminCabinet\Controllers\IncomingRoutesController;
use MikoPBX\AdminCabinet\Controllers\IvrMenuController;
use MikoPBX\AdminCabinet\Controllers\NetworkController;
use MikoPBX\AdminCabinet\Controllers\OffWorkTimesController;
use MikoPBX\AdminCabinet\Controllers\OutboundRoutesController;
use MikoPBX\AdminCabinet\Controllers\ProvidersController;
use MikoPBX\AdminCabinet\Controllers\SoundFilesController;
use MikoPBX\Common\Library\Text;
use MikoPBX\Common\Models\ApiKeys;
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
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Common\Models\Users;
use Phalcon\Mvc\Url;

/**
 * Trait RecordRepresentationTrait
 *
 * Provides methods for generating human-readable representations and web interface links for model records.
 *
 * @package MikoPBX\Common\Models\Traits
 */
trait RecordRepresentationTrait
{
    /**
     * Returns a model's element representation
     *
     * @param bool $needLink add link to element
     *
     * @return string
     */
    public function getRepresent(bool $needLink = false): string
    {
        switch (static::class) {
            case ApiKeys::class:
                $name = '<i class="key icon"></i> ';
                $name .= empty($this->id)
                    ? $this->t('mo_NewElementApiKeys')
                    : $this->t('repApiKeys', ['represent' =>$this->key_display]);
                break;
            case AsteriskManagerUsers::class:
                $name = '<i class="asterisk icon"></i> ';
                $name .= empty($this->id)
                    ? $this->t('mo_NewElementAsteriskManagerUsers')
                    : $this->t('repAsteriskManagerUsers', ['represent' => $this->username]);
                break;
            case CallQueueMembers::class:
                $name = $this->Extensions->getRepresent();
                break;
            case CallQueues::class:
                $name = '<i class="users icon"></i> ';
                $name .= empty($this->id)
                    ? $this->t('mo_NewElementCallQueues')
                    : $this->t('mo_CallQueueShort4Dropdown') . ': '
                    . $this->name
                    . " <$this->extension>";
                break;
            case ConferenceRooms::class:
                $name = '<i class="phone volume icon"></i> ';
                $name .= empty($this->id)
                    ? $this->t('mo_NewElementConferenceRooms')
                    : $this->t('mo_ConferenceRoomsShort4Dropdown') . ': '
                    . $this->name
                    . " <$this->extension>";
                break;
            case CustomFiles::class:
                $name = "<i class='file icon'></i> $this->filepath";
                break;
            case DialplanApplications::class:
                $name = '<i class="php icon"></i> ';
                $name .= empty($this->id)
                    ? $this->t('mo_NewElementDialplanApplications')
                    : $this->t('mo_ApplicationShort4Dropdown') . ': '
                    . $this->name
                    . " <$this->extension>";
                break;
            case ExtensionForwardingRights::class:
                $name = $this->Extensions?->getRepresent() ?? ($this->extension ?? 'Unknown');
                break;
            case Extensions::class:
                if ($this->type === Extensions::TYPE_EXTERNAL) {
                    $icon = '<i class="icons"><i class="user outline icon"></i><i class="top right corner alternate mobile icon"></i></i>';
                } else {
                    $icon = '<i class="icons"><i class="user outline icon"></i></i>';
                }
                if (empty($this->id)) {
                    $name = "$icon {$this->t('mo_NewElementExtensions')}";
                } elseif ($this->userid > 0) {
                    $name = $this->Users?->username ? $this->trimName($this->Users->username) : '';
                    $name = "$icon $name <$this->number>";
                } else {
                    switch (strtoupper($this->type)) {
                        case Extensions::TYPE_CONFERENCE:
                            $name = $this->ConferenceRooms?->getRepresent() ?? "$this->callerid <$this->number>";
                            break;
                        case Extensions::TYPE_QUEUE:
                            $name = $this->CallQueues?->getRepresent() ?? "$this->callerid <$this->number>";
                            break;
                        case Extensions::TYPE_DIALPLAN_APPLICATION:
                            $name = $this->DialplanApplications?->getRepresent() ?? "$this->callerid <$this->number>";
                            break;
                        case Extensions::TYPE_IVR_MENU:
                            $name = $this->IvrMenu?->getRepresent() ?? "$this->callerid <$this->number>";
                            break;
                        case Extensions::TYPE_MODULES:
                            $name = '<i class="puzzle piece icon"></i> '
                                . $this->t('mo_ModuleShort4Dropdown')
                                . ': '
                                . $this->callerid;
                            break;
                        case Extensions::TYPE_SYSTEM:
                            $name = '<i class="cogs icon"></i> '
                                . $this->t('mo_SystemExten_' . $this->number);
                            break;
                        case Extensions::TYPE_PARKING:
                            $name = $this->t('mo_ParkingExtension', ['number' => $this->number]);
                            break;
                        case Extensions::TYPE_EXTERNAL:
                        case Extensions::TYPE_SIP:
                        default:
                            $name = "$this->callerid <$this->number>";
                    }
                }
                break;
            case ExternalPhones::class:
                $name = $this->Extensions?->getRepresent() ?? 'Unknown';
                break;
            case Fail2BanRules::class:
                $name = '';
                break;
            case FirewallRules::class:
                $name = $this->category;
                break;
            case Iax::class:
                $name = '<i class="server icon"></i> ';
                if (empty($this->id)) {
                    $name .= $this->t('mo_NewElementIax');
                } elseif ($this->disabled === '1') {
                    $name .= "IAX: $this->description ({$this->t( 'mo_Disabled' )})";
                } else {
                    $name .= "IAX: $this->description";
                }
                break;
            case IvrMenu::class:
                $name = '<i class="sitemap icon"></i> ';
                $name .= empty($this->id)
                    ? $this->t('mo_NewElementIvrMenu')
                    : $this->t('mo_IVRMenuShort4Dropdown') . ': '
                    . $this->name
                    . " <$this->extension>";
                break;
            case IvrMenuActions::class:
                $name = $this->IvrMenu->getRepresent();
                break;
            case Codecs::class:
                $name = $this->name;
                break;
            case IncomingRoutingTable::class:
                $name = '<i class="map signs icon"></i> ';
                if (empty($this->id)) {
                    $name .= $this->t('mo_NewElementIncomingRoutingTable');
                } elseif (!empty($this->rulename && $this->rulename ==='default action')) {
                    $name .= $this->t('repIncomingRoutingTableDefaultRuleName');
                } elseif (!empty($this->rulename)) {
                    $name .= $this->t('repIncomingRoutingTable', ['represent' => $this->rulename]);
                } else {
                    $name .= $this->t('repIncomingRoutingTableNumber', ['represent' => $this->id]);
                }
                break;
            case LanInterfaces::class:
                $name = $this->name;
                break;
            case NetworkFilters::class:
                $name = '<i class="globe icon"></i> ';
                if (empty($this->id)) {
                    $name .= $this->t('mo_NewElementNetworkFilters');
                } else {
                    $name .= $this->description . '('
                        . $this->t('fw_PermitNetwork') . ': ' . $this->permit
                        . ')';
                }
                break;
            case OutgoingRoutingTable::class:
                $name = '<i class="random icon"></i> ';
                if (empty($this->id)) {
                    $name .= $this->t('mo_NewElementOutgoingRoutingTable');
                } elseif (!empty($this->rulename)) {
                    $name .= $this->t('repOutgoingRoutingTable', ['represent' => $this->rulename]);
                } else {
                    $name .= $this->t('repOutgoingRoutingTableNumber', ['represent' => $this->id]);
                }
                break;
            case OutWorkTimes::class:
                $name = '<i class="time icon"></i> ';
                if (empty($this->id)) {
                    $name .= $this->t('mo_NewElementOutWorkTimes');
                } else {
                    $represent = '';
                    if (!empty($this->date_from)) {
                        $represent .= "<i class='icon outline calendar alternate' ></i>";
                        $tsFrom = is_numeric($this->date_from) ? (int)$this->date_from : (int)strtotime($this->date_from);
                        $date_from = date("d.m.Y", $tsFrom);
                        $represent .= "$date_from";
                        $tsTo = $this->date_to ? (is_numeric($this->date_to) ? (int)$this->date_to : (int)strtotime($this->date_to)) : $tsFrom;
                        $date_to = date("d.m.Y", $tsTo);
                        if ($date_from !== $date_to) {
                            $represent .= " - $date_to";
                        }
                    }
                    if (!empty($this->weekday_from)) {
                        if (!empty($represent)) {
                            $represent .= ' ';
                        }
                        $weekday_from = $this->t(date('D', strtotime("Sunday +$this->weekday_from days")));
                        $represent .= "<i class='icon outline calendar minus' ></i>";
                        $represent .= "$weekday_from";
                        if (!empty($this->weekday_to) && $this->weekday_from !== $this->weekday_to) {
                            $weekday_to = $this->t(date('D', strtotime("Sunday +$this->weekday_to days")));
                            $represent .= " - $weekday_to";
                        }
                    }

                    if (!empty($this->time_from)) {
                        if (!empty($represent)) {
                            $represent .= ' ';
                        }
                        $represent .= "<i class='icon clock outline' ></i>";
                        $represent .= "$this->time_from";
                        if ($this->time_from !== $this->time_to) {
                            $represent .= " - $this->time_to";
                        }
                    }

                    // Use custom description if available, otherwise use translation
                    if (!empty($this->description)) {
                        $name .= $this->description;
                        if (!empty($represent)) {
                            $name .= ' - ' . $represent;
                        }
                    } else {
                        // Use the standard translation pattern
                        $name .= $this->t('repOutWorkTimes', ['represent' => $represent]);
                    }
                }
                break;
            case Providers::class:
                if ($this->type === "IAX") {
                    $name = $this->Iax?->getRepresent() ?? 'IAX Provider (not configured)';
                } else {
                    $name = $this->Sip?->getRepresent() ?? 'SIP Provider (not configured)';
                }
                break;
            case PbxSettings::class:
                $name = $this->key;
                break;
            case PbxExtensionModules::class:
                $name = '<i class="puzzle piece icon"></i> '
                    . $this->t('mo_ModuleShort4Dropdown') . ': '
                    . $this->name;
                break;
            case Sip::class:
                $name = '<i class="server icon"></i> ';
                if (empty($this->id)) {
                    $name .= $this->t('mo_NewElementSip');
                } elseif ($this->disabled === '1') {
                    $name .= "SIP: $this->description ({$this->t( 'mo_Disabled' )})";
                } else {
                    $name .= "SIP: $this->description";
                }

                break;
            case Users::class:
                $name = '<i class="user outline icon"></i> ' . $this->username;
                foreach ($this->Extensions ?? [] as $extension) {
                    // Include both SIP (internal) and EXTERNAL (mobile) extensions in search representation
                    if ($extension->type === Extensions::TYPE_SIP || $extension->type === Extensions::TYPE_EXTERNAL) {
                        $name .= ' <' . $extension->number . '>';
                    }
                }
                break;
            case SoundFiles::class:
                $name = '<i class="file audio outline icon"></i> ';
                $name .= empty($this->id)
                    ? $this->t('mo_NewElementSoundFiles')
                    : $this->t('repSoundFiles', ['represent' => $this->name]);
                break;
            default:
                $name = 'Unknown';
        }

        if ($needLink) {
            $link = $this->getWebInterfaceLink();
            $category = explode('\\', static::class)[3];
            $result = $this->t(
                'rep' . $category,
                [
                    'represent' => "<a href='$link'>$name</a>",
                ]
            );
        } else {
            $result = $name;
        }

        return $result;
    }

    /**
     * Trims long names.
     *
     * @param string $s
     *
     * @return string
     */
    private function trimName(string $s): string
    {
        $max_length = 64;

        if (strlen($s) > $max_length) {
            $offset = ($max_length - 3) - strlen($s);
            $s = substr($s, 0, strrpos($s, ' ', $offset)) . '...';
        }

        return $s;
    }

    /**
     * Return link on database record in web interface
     *
     * @return string
     */
    public function getWebInterfaceLink(): string
    {
        $link = '#';

        switch (static::class) {
            case ApiKeys::class:
                $link = $this->buildRecordUrl(ApiKeysController::class, 'modify', $this->id);
                break;
            case AsteriskManagerUsers::class:
                $link = $this->buildRecordUrl(AsteriskManagersController::class, 'modify', $this->id);
                break;
            case CallQueueMembers::class:
                $link = $this->buildRecordUrl(CallQueuesController::class, 'modify', $this->CallQueues->uniqid);
                break;
            case CallQueues::class:
                $link = $this->buildRecordUrl(CallQueuesController::class, 'modify', $this->uniqid);
                break;
            case ConferenceRooms::class:
                $link = $this->buildRecordUrl(ConferenceRoomsController::class, 'modify', $this->uniqid);
                break;
            case CustomFiles::class:
                $link = $this->buildRecordUrl(CustomFilesController::class, 'modify', $this->id);
                break;
            case DialplanApplications::class:
                $link = $this->buildRecordUrl(DialplanApplicationsController::class, 'modify', $this->uniqid);
                break;
            case ExtensionForwardingRights::class:
                // Link to the associated extension's edit page
                if ($this->Extensions) {
                    $link = $this->Extensions->getWebInterfaceLink();
                }
                break;
            case Extensions::class:
                // Check if this is a user extension (has userid and is general user number)
                // If so, redirect to employees controller instead of extensions
                if ($this->userid > 0 && $this->is_general_user_number === "1") {
                    $link = $this->buildRecordUrl(ExtensionsController::class, 'modify', $this->userid);
                } else {
                    $link = $this->buildRecordUrl(ExtensionsController::class, 'modify', $this->id);
                }
                break;
            case ExternalPhones::class:
                if ($this->Extensions->is_general_user_number === "1") {
                    // For user extensions, redirect to employees controller using userid
                    $link = $this->buildRecordUrl(ExtensionsController::class, 'modify', $this->Extensions->userid);
                }
                break;
            case Fail2BanRules::class:
                $link = $this->buildRecordUrl(Fail2BanController::class, 'index');
                break;
            case FirewallRules::class:
                $link = $this->buildRecordUrl(FirewallController::class, 'modify', $this->NetworkFilters->id);
                break;
            case Iax::class:
                $link = $this->buildRecordUrl(ProvidersController::class, 'modifyiax', $this->Providers->id);
                break;
            case IvrMenu::class:
                $link = $this->buildRecordUrl(IvrMenuController::class, 'modify', $this->uniqid);
                break;
            case IvrMenuActions::class:
                $link = $this->buildRecordUrl(IvrMenuController::class, 'modify', $this->IvrMenu->uniqid);
                break;
            case IncomingRoutingTable::class:
                $link = $this->buildRecordUrl(IncomingRoutesController::class, 'modify', $this->id);
                break;
            case LanInterfaces::class:
                $link = $this->buildRecordUrl(NetworkController::class, 'modify');
                break;
            case NetworkFilters::class:
                $link = $this->buildRecordUrl(FirewallController::class, 'modify', $this->id);
                break;
            case OutgoingRoutingTable::class:
                $link = $this->buildRecordUrl(OutboundRoutesController::class, 'modify', $this->id);
                break;
            case OutWorkTimes::class:
                $link = $this->buildRecordUrl(OffWorkTimesController::class, 'modify', $this->id);
                break;
            case Providers::class:
                if ($this->type === "IAX") {
                    $link = $this->buildRecordUrl(ProvidersController::class, 'modifyiax', $this->uniqid);
                } else {
                    $link = $this->buildRecordUrl(ProvidersController::class, 'modifysip', $this->uniqid);
                }
                break;
            case PbxSettings::class:
                $link = $this->buildRecordUrl(GeneralSettingsController::class, 'index');
                break;
            case PbxExtensionModules::class:
                $url = new Url();
                $baseUri = $this->di->getShared('config')->path('adminApplication.baseUri');
                $unCamelizedModuleId = Text::uncamelize($this->uniqid, '-');
                $link = $url->get("$unCamelizedModuleId/$unCamelizedModuleId/index", null, null, $baseUri);
                break;
            case Sip::class:
                if ($this->Extensions) {
                    if ($this->Extensions->is_general_user_number === "1") {
                        // For user extensions, redirect to employees controller using userid
                        $link = $this->buildRecordUrl(ExtensionsController::class, 'modify', $this->Extensions->userid);
                    } else {
                        $link = $this->buildRecordUrl(ExtensionsController::class, 'modify', $this->Extensions->id);
                    }
                } elseif ($this->Providers) {
                    $link = $this->buildRecordUrl(ProvidersController::class, 'modifysip', $this->Providers->id);
                }
                break;
            case Users::class:
                // For users, always redirect to employees controller using userid
                $link = $this->buildRecordUrl(ExtensionsController::class, 'modify', $this->id);
                break;
            case SoundFiles::class:
                $link = $this->buildRecordUrl(SoundFilesController::class, 'modify', $this->id);
                break;
            default:
        }

        return $link;
    }

    /**
     * Build a record URL based on the controller class, action, and record ID.
     *
     * @param string $controllerClass The controller class name.
     * @param string $action The action name.
     * @param string $recordId The record ID (optional).
     *
     * @return string The generated record URL.
     */
    private function buildRecordUrl(string $controllerClass, string $action, string $recordId = ''): string
    {
        $url = new Url();
        $baseUri = $this->di->getShared('config')->path('adminApplication.baseUri');
        $controllerParts = explode('\\', $controllerClass);
        $controllerName = end($controllerParts);
        // Remove the "Controller" suffix if present
        $controllerName = str_replace("Controller", "", $controllerName);
        $unCamelizedControllerName = Text::uncamelize($controllerName, '-');
        $link = $url->get("$unCamelizedControllerName//$action//$recordId", null, null, $baseUri);

        return $link;
    }
}
