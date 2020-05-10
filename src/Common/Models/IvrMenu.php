<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\Common\Models;

use Phalcon\Mvc\Model\Relation;
use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
 */
class IvrMenu extends ModelsBase
{

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Адрес сервера 1С
     *
     * @Column(type="string", nullable=true)
     */
    public $uniqid;

    /**
     * Номер IVR меню
     *
     * @Column(type="string", nullable=true)
     */
    public $extension;

    /**
     * ID записи аудиоприветсвия
     *
     * @Column(type="string", nullable=true)
     */
    public $audio_message_id;

    /**
     * Название IVR меню
     *
     * @Column(type="string", nullable=true)
     */
    public $name;

    /**
     * Ожидание ввода внутреннего номера после проигрывания приветсвитя
     * 7 секунд по-умолчанию
     * @Column(type="integer", nullable=true)
     */
    public $timeout;

    /**
     * Номер на который уйдет вызов после $number_of_repeat попыток набора
     *
     * @Column(type="string", nullable=true)
     */
    public $timeout_extension;

    /**
     * Разрешить донабор любого внутреннего номера
     *
     * @Column(type="integer", nullable=true)
     */
    public $allow_enter_any_internal_extension;


    /**
     * Максимальное число повторов меню перед отправкой на номер по умолчанию
     *
     * @Column(type="integer", nullable=true)
     */
    public $number_of_repeat;

    /**
     * Комментарий
     *
     * @Column(type="string", nullable=true)
     */
    public $description;

    public function initialize(): void
    {
        $this->setSource('m_IvrMenu');
        parent::initialize();
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            [
                'alias'      => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION // IVR меню удаляем через его Extension
                ],
            ]
        );

        $this->belongsTo(
            'timeout_extension',
            Extensions::class,
            'number',
            [
                'alias'      => 'TimeoutExtensions',
                'foreignKey' => [
                    'message'    => 'TimeoutExtensions',
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION// Не троогать Extensions
                ],
            ]
        );

        $this->hasMany(
            'uniqid',
            IvrMenuActions::class,
            'ivr_menu_id',
            [
                'alias'      => 'IvrMenuActions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE
                    //Удалить подчиненные все IvrMenuActions при удалении IvrMenu
                ],
                'params'     => [
                    'order' => 'digits asc',
                ],
            ]
        );

        $this->belongsTo(
            'audio_message_id',
            SoundFiles::class,
            'id',
            [
                'alias'      => 'SoundFiles',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::NO_ACTION,
                ],
            ]

        );
    }


    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add(
            'uniqid',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisUniqidMustBeUniqueForIvrMenuModels'),
                ]
            )
        );

        return $this->validate($validation);
    }
}