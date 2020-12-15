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
 * Class IvrMenu
 *
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
 *
 * @package MikoPBX\Common\Models
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
    public ?string $uniqid = '';

    /**
     * Номер IVR меню
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $extension = '';

    /**
     * ID записи аудиоприветсвия
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $audio_message_id = '';

    /**
     * Название IVR меню
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $name = '';

    /**
     * Ожидание ввода внутреннего номера после проигрывания приветсвитя
     * 7 секунд по-умолчанию
     * @Column(type="integer", nullable=true, default="7")
     */
    public ?string $timeout = '7';

    /**
     * Номер на который уйдет вызов после $number_of_repeat попыток набора
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $timeout_extension = '';

    /**
     * Разрешить донабор любого внутреннего номера
     *
     *  @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $allow_enter_any_internal_extension = '0';


    /**
     * Максимальное число повторов меню перед отправкой на номер по умолчанию
     *
     * @Column(type="integer", nullable=true, default="3")
     */
    public $number_of_repeat = '3';

    /**
     * Комментарий
     *
     * @Column(type="string", nullable=true)
     */
    public $description = '';

    /**
     *
     */
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