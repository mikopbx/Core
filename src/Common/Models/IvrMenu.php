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
     * Unique ID of the IVR menu.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $uniqid = '';

    /**
     * IVR menu extension number.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $extension = '';

    /**
     *  ID of the audio greeting message record.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $audio_message_id = '';

    /**
     * Name of the IVR menu.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $name = '';

    /**
     * Timeout during which the system waits for input of an internal extension or an IVR menu option,
     * after which the call is transferred to the default extension specified in the $timeout_extension field.
     *
     * Default is 7 seconds.
     *
     * @Column(type="integer", nullable=true, default="7")
     */
    public ?string $timeout = '7';

    /**
     * Extension number to which the call will be transferred after a certain number of dialing attempts.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $timeout_extension = '';

    /**
     * Allow dialing any internal extension number.
     *
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $allow_enter_any_internal_extension = '0';

    /**
     * Maximum number of menu repeats before forwarding to the default number
     * specified in the $timeout_extension field.
     *
     * @Column(type="integer", nullable=true, default="3")
     */
    public $number_of_repeat = '3';

    /**
     * Comment
     *
     * @Column(type="string", nullable=true)
     */
    public $description = '';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_IvrMenu');
        parent::initialize();

        // Establish a belongsTo relationship with the Extensions model for IVR menu's extension
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            [
                'alias' => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION
                    // IVR menu is deleted through its associated Extension
                ],
            ]
        );

        // Establish a belongsTo relationship with the Extensions model for timeout extension
        $this->belongsTo(
            'timeout_extension',
            Extensions::class,
            'number',
            [
                'alias' => 'TimeoutExtensions',
                'foreignKey' => [
                    'message' => 'TimeoutExtensions',
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION
                    // TimeoutExtensions are not affected
                ],
            ]
        );

        // Establish a hasMany relationship with IvrMenuActions model
        $this->hasMany(
            'uniqid',
            IvrMenuActions::class,
            'ivr_menu_id',
            [
                'alias' => 'IvrMenuActions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::ACTION_CASCADE
                    // Delete all related IvrMenuActions when deleting the IVR menu
                ],
                'params' => [
                    'order' => 'digits asc',
                ],
            ]
        );

        // Establish a belongsTo relationship with SoundFiles model for the audio message
        $this->belongsTo(
            'audio_message_id',
            SoundFiles::class,
            'id',
            [
                'alias' => 'SoundFiles',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action' => Relation::NO_ACTION,
                ],
            ]

        );
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