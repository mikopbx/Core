<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

namespace Models;

use Phalcon\Mvc\Model\Relation;
use Phalcon\Mvc\Model\Resultset;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

class Extensions extends ModelsBase
{
    public $id;
    public $number;
    public $type;
    public $callerid;
    public $userid;
    public $show_in_phonebook;
    public $public_access;
    public $is_general_user_number;

    public function getSource()
    {
        return 'm_Extensions';
    }


	public function initialize()
    {
    	parent::initialize();
        $this->belongsTo(
            'userid',
            'Models\Users',
            'id',
            [
                "alias"=>"Users",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action"     => Relation::NO_ACTION
                ]
            ]
        );
        $this->hasOne(
            'number',
            'Models\Sip',
            'extension',
            [
                "alias"=>"Sip",
                "foreignKey" => [
                    "allowNulls" => false,
                    "action"     => Relation::ACTION_CASCADE
                ]
            ]
        );
        $this->hasOne(
            'number',
            'Models\ExternalPhones',
            'extension',
            [
                "alias"=>"ExternalPhones",
                "foreignKey" => [
                    "allowNulls" => false,
                    "action"     => Relation::ACTION_CASCADE
                ]
            ]
        );
        $this->hasOne(
            'number',
            'Models\DialplanApplications',
            'extension',
            [
                "alias"=>"DialplanApplications",
                "foreignKey" => [
                    "allowNulls" => false,
                    "action"     => Relation::ACTION_CASCADE // DialplanApplications всегда удаляем через его Extension
                ]
            ]
        );
        $this->hasOne(
            'number',
            'Models\ConferenceRooms',
            'extension',
            [
                "alias"=>"ConferenceRooms",
                "foreignKey" => [
                    "allowNulls" => false,
                    "action"     => Relation::ACTION_CASCADE // ConferenceRooms всегда удаляем через его Extension
                ]
            ]
        );

        $this->hasOne(
            'number',
            'Models\CallQueues',
            'extension',
            [
                "alias"=>"CallQueues",
                "foreignKey" => [
                    "allowNulls" => false,
                    "action"     => Relation::ACTION_CASCADE // CallQueues всегда удаляем через его Extension
                ]
            ]
        );
        $this->hasMany(
           'number',
            'Models\CallQueues',
            'timeout_extension',
            [
	            "alias"=>"CallQueueRedirectRightsTimeout",
                "foreignKey" => [
                    "allowNulls" => true,
                    "message"    => 'Models\CallQueueRedirectRightsTimeout',
                    "action"     => Relation::ACTION_RESTRICT
                ]
            ]
        );
	    $this->hasMany(
		    'number',
		    'Models\CallQueues',
		    'redirect_to_extension_if_empty',
		    [
			    "alias"=>"CallQueueRedirectRightsIfEmpty",
			    "foreignKey" => [
				    "allowNulls" => true,
				    "message"    => 'Models\CallQueueRedirectRightsIfEmpty',
				    "action"     => Relation::ACTION_RESTRICT
			    ]
		    ]
	    );
	    $this->hasMany(
		    'number',
		    'Models\CallQueues',
		    'redirect_to_extension_if_unanswered',
		    [
			    "alias"=>"CallQueueRedirectRightsIfUnanswered",
			    "foreignKey" => [
				    "allowNulls" => true,
				    "message"    => 'Models\CallQueueRedirectRightsIfUnanswered',
				    "action"     => Relation::ACTION_RESTRICT
			    ]
		    ]
	    );
	    $this->hasMany(
		    'number',
		    'Models\CallQueues',
		    'redirect_to_extension_if_repeat_exceeded',
		    [
			    "alias"=>"CallQueueRedirectRightsIfRepeatExceeded",
			    "foreignKey" => [
				    "allowNulls" => true,
				    "message"    => 'Models\CallQueueRedirectRightsIfRepeatExceeded',
				    "action"     => Relation::ACTION_RESTRICT
			    ]
		    ]
	    );

        $this->hasMany(
            'number',
            'Models\CallQueueMembers',
            'extension',
            [
                "alias"=>"CallQueueMembers",
                "foreignKey" => [
                    "allowNulls" => false,
                    "action"     => Relation::ACTION_CASCADE
                ]
            ]
        );
	    $this->hasMany(
		    'number',
		    'Models\IncomingRoutingTable',
		    'extension',
		    [
			    "alias"=>"IncomingRoutingTable",
			    "foreignKey" => [
				    "allowNulls" => false,
				    "action"     => Relation::ACTION_RESTRICT
			    ],
			    'params' => array(
				    'order' => 'priority asc'
			    )
		    ]
	    );
        $this->hasMany(
            'number',
            'Models\OutWorkTimes',
            'extension',
            [
                "alias"=>"OutWorkTimes",
                "foreignKey" => [
                    "allowNulls" => false,
                    "action"     => Relation::ACTION_RESTRICT
                ]
            ]
        );
        $this->hasOne(
            'number',
            'Models\ExtensionForwardingRights',
            'extension',
            [
                "alias"=>"ExtensionForwardingRights",
                "foreignKey" => [
                    "allowNulls" => false,
                    "action"     => Relation::ACTION_CASCADE
                ]
            ]
        );

