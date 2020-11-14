<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 6 2020
 */

namespace MikoPBX\Common\Models;

use MikoPBX\AdminCabinet\Plugins\CacheCleanerPlugin;
use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Modules\PbxExtensionUtils;
use Phalcon\Db\Adapter\AdapterInterface;
use Phalcon\Di;
use Phalcon\Messages\Message;
use Phalcon\Messages\MessageInterface;
use Phalcon\Mvc\Model;
use Phalcon\Mvc\Model\Relation;
use Phalcon\Mvc\Model\Resultset;
use Phalcon\Mvc\Model\Resultset\Simple;
use Phalcon\Mvc\Model\ResultsetInterface;
use Phalcon\Text;
use Phalcon\Url;
use Pheanstalk\Contract\PheanstalkInterface;

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
 * @property \Phalcon\Mvc\Model\Manager _modelsManager
 * @property \Phalcon\Di                di
 *
 * @package MikoPBX\Common\Models
 */
abstract class ModelsBase extends Model
{
    /**
     * All models with lover than this version in module.json won't be attached as children
     */
    public const MIN_MODULE_MODEL_VER = '2020.2.468';

    public function initialize(): void
    {
        self::setup(['orm.events' => true]);
        $this->keepSnapshots(true);
        $this->addExtensionModulesRelations();
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
            if ( ! file_exists($moduleJson)) {
                continue;
            }
            $jsonString            = file_get_contents($moduleJson);
            $jsonModuleDescription = json_decode($jsonString, true);
            $minPBXVersion         = $jsonModuleDescription['min_pbx_version'] ?? '1.0.0';
            if (version_compare($minPBXVersion, self::MIN_MODULE_MODEL_VER, '<')) {
                continue;
            }

            $moduleModelsDir = "{$moduleDir}/Models";
            $results         = glob($moduleModelsDir . '/*.php', GLOB_NOSORT);
            foreach ($results as $file) {
                $className        = pathinfo($file)['filename'];
                $moduleModelClass = "\\Modules\\{$module['uniqid']}\\Models\\{$className}";

                if (class_exists($moduleModelClass)
                    && method_exists($moduleModelClass, 'getDynamicRelations')) {
                    $moduleModelClass::getDynamicRelations($this);
                }
            }
        }
    }


    /**
     * Обработчик ошибок валидации, обычно сюда попадаем если неправильно
     * сохраняются или удаляютмя модели или неправильно настроены зависимости между ними.
     * Эта функция формирует список ссылок на объект который мы пытаемся удалить
     *
     */
    public function onValidationFails(): void
    {
        $errorMessages = $this->getMessages();
        foreach ($errorMessages as $errorMessage) {
            if ($errorMessage->getType() === 'ConstraintViolation') {
                $arrMessageParts = explode('Common\\Models\\', $errorMessage->getMessage());
                if (count($arrMessageParts) === 2) {
                    $relatedModel = $arrMessageParts[1];
                } else {
                    $relatedModel = $errorMessage->getMessage();
                }
                $relatedRecords  = $this->getRelated($relatedModel);
                $newErrorMessage = $this->t('ConstraintViolation');
                $newErrorMessage .= "<ul class='list'>";
                if ($relatedRecords === false) {
                    throw new Model\Exception('Error on models relationship ' . $errorMessage);
                }
                if ($relatedRecords instanceof Resultset) {
                    foreach ($relatedRecords as $item) {
                        if ($item instanceof ModelsBase) {
                            $newErrorMessage .= '<li>' . $item->getRepresent(true) . '</li>';
                        }
                    }
                } elseif ($relatedRecords instanceof ModelsBase) {
                    $newErrorMessage .= '<li>' . $relatedRecords->getRepresent(true) . '</li>';
                } else {
                    $newErrorMessage .= '<li>Unknown object</li>';
                }
                $newErrorMessage .= '</ul>';
                $errorMessage->setMessage($newErrorMessage);
                break;
            }
        }
    }

    /**
     * Функция для доступа к массиву переводов из моделей, используется для
     * сообщений на понятном пользователю языке
     *
     * @param       $message
     * @param array $parameters
     *
     * @return mixed
     */
    public function t($message, $parameters = [])
    {
        return $this->getDI()->getShared('translation')->t($message, $parameters);
    }

    /**
     * Returns a model's element representation
     *
     * @param bool $needLink add link to element
     *
     * @return string
     */
    public function getRepresent($needLink = false): string
    {
        switch (static::class) {
            case AsteriskManagerUsers::class:
                $name = '<i class="asterisk icon"></i> ';
                if (empty($this->id)) {
                    $name .= $this->t('mo_NewElementAsteriskManagerUsers');
                } else {
                    $name .= $this->t('repAsteriskManagerUsers', ['represent' => $this->username]);
                }
                break;
            case CallQueueMembers::class:
                $name = $this->Extensions->getRepresent();
                break;
            case CallQueues::class:
                $name = '<i class="users icon"></i> ';
                if (empty($this->id)) {
                    $name .= $this->t('mo_NewElementCallQueues');
                } else {
                    $name .= $this->t('mo_CallQueueShort4Dropdown') . ': ' . $this->name;
                }
                break;
            case ConferenceRooms::class:
                $name = '<i class="phone volume icon"></i> ';
                if (empty($this->id)) {
                    $name .= $this->t('mo_NewElementConferenceRooms');
                } else {
                    $name .= $this->t('mo_ConferenceRoomsShort4Dropdown') . ': ' . $this->name;
                }
                break;
            case CustomFiles::class:
                $name = "<i class='file icon'></i> {$this->filepath}";
                break;
            case DialplanApplications::class:
                $name = '<i class="php icon"></i> ';
                if (empty($this->id)) {
                    $name .= $this->t('mo_NewElementDialplanApplications');
                } else {
                    $name .= $this->t('mo_ApplicationShort4Dropdown') . ': ' . $this->name;
                }
                break;
            case ExtensionForwardingRights::class:
                $name = $this->Extensions->getRepresent();
                break;
            case Extensions::class:
                // Для внутреннего номера бывают разные представления
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
                if (empty($this->id)) {
                    $name .= $this->t('mo_NewElementIvrMenu');
                } else {
                    $name .= $this->t('mo_IVRMenuShort4Dropdown') . ': ' . $this->name;
                }
                break;
            case IvrMenuActions::class:
                $name = $this->IvrMenu->name;
                break;
            case Codecs::class:
                $name = $this->name;
                break;
            case IncomingRoutingTable::class:
                $name = '<i class="map signs icon"></i> ';
                if (empty($this->id)) {
                    $name .= $this->t('mo_NewElementIncomingRoutingTable');
                } elseif ( ! empty($this->note)) {
                    $name .= $this->t('repIncomingRoutingTable', ['represent' => $this->note]);
                } else {
                    $name .= $this->t('repIncomingRoutingTableNumber', ['represent' => $this->id]);
                }
                break;
            case LanInterfaces::class:
                // LanInterfaces
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
                } elseif ( ! empty($this->rulename)) {
                    $name .= $this->t('repOutgoingRoutingTable', ['represent' => $this->rulename]);
                } else {
                    $name .= $this->t('repOutgoingRoutingTableNumber', ['represent' => $this->id]);
                }
                break;
            case OutWorkTimes::class:
                $name = '<i class="time icon"></i> ';
                if (empty($this->id)) {
                    $name .= $this->t('mo_NewElementOutWorkTimes');
                } elseif ( ! empty($this->description)) {
                    $name .= $this->t('repOutWorkTimes', ['represent' => $this->description]);
                } else {
                    $represent = '';
                    if (is_numeric($this->date_from)) {
                        $represent .= date("d/m/Y", $this->date_from) . '-';
                    }
                    if (is_numeric($this->date_to)) {
                        $represent .= date("d/m/Y", $this->date_to) . ' ';
                    }
                    if (isset($this->weekday_from)) {
                        $represent .= $this->t(date('D', strtotime("Sunday +{$this->weekday_from} days"))) . '-';
                    }
                    if (isset($this->weekday_to)) {
                        $represent .= $this->t(date('D', strtotime("Sunday +{$this->weekday_to} days"))) . ' ';
                    }
                    if (isset($this->time_from) || isset($this->time_to)) {
                        $represent .= $this->time_from . ' - ' . $this->time_to . ' ';
                    }
                    $name .= $this->t('repOutWorkTimes', ['represent' => $represent]);
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
                break;
            case SoundFiles::class:
                $name = '<i class="file audio outline icon"></i> ';
                if (empty($this->id)) {
                    $name .= $this->t('mo_NewElementSoundFiles');
                } else {
                    $name .= $this->t('repSoundFiles', ['represent' => $this->name]);
                }

                break;
            default:
                $name = 'Unknown';
        }

        if ($needLink) {
            $link     = $this->getWebInterfaceLink();
            $category = explode('\\', static::class)[3];
            $result   = $this->t(
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
     * Укорачивает длинные имена
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
            $s      = substr($s, 0, strrpos($s, ' ', $offset)) . '...';
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
        $url = new Url();

        $baseUri = $this->di->getShared('config')->path('adminApplication.baseUri');
        $link    = '#';
        switch (static::class) {
            case AsteriskManagerUsers::class:
                $link = $url->get('asterisk-managers/modify/' . $this->id, null, null, $baseUri);
                break;
            case CallQueueMembers::class:
                $link = $url->get('call-queues/modify/' . $this->CallQueues->uniqid, null, null, $baseUri);
                break;
            case CallQueues::class:
                $link = $url->get('call-queues/modify/' . $this->uniqid, null, null, $baseUri);
                break;
            case ConferenceRooms::class:
                $link = $url->get('conference-rooms/modify/' . $this->uniqid, null, null, $baseUri);
                break;
            case CustomFiles::class:
                $link = $url->get('custom-files/modify/' . $this->id, null, null, $baseUri);
                break;
            case DialplanApplications::class:
                $link = $url->get('dialplan-applications/modify/' . $this->uniqid, null, null, $baseUri);
                break;
            case ExtensionForwardingRights::class:

                break;
            case Extensions::class:
                $link = $url->get('extensions/modify/' . $this->id, null, null, $baseUri);
                break;
            case ExternalPhones::class:
                if ($this->Extensions->is_general_user_number === "1") {
                    $parameters    = [
                        'conditions' => 'is_general_user_number="1" AND type="' . Extensions::TYPE_EXTERNAL . '" AND userid=:userid:',
                        'bind'       => [
                            'userid' => $this->Extensions->userid,
                        ],
                    ];
                    $needExtension = Extensions::findFirst($parameters);
                    $link          = $url->get('extensions/modify/' . $needExtension->id, null, null, $baseUri);
                } else {
                    $link = '#';//TODO сделать если будет раздел для допоплнинельных номеров пользователя
                }
                break;
            case Fail2BanRules::class:
                $link = '#';//TODO сделать если будет fail2ban
                break;
            case FirewallRules::class:
                $link = $url->get('firewall/modify/' . $this->NetworkFilters->id, null, null, $baseUri);
                break;
            case Iax::class:
                $link = $url->get('providers/modifyiax/' . $this->Providers->id, null, null, $baseUri);
                break;
            case IvrMenu::class:
                $link = $url->get('ivr-menu/modify/' . $this->uniqid, null, null, $baseUri);
                break;
            case IvrMenuActions::class:
                $link = $url->get('ivr-menu/modify/' . $this->IvrMenu->uniqid, null, null, $baseUri);
                break;
            case Codecs::class:
                break;
            case IncomingRoutingTable::class:
                $link = $url->get('incoming-routes/modify/' . $this->id, null, null, $baseUri);
                break;
            case LanInterfaces::class:
                $link = $url->get('network/index/', null, null, $baseUri);
                break;
            case NetworkFilters::class:
                $link = $url->get('firewall/modify/' . $this->id, null, null, $baseUri);
                break;
            case OutgoingRoutingTable::class:
                $link = $url->get('outbound-routes/modify/' . $this->id, null, null, $baseUri);
                break;
            case OutWorkTimes::class:
                $link = $url->get('out-off-work-time/modify/' . $this->id, null, null, $baseUri);
                break;
            case Providers::class:
                if ($this->type === "IAX") {
                    $link = $url->get('providers/modifyiax/' . $this->uniqid, null, null, $baseUri);
                } else {
                    $link = $url->get('providers/modifysip/' . $this->uniqid, null, null, $baseUri);
                }
                break;
            case PbxSettings::class:
                $link = $url->get('general-settings/index');
                break;
            case PbxExtensionModules::class:
                $link = $url->get(Text::uncamelize($this->uniqid), null, null, $baseUri);
                break;
            case Sip::class:
                if ($this->Extensions) { // Это внутренний номер?
                    if ($this->Extensions->is_general_user_number === "1") {
                        $link = $url->get('extensions/modify/' . $this->Extensions->id, null, null, $baseUri);
                    } else {
                        $link = '#';//TODO сделать если будет раздел для допоплнинельных номеров пользователя
                    }
                } elseif ($this->Providers) { // Это провайдер
                    $link = $url->get('providers/modifysip/' . $this->Providers->id, null, null, $baseUri);
                }
                break;
            case Users::class:
                $parameters    = [
                    'conditions' => 'userid=:userid:',
                    'bind'       => [
                        'userid' => $this->id,
                    ],
                ];
                $needExtension = Extensions::findFirst($parameters);
                $link          = $url->get('extensions/modify/' . $needExtension->id, null, null, $baseUri);
                break;
            case SoundFiles::class:
                $link = $url->get('sound-files/modify/' . $this->id, null, null, $baseUri);
                break;
            default:
        }

        return $link;
    }

    /**
     * Fill default values from annotations
     */
    public function beforeValidationOnCreate(): void
    {
        $metaData      = $this->di->get('modelsMetadata');
        $defaultValues = $metaData->getDefaultValues($this);
        foreach ($defaultValues as $field => $value) {
            if ( ! isset($this->{$field})) {
                $this->{$field} = $value;
            }
        }
    }

    /**
     * Функция позволяет вывести список зависимостей с сылками,
     * которые мешают удалению текущей сущности
     *
     * @return bool
     */
    public function beforeDelete(): bool
    {
        return $this->checkRelationsSatisfaction($this, $this);
    }

    /**
     *  Check whether this object has unsatisfied relations or not
     *
     * @param $theFirstDeleteRecord
     * @param $currentDeleteRecord
     *
     * @return bool
     */
    private function checkRelationsSatisfaction($theFirstDeleteRecord, $currentDeleteRecord): bool
    {
        //     /**
        //      * Get the models manager
        //      */
        //     $manager = $currentDeleteRecord->modelsManager;
        //
        //     /**
        //      * We check if some of the hasOne/hasMany relations is a foreign key
        //      */
        //     $relations = $manager->getHasOneAndHasMany($currentDeleteRecord);
        //
        //     $error = false;
        //
        //     foreach ($relations as $relation) {
        //         /**
        //          * Check if the relation has a virtual foreign key
        //          */
        //         $foreignKey = $relation->getForeignKey();
        //
        //         if ($foreignKey === false) {
        //             continue;
        //         }
        //
        //         /**
        //          * By default action is restrict
        //          */
        //         $action = Relation::ACTION_RESTRICT;
        //
        //         /**
        //          * Try to find a different action in the foreign key's options
        //          */
        //         if (is_array($foreignKey) && isset($foreignKey['action'])) {
        //             $action = (int)$foreignKey['action'];
        //         }
        //
        //         /**
        //          * Check only if the operation is restrict
        //          */
        //         if ($action !== Relation::ACTION_RESTRICT) {
        //             continue;
        //         }
        //
        //         $relationClass = $relation->getReferencedModel();
        //
        //         /**
        //          * Load a plain instance from the models manager
        //          */
        //         $referencedModel = $manager->load($relationClass);
        //
        //         $fields           = $relation->getFields();
        //         $referencedFields = $relation->getReferencedFields();
        //
        //         /**
        //          * Create the checking conditions. A relation can has many fields or
        //          * a single one
        //          */
        //         $conditions = [];
        //         $bindParams = [];
        //
        //         if (is_array($fields)) {
        //             foreach ($fields as $position => $field) {
        //                 $value        = $currentDeleteRecord->readAttribute($field);
        //                 $conditions[] = "[" . $referencedFields[$position] . "] = ?" . $position;
        //                 $bindParams[] = $value;
        //             }
        //         } else {
        //             $value        = $currentDeleteRecord->readAttribute($fields);
        //             $conditions[] = "[" . $referencedFields . "] = ?0";
        //             $bindParams[] = $value;
        //         }
        //
        //         /**
        //          * We don't trust the actual values in the object and then we're
        //          * passing the values using bound parameters
        //          * Let's make the checking
        //          */
        //         if ($referencedModel->count([join(" AND ", $conditions), "bind" => $bindParams])) {
        //             /**
        //              * Create a message
        //              */
        //             $this->appendMessage(
        //                 new Message(
        //                     $theFirstDeleteRecord->t(
        //                         'mo_BeforeDeleteFirst',
        //                         [
        //                             'represent' => $relationClass->getRepresent(true),
        //                         ]
        //                     ),
        //                     $fields,
        //                     "ConstraintViolationBeforeDelete"
        //                 )
        //             );
        //
        //             $error = true;
        //
        //             break;
        //         }
        //     }
        //
        //     return ! $error;
        // }
        //

        $result = true;
        $relations
                = $currentDeleteRecord->_modelsManager->getRelations(get_class($currentDeleteRecord));
        foreach ($relations as $relation) {
            $foreignKey = $relation->getOption('foreignKey');
            if ( ! array_key_exists('action', $foreignKey)) {
                continue;
            }
            // Check if there are some record which restrict delete current record
            $relatedModel             = $relation->getReferencedModel();
            $mappedFields             = $relation->getFields();
            $mappedFields             = is_array($mappedFields)
                ? $mappedFields : [$mappedFields];
            $referencedFields         = $relation->getReferencedFields();
            $referencedFields         = is_array($referencedFields)
                ? $referencedFields : [$referencedFields];
            $parameters['conditions'] = '';
            $parameters['bind']       = [];
            foreach ($referencedFields as $index => $referencedField) {
                $parameters['conditions']             .= $index > 0
                    ? ' OR ' : '';
                $parameters['conditions']             .= $referencedField
                    . '= :field'
                    . $index . ':';
                $bindField
                                                      = $mappedFields[$index];
                $parameters['bind']['field' . $index] = $currentDeleteRecord->$bindField;
            }
            $relatedRecords = $relatedModel::find($parameters);
            switch ($foreignKey['action']) {
                case Relation::ACTION_RESTRICT: // Restrict deletion and add message about unsatisfied undeleted links
                    foreach ($relatedRecords as $relatedRecord) {
                        if (serialize($relatedRecord) === serialize($theFirstDeleteRecord)
                            || serialize($relatedRecord) === serialize($currentDeleteRecord)
                        ) {
                            continue; // It is checked object
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
                case Relation::ACTION_CASCADE: // Удалим все зависимые записи
                    foreach ($relatedRecords as $relatedRecord) {
                        if (serialize($relatedRecord) === serialize($theFirstDeleteRecord)
                            || serialize($relatedRecord) === serialize($currentDeleteRecord)
                        ) {
                            continue; // It is checked object
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
                case Relation::NO_ACTION: // Clear all refs
                    break;
                default:
                    break;
            }
        }

        return $result;
    }

    /**
     * After save processor
     */
    public function afterSave(): void
    {
        $this->processSettingsChanges('afterSave');
        self::clearCache(static::class);
    }

    /**
     * Sends changed fields and settings to backend worker WorkerModelsEvents
     *
     * @param $action string may be afterSave or afterDelete
     */
    private function processSettingsChanges(string $action): void
    {
        if (php_sapi_name() === 'cli') {
            return;
        }
        if ( ! $this->hasSnapshotData()) {
            return;
        } // nothing changed

        $changedFields = $this->getUpdatedFields();
        if (empty($changedFields) && $action === 'afterSave') {
            return;
        }

        $this->sendChangesToBackend($action, $changedFields);
    }

    /**
     * Sends changed fileds and class to WorkerModelsEvents
     *
     * @param $action
     * @param $changedFields
     */
    private function sendChangesToBackend($action, $changedFields): void
    {
        // Add changed fields set to Beanstalkd queue
        $queue = $this->di->getShared('beanstalkConnection');

        if ($this instanceof PbxSettings) {
            $idProperty = 'key';
        } else {
            $idProperty = 'id';
        }
        $id      = $this->$idProperty;
        $jobData = json_encode(
            [
                'model'         => get_class($this),
                'recordId'      => $id,
                'action'        => $action,
                'changedFields' => $changedFields,
            ]
        );
        $queue->publish($jobData);
    }

    /**
     * Invalidates cached records contains model name in cache key value
     *
     * @param      $calledClass string full model class name
     * @param bool $needClearFrontedCache
     */
    public static function clearCache(string $calledClass, bool $needClearFrontedCache = true): void
    {
        $di = Di::getDefault();
        if ($di === null) {
            return;
        }
        if ($di->has('managedCache')) {
            $managedCache = $di->getShared('managedCache');
            $category     = explode('\\', $calledClass)[3];
            $keys         = $managedCache->getAdapter()->getKeys($category);
            $prefix = $managedCache->getAdapter()->getPrefix();
            // Delete all items from the cache
            foreach ($keys as $key) {
                $unPrefixedKey = str_ireplace($prefix, '', $key);
                $managedCache->delete($unPrefixedKey);
            }
        }
        if ($di->has('modelsCache')) {
            $modelsCache = $di->getShared('modelsCache');
            $category    = explode('\\', $calledClass)[3];
            $keys        = $modelsCache->getAdapter()->getKeys($category);
            $prefix = $modelsCache->getAdapter()->getPrefix();
            // Delete all items from the cache
            foreach ($keys as $key) {
                $unPrefixedKey = str_ireplace($prefix, '', $key);
                $modelsCache->delete($unPrefixedKey);
            }
        }
        if ($needClearFrontedCache
            && php_sapi_name() === 'cli'
            && $di->getShared('registry')->booting!==true
        ) {
            $client = new BeanstalkClient();
            $client->publish(
                $calledClass,
                CacheCleanerPlugin::class,
                PheanstalkInterface::DEFAULT_PRIORITY,
                PheanstalkInterface::DEFAULT_DELAY,
                3600
            );
        }
    }

    /**
     * После удаления данных любой модели
     */
    public function afterDelete(): void
    {
        $this->processSettingsChanges('afterDelete');
        self::clearCache(static::class);
    }

    /**
     * Returns Identity field name for current model
     *
     * @return string
     */
    public function getIdentityFieldName(): string
    {
        $metaData = $this->di->get('modelsMetadata');

        return $metaData->getIdentityField($this);
    }
}