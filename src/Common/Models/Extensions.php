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

namespace MikoPBX\Common\Models;

use Phalcon\Mvc\Model\Relation;
use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * Class Extensions
 *
 * @property \MikoPBX\Common\Models\Sip                       Sip
 * @property \MikoPBX\Common\Models\Users                     Users
 * @property \MikoPBX\Common\Models\ExternalPhones            ExternalPhones
 * @property \MikoPBX\Common\Models\DialplanApplications      DialplanApplications
 * @property \MikoPBX\Common\Models\ConferenceRooms           ConferenceRooms
 * @property \MikoPBX\Common\Models\CallQueues                CallQueues
 * @property \MikoPBX\Common\Models\OutWorkTimes              OutWorkTimes
 * @property \MikoPBX\Common\Models\IvrMenu                   IvrMenu
 * @property \MikoPBX\Common\Models\ExtensionForwardingRights ExtensionForwardingRights
 *
 *
 * @method static mixed findFirstByNumber(string|null $number)
 * @method static mixed findByUserid(int $userid)
 *
 * @package MikoPBX\Common\Models
 */
class Extensions extends ModelsBase
{

    public const  TYPE_DIALPLAN_APPLICATION = 'DIALPLAN APPLICATION';
    public const  TYPE_SIP = 'SIP';
    public const  TYPE_QUEUE = 'QUEUE';
    public const  TYPE_EXTERNAL = 'EXTERNAL';
    public const  TYPE_IVR_MENU = 'IVR MENU';
    public const  TYPE_CONFERENCE = 'CONFERENCE';
    public const  TYPE_MODULES = 'MODULES';
    public const  TYPE_SYSTEM = 'SYSTEM';

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Внутренний номер или шаблон внутреннего номера
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $number = '';

    /**
     * Тип внутреннего номера
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $type = '';

    /**
     * Caller id для номера
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $callerid = '';

    /**
     * Ссылка на таблицу пользователей, может быть NULL, если это не пользоваетель
     *
     * @Column(type="integer", nullable=true)
     */
    public ?int $userid = null;

    /**
     * Признак отображения в телефонной книге, и при выборе в списках
     * @Column(type="string", length=1, nullable=true, default="1")
     */
    public ?string $show_in_phonebook = '1';

    /**
     * Признак возможности донабора этого номера звонящим из вне
     *
     * @Column(type="string", length=1, nullable=true, default="1")
     */
    public ?string $public_access = '1';

    /**
     * Признак основного номера пользователя, который редактируется в его карточке
     *
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $is_general_user_number = "0";


    /**
     * Получает из базы следующий за последним введенным системным номером
     */
    public static function getNextFreeApplicationNumber(): string
    {
        $parameters = [
            'columns' => 'number',
        ];
        $result     = self::find($parameters)->toArray();

        $freeExtension = '2200100';
        for ($i = 100; ; $i++) {
            $freeExtension = "2200{$i}";
            if ( ! in_array(['number' => $freeExtension], $result, false)) {
                break;
            }
        }

        return $freeExtension;
    }

