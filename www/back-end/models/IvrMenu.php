<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace Models;
use Phalcon\Mvc\Model\Relation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

class IvrMenu extends ModelsBase
{

	/**
	 * @var integer
	 */
    public $id;

	/**
	 * Адрес сервера 1С
	 *
	 * @var string
	 */
    public $uniqid;

	/**
	 * Номер IVR меню
	 *
	 * @var string
	 */
    public $extension;

	/**
	 * ID записи аудиоприветсвия
	 *
	 * @var string
	 */
    public $audio_message_id;

	/**
	 * Название IVR меню
	 *
	 * @var string
	 */
    public $name;

	/**
	 * Ожидание ввода внутреннего номера после проигрывания приветсвитя
	 * 7 секунд по-умолчанию
	 * @var integer
	 */
	public $timeout;

	/**
	 * Номер на который уйдет вызов после $number_of_repeat попыток набора
	 *
	 * @var string
	 */
    public $timeout_extension;

	/**
	 * Разрешить донабор любого внутреннего номера
	 *
	 * @var integer
	 */
    public $allow_enter_any_internal_extension;


	/**
	 * Максимальное число повторов меню перед отправкой на номер по умолчанию
	 *
	 * @var integer
	 */
	public $number_of_repeat;

	/**
	 * Комментарий
	 *
	 * @var string
	 */
	public $description;

    public function getSource() :string
    {
        return 'm_IvrMenu';
    }

    public function initialize() :void
    {
	    parent::initialize();
        $this->belongsTo(
            'extension',
            'Models\Extensions',
            'number',
            [
                'alias'      => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION // IVR меню удаляем через его Extension
                ]
            ]
        );

        $this->belongsTo(
            'timeout_extension',
            'Models\Extensions',
            'number',
            [
                'alias'      => 'TimeoutExtensions',
                'foreignKey' => [
	                'message'    => 'Models\TimeoutExtensions',
	                'allowNulls' => FALSE,
	                'action'     => Relation::NO_ACTION// Не троогать Extensions
                ]
            ]
        );

        $this->hasMany(
            'uniqid',
            'Models\IvrMenuActions',
            'ivr_menu_id',
            [
                'alias'=>'IvrMenuActions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE //Удалить подчиненные все IvrMenuActions при удалении IvrMenu
                ],
                'params' => array(
                    'order' => 'digits asc'
                )
            ]
        );

        $this->belongsTo(
            'audio_message_id',
            'Models\SoundFiles',
            'id',
            [
                'alias'      => 'SoundFiles',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::NO_ACTION
                ]
            ]

        );


    }


    public function validation() :bool
    {

        $validation = new \Phalcon\Validation();
        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t('mo_ThisUniqidMustBeUniqueForIvrMenuModels')
        ]));
        return $this->validate($validation);


    }
}