        $this->hasMany(
           'number',
            'Models\ExtensionForwardingRights',
            'forwarding',
            [
	            "alias"=>"ExtensionForwardingRightsForwarding",
                "foreignKey" => [
                    "allowNulls" => false,
                    "message"    => 'Models\ExtensionForwardingRightsForwarding',
                    "action"     => Relation::ACTION_RESTRICT
                ]
            ]
        );
	    $this->hasMany(
		    'number',
		    'Models\ExtensionForwardingRights',
		     'forwardingonbusy',
		    [
			    "alias"=>"ExtensionForwardingRightsForwardingOnBusy",
			    "foreignKey" => [
				    "allowNulls" => false,
				    "message"    => 'Models\ExtensionForwardingRightsForwardingOnBusy',
				    "action"     => Relation::ACTION_RESTRICT
			    ]
		    ]
	    );
	    $this->hasMany(
		    'number',
		    'Models\ExtensionForwardingRights',
		    'forwardingonunavailable',
		    [
			    "alias"=>"ExtensionForwardingRightsOnUnavailable",
			    "foreignKey" => [
				    "allowNulls" => false,
				    "message"    => 'Models\ExtensionForwardingRightsOnUnavailable',
				    "action"     => Relation::ACTION_RESTRICT
			    ]
		    ]
	    );


	    $this->hasOne(
		    'number',
		    'Models\IvrMenu',
		    'extension',
		    [
			    "alias"      => 'IvrMenu',
			    "foreignKey" => [
				    "allowNulls" => false,
				    "action"     => Relation::ACTION_CASCADE // IVR меню удаляем через его Extension
			    ]
		    ]
	    );

	    $this->hasMany(
		    'number',
		    'Models\IvrMenu',
		    'timeout_extension',
		    [
			    "alias"      => 'IvrMenuTimeout',
			    "foreignKey" => [
				    "message"    => 'Models\IvrMenuTimeout',
				    "allowNulls" => FALSE,
				    "action"     => Relation::ACTION_RESTRICT
				    // Запретим удалять внутренний номер если он используется в IVR меню
			    ],
		    ]
	    );

	    $this->hasMany(
		    'number',
		    'Models\IvrMenuActions',
		    'extension',
		    [
			    "alias"      => 'IvrMenuActions',
			    "foreignKey" => [
				    "allowNulls" => false,
				    "action"     => Relation::ACTION_RESTRICT // Запретим удалять внутренний номер если он используется в IVR меню
			    ]
		    ]
	    );

    }

	/**
	 * Обработчики после обновления данных модели
	 */
    public function afterUpdate(){
    	$updatedFields = $this->getUpdatedFields();
        if (is_array($updatedFields) && in_array('number', $updatedFields)) $this->updateRelationshipsNumbers();
    }

    /**
     * Обновляет номера во всех связанных таблицах при имзенении номера Extensions
     */
    private function updateRelationshipsNumbers(){
        $snapShotData = $this->getOldSnapshotData();
        if (empty($snapShotData)) return;
        $relations = $this->_modelsManager->getRelations('Models\Extensions');
        foreach ($relations as $relation) {
            if ($relation->getFields()=='number'
                ||
                (
                	is_array($relation->getFields())
	                && in_array('number', $relation->getFields())
                )
            ){
                $referencedFields = $relation->getReferencedFields();
                $relatedModel = $relation->getReferencedModel();
                $referencedFields=is_array($referencedFields)?$referencedFields:[$referencedFields];
                foreach ($referencedFields as $referencedField) {
                    $parameters = [
                        'conditions'=>$referencedField.'= :oldNumber:',
                        'bind'=>['oldNumber'=>$snapShotData['number']]
                    ];
                    $relatedRecords = $relatedModel::find($parameters);
                    foreach ($relatedRecords as $relatedRecord){
                        $relatedRecord->update([$referencedField => $this->number]);
                    }

            }
            }
        }
    }

	/**
	 * Возвращяет телефонную книгу
	 * return @array массив номер - представление
	 */
	public static function getPhoneBookArray() {
		$query     = Extensions::find();
		$phoneBook = [];
		foreach ( $query as $record ) {
			$phoneNumber = $record->number;
			if (strlen($phoneNumber)>10){
				$phoneNumber = substr($record->number, -10);
			}
			$phoneBook[ $phoneNumber ] = str_replace( '"', '\\"',
				$record->getRepresent() );
		}

		return $phoneBook;
	}

	/**
	 * Получает из базы следующий за последним введенным системным номером
	 */
	public static function getNextFreeApplicationNumber() {
		$parameters = [
			'columns' => 'number',
		];
		$result     = Extensions::find( $parameters )->toArray();

		$freeExtension = "0000100";
		for ( $i = 100; ; $i ++ ) {
			$freeExtension = "0000{$i}";
			if ( ! in_array( [ 'number' => $freeExtension ], $result ) ) {
				break;
			}
		}

		return $freeExtension;
	}

    public function validation()
    {
        $validation = new \Phalcon\Validation();
        $validation->add('number', new UniquenessValidator([
            'message' => $this->t("mo_ThisNumberNotUniqueForExtensionsModels")
        ]));
        return $this->validate($validation);
    }


}