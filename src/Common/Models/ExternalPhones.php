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
 * Class ExternalPhones
 *
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
 * @method static mixed findFirstByExtension(string|null $number)
 *
 * @package MikoPBX\Common\Models
 */
class ExternalPhones extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Extension number with type External
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $extension = '';

    /**
     * Unique ID for the external phone
     *
     * @Primary
     * @Column(type="string", nullable=true)
     */
    public ?string $uniqid = '';

    /**
     * Dial string for the external phone
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $dialstring = '';

    /**
     * Manual dialplan for incoming calls on the external phone
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $manualdialplanincoming = '';

    /**
     * Manual dialplan for outgoing calls from the external phone
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $manualdialplanoutgoing = '';

    /**
     * Indicates if the external phone is disabled or enabled
     *
     * @Column(type="string", length=1, nullable=false)
     */
    public ?string $disabled = '0';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_ExternalPhones');
        parent::initialize();

        // Establish a belongsTo relationship with the Extensions model
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            [
                'alias' => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION
                    // The Extensions model will be deleted first, and it will delete the associated ExternalPhones
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
                    'message' => $this->t('mo_ThisUniqidNotUniqueForExternalPhonesModels'),
                ]
            )
        );

        return $this->validate($validation);
    }

    /**
     * Generates a random unique id.
     *
     * @return string The generated unique id.
     */
    public static function generateUniqueID($alias=''):string
    {
        if (empty($alias)){
            $alias = Extensions::TYPE_EXTERNAL.'-';
        }
        return parent::generateUniqueID($alias);
    }
}