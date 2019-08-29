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
use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * @property \Models\ExternalPhones|\Phalcon\Mvc\Model\Resultset|\Phalcon\Mvc\Phalcon\Mvc\Model ExternalPhones
 * @property \Models\ExtensionForwardingRights                                         ExtensionForwardingRights
 * @property \Models\Users|\Phalcon\Mvc\Model\Resultset|\Phalcon\Mvc\Phalcon\Mvc\Model Users
 * @property \Models\Sip|\Phalcon\Mvc\Model\Resultset|\Phalcon\Mvc\Phalcon\Mvc\Model Sip

 */
class Extensions extends ModelsBase
{
	/**
	 * @var integer
	 */
    public $id;

    /**
	 * Внутренний номер или шаблон внутреннего номера
	 *
	 * @var string
	 */
    public $number;

	/**
	 * Тип внутреннего номера
	 *
	 * @var string
	 */
    public $type;

	/**
	 * Caller id для номера
	 *
	 * @var string
	 */
    public $callerid;

	/**
	 * Ссылка на таблицу пользователей, может быть NULL, если это не пользоваетель
	 *
	 * @var integer |null
	 */
    public $userid;

	/**
	 * Признак отображения в телефонной книге, и при выборе в списках
	 *
	 * @var integer
	 */
    public $show_in_phonebook;

    /**
	 * Признак возможности донабора этого номера звонящим из вне
	 *
	 * @var integer
	 */
    public $public_access;

    /**
	 * Признак основного номера пользователя, который редактируется в его карточке
	 *
	 * @var integer
	 */
    public $is_general_user_number;


    /**
     * Имя таблицы хранения номеров
     */
    public function getSource() :string {
        return 'm_Extensions';
    }

