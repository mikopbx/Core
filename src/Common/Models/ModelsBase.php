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
use MikoPBX\AdminCabinet\Controllers\OutboundRoutesController;
use MikoPBX\AdminCabinet\Controllers\OutOffWorkTimeController;
use MikoPBX\AdminCabinet\Controllers\ProvidersController;
use MikoPBX\AdminCabinet\Controllers\SoundFilesController;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\BeanstalkConnectionModelsProvider;
use MikoPBX\Common\Providers\CDRDatabaseProvider;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\ModelsCacheProvider;
use MikoPBX\Common\Providers\ModelsMetadataProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Modules\PbxExtensionUtils;
use Phalcon\Db\Adapter\AdapterInterface;
use Phalcon\Di;
use Phalcon\Events\Event;
use Phalcon\Events\Manager;
use Phalcon\Messages\Message;
use Phalcon\Messages\MessageInterface;
use Phalcon\Mvc\Model;
use Phalcon\Mvc\Model\Relation;
use Phalcon\Mvc\Model\Resultset;
use Phalcon\Mvc\Model\Resultset\Simple;
use Phalcon\Mvc\Model\ResultsetInterface;
use Phalcon\Security\Random;
use Phalcon\Text;
use Phalcon\Url;

/**
 * Class ModelsBase
 *
 * @method static mixed findFirstById(array|string|int $parameters = null)
 * @method static mixed findFirstByKey(string|null $parameters)
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
 * @method static mixed findFirst(array|string|int $parameters = null)
 * @method static ResultsetInterface find(array|string|int $parameters = null)
 * @method static mixed count(array $parameters = null)
 * @method  bool create()
 * @method  bool delete()
 * @method  bool save()
 * @method  bool update()
 * @method  array|MessageInterface[] getMessages(mixed $filter = null)
 * @method static AdapterInterface getReadConnection()
 * @method  Simple|false getRelated(string $alias, $arguments = null)
 *
 * @property Model\Manager _modelsManager
 * @property Di di
 *
 * @package MikoPBX\Common\Models
 */
class ModelsBase extends Model
{
    /**
     * All models with lover than this version in module.json won't be attached as children
     * We use this constant to disable old modules that may not be compatible with the current version of MikoPBX
     */
    public const MIN_MODULE_MODEL_VER = '2020.2.468';

    /**
     * Returns Cache key for the models cache service
     *
     * @param string $modelClass
     * @param string $keyName
     *
     * @return string
     */
    public static function makeCacheKey(string $modelClass, string $keyName): string
    {
        $category = explode('\\', $modelClass)[3];
        return "{$category}:{$keyName}";
    }

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        self::setup(['orm.events' => true]);
        $this->keepSnapshots(true);
        $this->addExtensionModulesRelations();

        $eventsManager = new Manager();

        $eventsManager->attach(
            'model',
            function (Event $event, $record) {
                $type = $event->getType();
                switch ($type) {
                    case 'afterSave':
                    case 'afterDelete':
                        $record->processSettingsChanges($type);
                        self::clearCache(get_class($record));
                        break;
                    default:

                }
            }
        );

