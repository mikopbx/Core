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

use Phalcon\Mvc\Model\Relation;
use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * Class Extensions
 *
 * @property Sip Sip
 * @property Users Users
 * @property ExternalPhones ExternalPhones
 * @property DialplanApplications DialplanApplications
 * @property ConferenceRooms ConferenceRooms
 * @property CallQueues CallQueues
 * @property OutWorkTimes OutWorkTimes
 * @property IvrMenu IvrMenu
 * @property ExtensionForwardingRights ExtensionForwardingRights
 *
 *
 * @method static mixed findFirstByNumber(string|null $number)
 * @method static mixed findByType(string|null $type)
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
    public const  TYPE_PARKING = 'PARKING';

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Internal number or internal number pattern
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $number = '';

    /**
     * Type of the internal number
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $type = '';

    /**
     * Caller ID for the number
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $callerid = '';

    /**
     * Reference to the users table, can be NULL if it's not a user
     *
     * @Column(type="integer", nullable=true)
     */
    public ?int $userid = null;

    /**
     * Flag indicating whether to show the number in the phonebook and selection lists
     *
     * @Column(type="string", length=1, nullable=true, default="1")
     */
    public ?string $show_in_phonebook = '1';

    /**
     * Flag indicating whether the number can be dialed by external callers
     *
     * @Column(type="string", length=1, nullable=true, default="1")
     */
    public ?string $public_access = '1';

    /**
     * Flag indicating whether it is the general user number that is edited in the user's profile
     *
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $is_general_user_number = "0";


    /**
     * Get the next available application number from the database.
     *
     * @return string The next free application number.
     */
    public static function getNextFreeApplicationNumber(): string
    {
        $parameters = [
            'columns' => 'number',
        ];
        // Retrieve all existing numbers from the database
        $result = self::find($parameters)->toArray();

        // Find the next available application number starting from 2200100
        $freeExtension = '2200100';
        for ($i = 100; ; $i++) {
            $freeExtension = "2200{$i}";
            if (!in_array(['number' => $freeExtension], $result, false)) {
                break;
            }
        }
        return $freeExtension;
    }

    /**
     * Get the next available internal extension number.
     *
     * This function retrieves the minimum existing internal extension number from the database.
     * If there are no existing internal numbers, it starts from 200.
     * It then checks for available extension numbers within the range and returns the next available one.
     *
     * @return string The next available internal extension number, or an empty string if none are available.
     */
    public static function getNextInternalNumber(): string
    {
        $parameters = [
            'column' => 'number',
            'conditions'=>'type="'.Extensions::TYPE_SIP.'" and userid is not null'
        ];
        $started = Extensions::minimum($parameters);
        if ($started === null) {
            // If there are no existing internal numbers, start from 200
            $started = 200;
        }

        $extensionsLength = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_INTERNAL_EXTENSION_LENGTH);
        $maxExtension = (10 ** $extensionsLength) - 1;

        $occupied = Extensions::find(['columns' => 'number'])->toArray();
        $occupied = array_column($occupied, 'number');

        for ($i = $started; $i <= $maxExtension ; $i++) {
            if (!in_array((string)$i, $occupied)){
                return (string)$i;
            }
        }
        // There is no available extensions
        return '';
    }

    /**
     * Initialize the model.
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
                'alias' => 'Users',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action' => Relation::NO_ACTION,
                ],
            ]
        );
        $this->hasOne(
            'number',
            Sip::class,
            'extension',
            [
                'alias' => 'Sip',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::ACTION_CASCADE,
                ],
            ]
        );
        $this->hasOne(
            'number',
            ExternalPhones::class,
            'extension',
            [
                'alias' => 'ExternalPhones',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::ACTION_CASCADE,
                ],
            ]
        );
        $this->hasOne(
            'number',
            DialplanApplications::class,
            'extension',
            [
                'alias' => 'DialplanApplications',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::ACTION_CASCADE // DialplanApplications is always deleted through its Extension
                ],
            ]
        );
        $this->hasOne(
            'number',
            ConferenceRooms::class,
            'extension',
            [
                'alias' => 'ConferenceRooms',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::ACTION_CASCADE // ConferenceRooms is always deleted through its Extension
                ],
            ]
        );

        $this->hasOne(
            'number',
            CallQueues::class,
            'extension',
            [
                'alias' => 'CallQueues',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::ACTION_CASCADE // CallQueues is always deleted through its Extension
                ],
            ]
        );
        $this->hasMany(
            'number',
            CallQueues::class,
            'timeout_extension',
            [
                'alias' => 'CallQueueRedirectRightsTimeout',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message' => 'CallQueueRedirectRightsTimeout',
                    'action' => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasMany(
            'number',
            CallQueues::class,
            'redirect_to_extension_if_empty',
            [
                'alias' => 'CallQueueRedirectRightsIfEmpty',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message' => 'CallQueueRedirectRightsIfEmpty',
                    'action' => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasMany(
            'number',
            CallQueues::class,
            'redirect_to_extension_if_unanswered',
            [
                'alias' => 'CallQueueRedirectRightsIfUnanswered',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message' => 'CallQueueRedirectRightsIfUnanswered',
                    'action' => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasMany(
            'number',
            CallQueues::class,
            'redirect_to_extension_if_repeat_exceeded',
            [
                'alias' => 'CallQueueRedirectRightsIfRepeatExceeded',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message' => 'CallQueueRedirectRightsIfRepeatExceeded',
                    'action' => Relation::ACTION_RESTRICT,
                ],
            ]
        );

        $this->hasMany(
            'number',
            CallQueueMembers::class,
            'extension',
            [
                'alias' => 'CallQueueMembers',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::ACTION_CASCADE, // CallQueueMembers is always deleted through its Extension
                ],
            ]
        );
        $this->hasMany(
            'number',
            IncomingRoutingTable::class,
            'extension',
            [
                'alias' => 'IncomingRoutingTable',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::ACTION_RESTRICT,
                ],
                'params' => [
                    'order' => 'priority asc',
                ],
            ]
        );
        $this->hasMany(
            'number',
            OutWorkTimes::class,
            'extension',
            [
                'alias' => 'OutWorkTimes',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasOne(
            'number',
            ExtensionForwardingRights::class,
            'extension',
            [
                'alias' => 'ExtensionForwardingRights',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::ACTION_CASCADE, // ExtensionForwardingRights is always deleted through its Extension
                ],
            ]
        );

        $this->hasMany(
            'number',
            ExtensionForwardingRights::class,
            'forwarding',
            [
                'alias' => 'ExtensionForwardingRightsForwarding',
                'foreignKey' => [
                    'allowNulls' => false,
                    'message' => 'ExtensionForwardingRightsForwarding',
                    'action' => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasMany(
            'number',
            ExtensionForwardingRights::class,
            'forwardingonbusy',
            [
                'alias' => 'ExtensionForwardingRightsForwardingOnBusy',
                'foreignKey' => [
                    'allowNulls' => false,
                    'message' => 'ExtensionForwardingRightsForwardingOnBusy',
                    'action' => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasMany(
            'number',
            ExtensionForwardingRights::class,
            'forwardingonunavailable',
            [
                'alias' => 'ExtensionForwardingRightsOnUnavailable',
                'foreignKey' => [
                    'allowNulls' => false,
                    'message' => 'ExtensionForwardingRightsOnUnavailable',
                    'action' => Relation::ACTION_RESTRICT,
                ],
            ]
        );

        $this->hasOne(
            'number',
            IvrMenu::class,
            'extension',
            [
                'alias' => 'IvrMenu',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::ACTION_CASCADE // IvrMenu is always deleted through its Extension
                ],
            ]
        );

        $this->hasMany(
            'number',
            IvrMenu::class,
            'timeout_extension',
            [
                'alias' => 'IvrMenuTimeout',
                'foreignKey' => [
                    'message' => 'IvrMenuTimeout',
                    'allowNulls' => false,
                    'action' => Relation::ACTION_RESTRICT
                    // Restrict the deletion of an internal number if it is used in an IVR menu timeout
                ],
            ]
        );

        $this->hasMany(
            'number',
            IvrMenuActions::class,
            'extension',
            [
                'alias' => 'IvrMenuActions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::ACTION_RESTRICT
                    // Restrict the deletion of an internal number if it is used in an IVR menu actions
                ],
            ]
        );
    }

    /**
     * Handlers after model data is updated.
     */
    public function afterUpdate(): void
    {
        $updatedFields = $this->getUpdatedFields();
        if (in_array('number', $updatedFields, false)) {
            $this->updateRelationshipsNumbers();
        }
    }

    /**
     * Update numbers in all related tables when the Extensions number is changed.
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
                $relatedModel = $relation->getReferencedModel();
                $referencedFields = is_array($referencedFields) ? $referencedFields : [$referencedFields];
                foreach ($referencedFields as $referencedField) {
                    $parameters = [
                        'conditions' => $referencedField . '= :oldNumber:',
                        'bind' => ['oldNumber' => $snapShotData['number']],
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
     * Perform validation on the model.
     *
     * @return bool Whether the validation was successful or not.
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
     * Get the related links to the current record.
     *
     * @return array An array of links.
     */
    public function getRelatedLinks(): array
    {
        $result = [];
        $relations = $this->_modelsManager->getRelations(__CLASS__);

        // Iterate through the relations of the current model
        foreach ($relations as $relation) {
            $relationFields = $relation->getFields();

            // Check if the relation is based on the 'number' field
            if ($relationFields === 'number'
                ||
                (
                    is_array($relationFields)
                    && in_array('number', $relationFields, true)
                )
            ) {
                $referencedFields = $relation->getReferencedFields();
                $relatedModel = $relation->getReferencedModel();
                $referencedFields = is_array($referencedFields) ? $referencedFields : [$referencedFields];

                // Iterate through the referenced fields
                foreach ($referencedFields as $referencedField) {
                    $parameters = [
                        'conditions' => $referencedField . '= :Number:',
                        'bind' => ['Number' => $this->number],
                    ];

                    // Retrieve the related records based on the matching number
                    $relatedRecords = call_user_func([$relatedModel, 'find'], $parameters);

                    // Build an array of links with the related record and reference field
                    foreach ($relatedRecords as $relatedRecord) {
                        $result[] = [
                            'object' => $relatedRecord,
                            'referenceField' => $referencedField,
                        ];
                    }
                }
            }
        }

        return $result;
    }

    /**
     * Sanitizes the caller ID by removing any characters that are not alphanumeric or spaces.
     * This function is automatically triggered before saving the call model.
     */
    public function beforeSave()
    {
        // Sanitizes the caller ID by removing any characters that are not alphanumeric or spaces.
        $this->callerid = preg_replace('/[^a-zA-Zа-яА-Я0-9 ]/ui', '', $this->callerid);
    }

}