    /**
     * Настройка статических отношений, также возможны динамические из модулей расширений
     */
    public function initialize(): void
    {
        $this->setSource('m_Extensions');
        parent::initialize();
        $this->belongsTo(
            'userid',
            Users::class,
            'id',
            [
                'alias'      => 'Users',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );
        $this->hasOne(
            'number',
            Sip::class,
            'extension',
            [
                'alias'      => 'Sip',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE,
                ],
            ]
        );
        $this->hasOne(
            'number',
            ExternalPhones::class,
            'extension',
            [
                'alias'      => 'ExternalPhones',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE,
                ],
            ]
        );
        $this->hasOne(
            'number',
            DialplanApplications::class,
            'extension',
            [
                'alias'      => 'DialplanApplications',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE // DialplanApplications всегда удаляем через его Extension
                ],
            ]
        );
        $this->hasOne(
            'number',
            ConferenceRooms::class,
            'extension',
            [
                'alias'      => 'ConferenceRooms',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE // ConferenceRooms всегда удаляем через его Extension
                ],
            ]
        );

        $this->hasOne(
            'number',
            CallQueues::class,
            'extension',
            [
                'alias'      => 'CallQueues',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE // CallQueues всегда удаляем через его Extension
                ],
            ]
        );
        $this->hasMany(
            'number',
            CallQueues::class,
            'timeout_extension',
            [
                'alias'      => 'CallQueueRedirectRightsTimeout',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'CallQueueRedirectRightsTimeout',
                    'action'     => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasMany(
            'number',
            CallQueues::class,
            'redirect_to_extension_if_empty',
            [
                'alias'      => 'CallQueueRedirectRightsIfEmpty',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'CallQueueRedirectRightsIfEmpty',
                    'action'     => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasMany(
            'number',
            CallQueues::class,
            'redirect_to_extension_if_unanswered',
            [
                'alias'      => 'CallQueueRedirectRightsIfUnanswered',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'CallQueueRedirectRightsIfUnanswered',
                    'action'     => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasMany(
            'number',
            CallQueues::class,
            'redirect_to_extension_if_repeat_exceeded',
            [
                'alias'      => 'CallQueueRedirectRightsIfRepeatExceeded',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'CallQueueRedirectRightsIfRepeatExceeded',
                    'action'     => Relation::ACTION_RESTRICT,
                ],
            ]
        );

        $this->hasMany(
            'number',
            CallQueueMembers::class,
            'extension',
            [
                'alias'      => 'CallQueueMembers',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE,
                ],
            ]
        );
        $this->hasMany(
            'number',
            IncomingRoutingTable::class,
            'extension',
            [
                'alias'      => 'IncomingRoutingTable',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_RESTRICT,
                ],
                'params'     => [
                    'order' => 'priority asc',
                ],
            ]
        );
        $this->hasMany(
            'number',
            OutWorkTimes::class,
            'extension',
            [
                'alias'      => 'OutWorkTimes',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasOne(
            'number',
            ExtensionForwardingRights::class,
            'extension',
            [
                'alias'      => 'ExtensionForwardingRights',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE,
                ],
            ]
        );

        $this->hasMany(
            'number',
            ExtensionForwardingRights::class,
            'forwarding',
            [
                'alias'      => 'ExtensionForwardingRightsForwarding',
                'foreignKey' => [
                    'allowNulls' => false,
                    'message'    => 'ExtensionForwardingRightsForwarding',
                    'action'     => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasMany(
            'number',
            ExtensionForwardingRights::class,
            'forwardingonbusy',
            [
                'alias'      => 'ExtensionForwardingRightsForwardingOnBusy',
                'foreignKey' => [
                    'allowNulls' => false,
                    'message'    => 'ExtensionForwardingRightsForwardingOnBusy',
                    'action'     => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasMany(
            'number',
            ExtensionForwardingRights::class,
            'forwardingonunavailable',
            [
                'alias'      => 'ExtensionForwardingRightsOnUnavailable',
                'foreignKey' => [
                    'allowNulls' => false,
                    'message'    => 'ExtensionForwardingRightsOnUnavailable',
                    'action'     => Relation::ACTION_RESTRICT,
                ],
            ]
        );

        $this->hasOne(
            'number',
            IvrMenu::class,
            'extension',
            [
                'alias'      => 'IvrMenu',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE // IVR меню удаляем через его Extension
                ],
            ]
        );

        $this->hasMany(
            'number',
            IvrMenu::class,
            'timeout_extension',
            [
                'alias'      => 'IvrMenuTimeout',
                'foreignKey' => [
                    'message'    => 'IvrMenuTimeout',
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_RESTRICT
                    // Запретим удалять внутренний номер если он используется в IVR меню
                ],
            ]
        );

        $this->hasMany(
            'number',
            IvrMenuActions::class,
            'extension',
            [
                'alias'      => 'IvrMenuActions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_RESTRICT
                    // Запретим удалять внутренний номер если он используется в IVR меню
                ],
            ]
        );
    }

    /**
     * Обработчики после обновления данных модели
     */
    public function afterUpdate(): void
    {
        $updatedFields = $this->getUpdatedFields();
        if (is_array($updatedFields) && in_array('number', $updatedFields, false)) {
            $this->updateRelationshipsNumbers();
        }
    }

    /**
     * Обновляет номера во всех связанных таблицах при имзенении номера Extensions
     */
    private function updateRelationshipsNumbers(): void
    {
        $snapShotData = $this->getOldSnapshotData();
        if (empty($snapShotData)) {
            return;
        }
        $relations = $this->_modelsManager->getRelations(__CLASS__);
        foreach ($relations as $relation) {
            if ($relation->getFields() === 'number'
                ||
                (
                    is_array($relation->getFields())
                    && in_array('number', $relation->getFields(), true)
                )
            ) {
                $referencedFields = $relation->getReferencedFields();
                $relatedModel     = $relation->getReferencedModel();
                $referencedFields = is_array($referencedFields) ? $referencedFields : [$referencedFields];
                foreach ($referencedFields as $referencedField) {
                    $parameters     = [
                        'conditions' => $referencedField . '= :oldNumber:',
                        'bind'       => ['oldNumber' => $snapShotData['number']],
                    ];
                    $relatedRecords = call_user_func([$relatedModel, 'find'], $parameters);
                    foreach ($relatedRecords as $relatedRecord) {
                        $relatedRecord->$referencedField = $this->number;
                        $relatedRecord->save();
                    }
                }
            }
        }
    }

    /**
     * Валидация уникальности номера
     *
     * @return bool
     */
    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add(
            'number',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisNumberNotUniqueForExtensionsModels'),
                ]
            )
        );

        return $this->validate($validation);
    }

    /**
     * Возвращает ссылки на текущую запись
     *
     * @return array - массив ссылок
     */
    public function getRelatedLinks(): array
    {
        $result    = [];
        $relations = $this->_modelsManager->getRelations(__CLASS__);
        foreach ($relations as $relation) {
            $relationFields = $relation->getFields();
            if ($relationFields === 'number'
                ||
                (
                    is_array($relationFields)
                    && in_array('number', $relationFields, true)
                )
            ) {
                $referencedFields = $relation->getReferencedFields();
                $relatedModel     = $relation->getReferencedModel();
                $referencedFields = is_array($referencedFields) ? $referencedFields : [$referencedFields];
                foreach ($referencedFields as $referencedField) {
                    $parameters     = [
                        'conditions' => $referencedField . '= :Number:',
                        'bind'       => ['Number' => $this->number],
                    ];
                    $relatedRecords = call_user_func([$relatedModel, 'find'], $parameters);
                    foreach ($relatedRecords as $relatedRecord) {
                        $result[] = [
                            'object'         => $relatedRecord,
                            'referenceField' => $referencedField,
                        ];
                    }
                }
            }
        }

        return $result;
    }


}