        $this->setEventsManager($eventsManager);

    }

    /**
     * Attaches model's relationships from modules models classes
     */
    private function addExtensionModulesRelations()
    {
        $modules = PbxExtensionModules::getEnabledModulesArray();
        foreach ($modules as $module) {
            $moduleDir = PbxExtensionUtils::getModuleDir($module['uniqid']);

            $moduleJson = "{$moduleDir}/module.json";
            if (!file_exists($moduleJson)) {
                continue;
            }
            $jsonString = file_get_contents($moduleJson);
            $jsonModuleDescription = json_decode($jsonString, true);
            $minPBXVersion = $jsonModuleDescription['min_pbx_version'] ?? '1.0.0';
            if (version_compare($minPBXVersion, self::MIN_MODULE_MODEL_VER, '<')) {
                continue;
            }

            $moduleModelsDir = "{$moduleDir}/Models";
            $results = glob($moduleModelsDir . '/*.php', GLOB_NOSORT);
            foreach ($results as $file) {
                $className = pathinfo($file)['filename'];
                $moduleModelClass = "Modules\\{$module['uniqid']}\\Models\\{$className}";

                if (class_exists($moduleModelClass)
                    && method_exists($moduleModelClass, 'getDynamicRelations')) {
                    $moduleModelClass::getDynamicRelations($this);
                }
            }
        }
    }

    /**
     * Sends changed fields and settings to backend worker WorkerModelsEvents
     *
     * @param $action string may be afterSave or afterDelete
     */
    private function processSettingsChanges(string $action): void
    {
        $doNotTrackThisDB = [
            CDRDatabaseProvider::SERVICE_NAME,
        ];

        if (in_array($this->getReadConnectionService(), $doNotTrackThisDB)) {
            return;
        }

        if (!$this->hasSnapshotData()) {
            return;
        } // nothing changed

        $changedFields = $this->getUpdatedFields();
        if (empty($changedFields) && $action === 'afterSave') {
            return;
        }
        if ($action === 'afterDelete') {
            $changedFields = array_keys($this->getSnapshotData());
        }
        $this->sendChangesToBackend($action, $changedFields);
    }

    /**
     * Sends changed fields and class to WorkerModelsEvents
     *
     * @param string $action
     * @param $changedFields
     */
    private function sendChangesToBackend(string $action, $changedFields): void
    {
        // Add changed fields set to Beanstalkd queue
        $queue = $this->di->getShared(BeanstalkConnectionModelsProvider::SERVICE_NAME);
        if ($queue === null) {
            return;
        }
        if ($this instanceof PbxSettings) {
            $idProperty = 'key';
        } else {
            $idProperty = 'id';
        }
        $id = $this->$idProperty;
        $jobData = json_encode(
            [
                'source' => BeanstalkConnectionModelsProvider::SOURCE_MODELS_CHANGED,
                'model' => get_class($this),
                'recordId' => $id,
                'action' => $action,
                'changedFields' => $changedFields,
            ]
        );
        $queue->publish($jobData);
    }

    /**
     * Invalidates cached records contains model name in cache key value
     *
     * @param      $calledClass string full model class name
     *
     */
    public static function clearCache(string $calledClass): void
    {
        $di = Di::getDefault();
        if ($di === null) {
            return;
        }
        if ($di->has(ManagedCacheProvider::SERVICE_NAME)) {
            $managedCache = $di->get(ManagedCacheProvider::SERVICE_NAME);
            $category = explode('\\', $calledClass)[3];
            $keys = $managedCache->getKeys($category);
            $prefix = $managedCache->getPrefix();
            // Delete all items from the managed cache
            foreach ($keys as $key) {
                $cacheKey = str_ireplace($prefix, '', $key);
                $managedCache->delete($cacheKey);
            }
        }
        if ($di->has(ModelsCacheProvider::SERVICE_NAME)) {
            $modelsCache = $di->getShared(ModelsCacheProvider::SERVICE_NAME);
            $category = explode('\\', $calledClass)[3];
            $keys = $modelsCache->getKeys($category);
            $prefix = $modelsCache->getPrefix();
            // Delete all items from the models cache
            foreach ($keys as $key) {
                $cacheKey = str_ireplace($prefix, '', $key);
                $modelsCache->delete($cacheKey);
            }
        }

    }

    /**
     * Error handler for validation failures.
     * This function is called when a model fails to save or delete correctly,
     * or when the dependencies between models are not properly configured.
     * It generates a list of links to the objects that we are trying to delete.
     */
    public function onValidationFails(): void
    {
        $errorMessages = $this->getMessages();
        foreach ($errorMessages as $errorMessage) {
            if ($errorMessage->getType() === 'ConstraintViolation') {
                // Extract the related model name from the error message
                $arrMessageParts = explode('Common\\Models\\', $errorMessage->getMessage());
                if (count($arrMessageParts) === 2) {
                    $relatedModel = $arrMessageParts[1];
                } else {
                    $relatedModel = $errorMessage->getMessage();
                }

                // Get the related records
                $relatedRecords = $this->getRelated($relatedModel);

                // Create a new error message template
                $newErrorMessage = '<div class="ui header">'.$this->t('ConstraintViolation').'</div>';
                $newErrorMessage .= "<ul class='list'>";
                if ($relatedRecords === false) {
                    // Throw an exception if there is an error in the model relationship
                    throw new Model\Exception('Error on models relationship ' . $errorMessage);
                }
                if ($relatedRecords instanceof Resultset) {
                    // If there are multiple related records, iterate through them
                    foreach ($relatedRecords as $item) {
                        if ($item instanceof ModelsBase) {
                            // Append each related record's representation to the error message
                            $newErrorMessage .= '<li>' . $item->getRepresent(true) . '</li>';
                        }
                    }
                } elseif ($relatedRecords instanceof ModelsBase) {
                    // If there is a single related record, append its representation to the error message
                    $newErrorMessage .= '<li>' . $relatedRecords->getRepresent(true) . '</li>';
                } else {
                    // If the related records are of an unknown type, indicate it in the error message
                    $newErrorMessage .= '<li>Unknown object</li>';
                }
                $newErrorMessage .= '</ul>';

                // Set the new error message
                $errorMessage->setMessage($newErrorMessage);
                break;
            }
        }
    }

    /**
     * Function to access the translation array from models.
     * It is used for messages in a user-friendly language.
     *
     * @param $message
     * @param array $parameters
     *
     * @return mixed
     */
    public function t($message, $parameters = [])
    {
        return $this->getDI()->getShared(TranslationProvider::SERVICE_NAME)->t($message, $parameters);
    }

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
                    . " <{$this->extension}>";
                break;
            case ConferenceRooms::class:
                $name = '<i class="phone volume icon"></i> ';
                $name .= empty($this->id)
                    ? $this->t('mo_NewElementConferenceRooms')
                    : $this->t('mo_ConferenceRoomsShort4Dropdown') . ': '
                    . $this->name
                    . " <{$this->extension}>";
                break;
            case CustomFiles::class:
                $name = "<i class='file icon'></i> {$this->filepath}";
                break;
            case DialplanApplications::class:
                $name = '<i class="php icon"></i> ';
                $name .= empty($this->id)
                    ? $this->t('mo_NewElementDialplanApplications')
                    : $this->t('mo_ApplicationShort4Dropdown') . ': '
                    . $this->name
                    . " <{$this->extension}>";
                break;
            case ExtensionForwardingRights::class:
                $name = $this->Extensions->getRepresent();
                break;
            case Extensions::class:
                if ($this->type === Extensions::TYPE_EXTERNAL) {
                    $icon = '<i class="icons"><i class="user outline icon"></i><i class="top right corner alternate mobile icon"></i></i>';
                } else {
                    $icon = '<i class="icons"><i class="user outline icon"></i></i>';
                }
                if (empty($this->id)) {
                    $name = "{$icon} {$this->t('mo_NewElementExtensions')}";
                } elseif ($this->userid > 0) {
                    $name = '';
                    if (isset($this->Users->username)) {
                        $name = $this->trimName($this->Users->username);
                    }
                    $name = "{$icon} {$name} <{$this->number}>";
                } else {
                    switch (strtoupper($this->type)) {
                        case Extensions::TYPE_CONFERENCE:
                            $name = $this->ConferenceRooms->getRepresent();
                            break;
                        case Extensions::TYPE_QUEUE:
                            $name = $this->CallQueues->getRepresent();
                            break;
                        case Extensions::TYPE_DIALPLAN_APPLICATION:
                            $name = $this->DialplanApplications->getRepresent();
                            break;
                        case Extensions::TYPE_IVR_MENU:
                            $name = $this->IvrMenu->getRepresent();
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
                        case Extensions::TYPE_EXTERNAL:
                        case Extensions::TYPE_SIP:
                        default:
                            $name = "{$this->callerid} <{$this->number}>";
                    }
                }
                break;
            case ExternalPhones::class:
                $name = $this->Extensions->getRepresent();
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
                    $name .= "{$this->description} ({$this->t( 'mo_Disabled' )})";
                } else {
                    $name .= $this->description;
                }
                break;
            case IvrMenu::class:
                $name = '<i class="sitemap icon"></i> ';
                $name .= empty($this->id)
                    ? $this->t('mo_NewElementIvrMenu')
                    : $this->t('mo_IVRMenuShort4Dropdown') . ': '
                    . $this->name
                    . " <{$this->extension}>";
                break;
            case IvrMenuActions::class:
                $name = $this->Extensions->getRepresent();
                break;
            case Codecs::class:
                $name = $this->name;
                break;
            case IncomingRoutingTable::class:
                $name = '<i class="map signs icon"></i> ';
                if (empty($this->id)) {
                    $name .= $this->t('mo_NewElementIncomingRoutingTable');
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
                        $date_from = date("d.m.Y", $this->date_from);
                        $represent .= "$date_from";
                        $date_to = date("d.m.Y", $this->date_to)??$date_from;
                        if ($date_from !== $date_to){
                            $represent .= " - $date_to";
                        }
                    }
                    if (!empty($this->weekday_from)) {
                        if (!empty($represent)){
                            $represent.=' ';
                        }
                        $weekday_from = $this->t(date('D',strtotime("Sunday +{$this->weekday_from} days")));
                        $represent .= "<i class='icon outline calendar minus' ></i>";
                        $represent .= "$weekday_from";
                        if (!empty($this->weekday_to) && $this->weekday_from !== $this->weekday_to){
                            $weekday_to = $this->t(date('D',strtotime("Sunday +{$this->weekday_to} days")));
                            $represent .= " - $weekday_to";
                        }
                    }

                    if (!empty($this->time_from)) {
                        if (!empty($represent)){
                            $represent.=' ';
                        }
                        $represent .= "<i class='icon clock outline' ></i>";
                        $represent .= "$this->time_from";
                        if ($this->time_from !== $this->time_to){
                            $represent .= " - $this->time_to";
                        }
                    }
                    $name = $this->t('repOutWorkTimes', ['represent' => $represent]);
                }
                break;
            case Providers::class:
                if ($this->type === "IAX") {
                    $name = $this->Iax->getRepresent();
                } else {
                    $name = $this->Sip->getRepresent();
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
                    $name .= "{$this->description} ({$this->t( 'mo_Disabled' )})";
                } else {
                    $name .= $this->description;
                }

                break;
            case Users::class:
                $name = '<i class="user outline icon"></i> ' . $this->username;
                foreach ($this->Extensions??[] as $extension){
                    if ($extension->type===Extensions::TYPE_SIP){
                        $name .= ' <'.$extension->number.'>';
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
                    'represent' => "<a href='{$link}'>{$name}</a>",
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
     * @param $s
     *
     * @return string
     */
    private function trimName($s): string
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
            case AsteriskManagerUsers::class:
                $link = $this->buildRecordUrl(AsteriskManagersController::class, 'modify',  $this->id);
                break;
            case CallQueueMembers::class:
                $link = $this->buildRecordUrl(CallQueuesController::class, 'modify',  $this->CallQueues->uniqid);
                break;
            case CallQueues::class:
                $link = $this->buildRecordUrl(CallQueuesController::class, 'modify',  $this->uniqid);
                break;
            case ConferenceRooms::class:
                $link = $this->buildRecordUrl(ConferenceRoomsController::class, 'modify',  $this->uniqid);
                break;
            case CustomFiles::class:
                $link = $this->buildRecordUrl(CustomFilesController::class, 'modify',  $this->id);
                break;
            case DialplanApplications::class:
                $link = $this->buildRecordUrl(DialplanApplicationsController::class, 'modify',  $this->uniqid);
                break;
            case ExtensionForwardingRights::class:

                break;
            case Extensions::class:
                $link = $this->buildRecordUrl(ExtensionsController::class, 'modify',  $this->id);
                break;
            case ExternalPhones::class:
                if ( $this->Extensions->is_general_user_number === "1") {
                    $parameters = [
                        'conditions' => 'is_general_user_number="1" AND type="' . Extensions::TYPE_EXTERNAL . '" AND userid=:userid:',
                        'bind' => [
                            'userid' => $this->Extensions->userid,
                        ],
                    ];
                    $needExtension = Extensions::findFirst($parameters);
                    $link = $this->buildRecordUrl(ExtensionsController::class, 'modify', $needExtension->id);
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
                $link = $this->buildRecordUrl(OutOffWorkTimeController::class, 'modify', $this->id);
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
                        $link = $this->buildRecordUrl(ExtensionsController::class, 'modify', $this->Extensions->id);
                    }
                } elseif ($this->Providers) {
                    $link = $this->buildRecordUrl(ProvidersController::class, 'modifysip', $this->Providers->id);
                }
                break;
            case Users::class:
                $parameters = [
                    'conditions' => 'userid=:userid:',
                    'bind' => [
                        'userid' => $this->id,
                    ],
                ];
                $needExtension = Extensions::findFirst($parameters);
                if ($needExtension === null) {
                    $link = $this->buildRecordUrl(ExtensionsController::class, 'index');
                } else {
                    $link = $this->buildRecordUrl(ExtensionsController::class, 'modify', $needExtension->id);
                }
                break;
            case SoundFiles::class:
                $link = $this->buildRecordUrl(SoundFilesController::class, 'modify',$this->id);
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
    private function buildRecordUrl(string $controllerClass, string  $action, string $recordId=''):string
    {
        $url = new Url();
        $baseUri = $this->di->getShared('config')->path('adminApplication.baseUri');
        $controllerParts = explode('\\', $controllerClass);
        $controllerName = end($controllerParts);
        // Remove the "Controller" suffix if present
        $controllerName = str_replace("Controller", "", $controllerName);
        $unCamelizedControllerName = Text::uncamelize($controllerName, '-');
        $link = $url->get("{$unCamelizedControllerName}//{$action}//{$recordId}", null, null, $baseUri);

        return $link;
    }

    /**
     * Fill default values from annotations
     */
    public function beforeValidationOnCreate(): void
    {
        $metaData = $this->di->get(ModelsMetadataProvider::SERVICE_NAME);
        $defaultValues = $metaData->getDefaultValues($this);
        foreach ($defaultValues as $field => $value) {
            if (!isset($this->{$field})) {
                $this->{$field} = $value;
            }
        }
    }

    /**
     * Checks if there are any dependencies that prevent the deletion of the current entity.
     * It displays a list of related entities with links that hinder the deletion.
     *
     * @return bool
     */
    public function beforeDelete(): bool
    {
        return $this->checkRelationsSatisfaction($this, $this);
    }

    /**
     * Check whether this object has unsatisfied relations or not.
     *
     * @param object $theFirstDeleteRecord The first delete record.
     * @param object $currentDeleteRecord  The current delete record.
     *
     * @return bool True if all relations are satisfied, false otherwise.
     */
    private function checkRelationsSatisfaction(object $theFirstDeleteRecord, object $currentDeleteRecord): bool
    {
        $result = true;
        $relations = $currentDeleteRecord->_modelsManager->getRelations(get_class($currentDeleteRecord));
        foreach ($relations as $relation) {
            $foreignKey = $relation->getOption('foreignKey')??[];
            if (!array_key_exists('action', $foreignKey)) {
                continue;
            }
            // Check if there are some record which restrict delete current record
            $relatedModel = $relation->getReferencedModel();
            $mappedFields = $relation->getFields();
            $mappedFields = is_array($mappedFields)
                ? $mappedFields : [$mappedFields];
            $referencedFields = $relation->getReferencedFields();
            $referencedFields = is_array($referencedFields)
                ? $referencedFields : [$referencedFields];
            $parameters['conditions'] = '';
            $parameters['bind'] = [];
            foreach ($referencedFields as $index => $referencedField) {
                $parameters['conditions'] .= $index > 0
                    ? ' OR ' : '';
                $parameters['conditions'] .= $referencedField
                    . '= :field'
                    . $index . ':';
                $bindField
                    = $mappedFields[$index];
                $parameters['bind']['field' . $index] = $currentDeleteRecord->$bindField;
            }
            $relatedRecords = $relatedModel::find($parameters);
            switch ($foreignKey['action']) {
                case Relation::ACTION_RESTRICT:
                    // Restrict deletion and add message about unsatisfied undeleted links
                    foreach ($relatedRecords as $relatedRecord) {
                        if (serialize($relatedRecord) === serialize($theFirstDeleteRecord)
                            || serialize($relatedRecord) === serialize($currentDeleteRecord)
                        ) {
                            continue;
                            // It is the checked object
                        }
                        $message = new Message(
                            $theFirstDeleteRecord->t(
                                'mo_BeforeDeleteFirst',
                                [
                                    'represent' => $relatedRecord->getRepresent(true),
                                ]
                            )
                        );
                        $theFirstDeleteRecord->appendMessage($message);
                        $result = false;
                    }
                    break;
                case Relation::ACTION_CASCADE:
                    // Delete all related records
                    foreach ($relatedRecords as $relatedRecord) {
                        if (serialize($relatedRecord) === serialize($theFirstDeleteRecord)
                            || serialize($relatedRecord) === serialize($currentDeleteRecord)
                        ) {
                            continue;
                            // It is the checked object
                        }
                        $result = $result && $relatedRecord->checkRelationsSatisfaction(
                                $theFirstDeleteRecord,
                                $relatedRecord
                            );
                        if ($result) {
                            $result = $relatedRecord->delete();
                        }
                        if ($result === false) {
                            $messages = $relatedRecord->getMessages();
                            foreach ($messages as $message) {
                                $theFirstDeleteRecord->appendMessage($message);
                            }
                        }
                    }
                    break;
                case Relation::NO_ACTION:
                    // Clear all refs
                    break;
                default:
                    break;
            }
        }

        return $result;
    }

    /**
     * Returns Identity field name for current model
     *
     * @return string
     */
    public function getIdentityFieldName(): string
    {
        $metaData = $this->di->get(ModelsMetadataProvider::SERVICE_NAME);

        return $metaData->getIdentityField($this);
    }

    /**
     * Generates a random unique id.
     *
     * @return string The generated unique id.
     */
    public static function generateUniqueID(string $alias=''):string
    {
        $random = new Random();
        $hashLength = 4;
        try {
            $hash = $random->hex($hashLength);
        } catch (\Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            $hash = md5(microtime());
        }
        return $alias . strtoupper($hash);
    }
}