	/**
	 * Настройка статических отношений, также возможны динамические из модулей расширений
	 */
	public function initialize() :void{
    	parent::initialize();
        $this->belongsTo(
            'userid',
            'Models\Users',
            'id',
            [
                'alias'=>'Users',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::NO_ACTION
                ]
            ]
        );
        $this->hasOne(
            'number',
            'Models\Sip',
            'extension',
            [
                'alias'=>'Sip',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE
                ]
            ]
        );
        $this->hasOne(
            'number',
            'Models\ExternalPhones',
            'extension',
            [
                'alias'=>'ExternalPhones',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE
                ]
            ]
        );
        $this->hasOne(
            'number',
            'Models\DialplanApplications',
            'extension',
            [
                'alias'=>'DialplanApplications',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE // DialplanApplications всегда удаляем через его Extension
                ]
            ]
        );
        $this->hasOne(
            'number',
            'Models\ConferenceRooms',
            'extension',
            [
                'alias'=>'ConferenceRooms',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE // ConferenceRooms всегда удаляем через его Extension
                ]
            ]
        );

        $this->hasOne(
            'number',
            'Models\CallQueues',
            'extension',
            [
                'alias'=>'CallQueues',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE // CallQueues всегда удаляем через его Extension
                ]
            ]
        );
        $this->hasMany(
           'number',
            'Models\CallQueues',
            'timeout_extension',
            [
	            'alias'=>'CallQueueRedirectRightsTimeout',
                'foreignKey' => [
                    'allowNulls' => true,
                    'message'    => 'Models\CallQueueRedirectRightsTimeout',
                    'action'     => Relation::ACTION_RESTRICT
                ]
            ]
        );
	    $this->hasMany(
		    'number',
		    'Models\CallQueues',
		    'redirect_to_extension_if_empty',
		    [
			    'alias'=>'CallQueueRedirectRightsIfEmpty',
			    'foreignKey' => [
				    'allowNulls' => true,
				    'message'    => 'Models\CallQueueRedirectRightsIfEmpty',
				    'action'     => Relation::ACTION_RESTRICT
			    ]
		    ]
	    );
	    $this->hasMany(
		    'number',
		    'Models\CallQueues',
		    'redirect_to_extension_if_unanswered',
		    [
			    'alias'=>'CallQueueRedirectRightsIfUnanswered',
			    'foreignKey' => [
				    'allowNulls' => true,
				    'message'    => 'Models\CallQueueRedirectRightsIfUnanswered',
				    'action'     => Relation::ACTION_RESTRICT
			    ]
		    ]
	    );
	    $this->hasMany(
		    'number',
		    'Models\CallQueues',
		    'redirect_to_extension_if_repeat_exceeded',
		    [
			    'alias'=>'CallQueueRedirectRightsIfRepeatExceeded',
			    'foreignKey' => [
				    'allowNulls' => true,
				    'message'    => 'Models\CallQueueRedirectRightsIfRepeatExceeded',
				    'action'     => Relation::ACTION_RESTRICT
			    ]
		    ]
	    );

        $this->hasMany(
            'number',
            'Models\CallQueueMembers',
            'extension',
            [
                'alias'=>'CallQueueMembers',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE
                ]
            ]
        );
	    $this->hasMany(
		    'number',
		    'Models\IncomingRoutingTable',
		    'extension',
		    [
			    'alias'=>'IncomingRoutingTable',
			    'foreignKey' => [
				    'allowNulls' => false,
				    'action'     => Relation::ACTION_RESTRICT
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
                'alias'=>'OutWorkTimes',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_RESTRICT
                ]
            ]
        );
        $this->hasOne(
            'number',
            'Models\ExtensionForwardingRights',
            'extension',
            [
                'alias'=>'ExtensionForwardingRights',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE
                ]
            ]
        );

        $this->hasMany(
           'number',
            'Models\ExtensionForwardingRights',
            'forwarding',
            [
	            'alias'=>'ExtensionForwardingRightsForwarding',
                'foreignKey' => [
                    'allowNulls' => false,
                    'message'    => 'Models\ExtensionForwardingRightsForwarding',
                    'action'     => Relation::ACTION_RESTRICT
                ]
            ]
        );
	    $this->hasMany(
		    'number',
		    'Models\ExtensionForwardingRights',
		     'forwardingonbusy',
		    [
			    'alias'=>'ExtensionForwardingRightsForwardingOnBusy',
			    'foreignKey' => [
				    'allowNulls' => false,
				    'message'    => 'Models\ExtensionForwardingRightsForwardingOnBusy',
				    'action'     => Relation::ACTION_RESTRICT
			    ]
		    ]
	    );
	    $this->hasMany(
		    'number',
		    'Models\ExtensionForwardingRights',
		    'forwardingonunavailable',
		    [
			    'alias'=>'ExtensionForwardingRightsOnUnavailable',
			    'foreignKey' => [
				    'allowNulls' => false,
				    'message'    => 'Models\ExtensionForwardingRightsOnUnavailable',
				    'action'     => Relation::ACTION_RESTRICT
			    ]
		    ]
	    );

	    $this->hasOne(
		    'number',
		    'Models\IvrMenu',
		    'extension',
		    [
			    'alias'      => 'IvrMenu',
			    'foreignKey' => [
				    'allowNulls' => false,
				    'action'     => Relation::ACTION_CASCADE // IVR меню удаляем через его Extension
			    ]
		    ]
	    );

	    $this->hasMany(
		    'number',
		    'Models\IvrMenu',
		    'timeout_extension',
		    [
			    'alias'      => 'IvrMenuTimeout',
			    'foreignKey' => [
				    'message'    => 'Models\IvrMenuTimeout',
				    'allowNulls' => FALSE,
				    'action'     => Relation::ACTION_RESTRICT
				    // Запретим удалять внутренний номер если он используется в IVR меню
			    ],
		    ]
	    );

	    $this->hasMany(
		    'number',
		    'Models\IvrMenuActions',
		    'extension',
		    [
			    'alias'      => 'IvrMenuActions',
			    'foreignKey' => [
				    'allowNulls' => false,
				    'action'     => Relation::ACTION_RESTRICT // Запретим удалять внутренний номер если он используется в IVR меню
			    ]
		    ]
	    );

    }

	/**
	 * Обработчики после обновления данных модели
	 */
    public function afterUpdate() :void{
    	$updatedFields = $this->getUpdatedFields();
        if (is_array($updatedFields) && in_array('number', $updatedFields, false)) {
        	$this->updateRelationshipsNumbers();
        }
    }

    /**
     * Обновляет номера во всех связанных таблицах при имзенении номера Extensions
     */
    private function updateRelationshipsNumbers() :void{
        $snapShotData = $this->getOldSnapshotData();
        if (empty($snapShotData)) {return;}
        $relations = $this->_modelsManager->getRelations('Models\Extensions');
        foreach ($relations as $relation) {
            if ($relation->getFields()=='number'
                ||
                (
                	is_array($relation->getFields())
	                && in_array('number', $relation->getFields(), TRUE)
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
	public static function getPhoneBookArray() :array{
		$query     = self::find();
		$phoneBook = [];
		foreach ( $query as $record ) {
			if (!$record->show_in_phonebook){
				continue;
			}
			$phoneNumber = $record->number;
			if (strlen($phoneNumber)>10){
				$phoneNumber = substr($record->number, -10);
			}
			$phoneBook[ $phoneNumber ] = str_replace( '"', '\\"', $record->getRepresent() );
		}

		return $phoneBook;
	}

	/**
	 * Получает из базы следующий за последним введенным системным номером
	 */
	public static function getNextFreeApplicationNumber() :string {
		$parameters = [
			'columns' => 'number',
		];
		$result     = self::find( $parameters )->toArray();

		$freeExtension = '0000100';
		for ( $i = 100; ; $i ++ ) {
			$freeExtension = "0000{$i}";
			if ( ! in_array( [ 'number' => $freeExtension ], $result ,FALSE) ) {
				break;
			}
		}

		return $freeExtension;
	}

	/**
	 * Валидация уникальности номера
	 *
	 * @return bool
	 */
    public function validation() :bool{
        $validation = new Validation();
        $validation->add('number', new UniquenessValidator([
            'message' => $this->t('mo_ThisNumberNotUniqueForExtensionsModels')
        ]));
        return $this->validate($validation);
    }

	/**
	 * Возвращает ссылки на текущую запись
	 *
	 * @return array - массив ссылок
	 */
	public function getRelatedLinks() :array {
		$result  = [];
		$relations = $this->_modelsManager->getRelations('Models\Extensions');
		foreach ($relations as $relation) {
			if ($relation->getFields()==='number'
				||
				(
					is_array($relation->getFields())
					&& in_array('number', $relation->getFields(), true)
				)
			){
				$referencedFields = $relation->getReferencedFields();
				$relatedModel = $relation->getReferencedModel();
				$referencedFields = is_array($referencedFields)?$referencedFields:[$referencedFields];
				foreach ($referencedFields as $referencedField) {
					$parameters = [
						'conditions'=>$referencedField.'= :Number:',
						'bind'=>['Number'=>$this->number]
					];
					$relatedRecords = $relatedModel::find($parameters);
					foreach ($relatedRecords as $relatedRecord){
						$result[] = [
							'object'=>$relatedRecord,
							'referenceField' =>$referencedField
						];
					}

				}
			}
		}
		return $result;
	}


}