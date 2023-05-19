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
 * Class Iax
 *
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
 * @property Providers Providers
 *
 * @package MikoPBX\Common\Models
 */
class Iax extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Unique identifier for the IAX setting
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $uniqid = '';

    /**
     * IAX username
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $username = '';

    /**
     * IAX secret/password
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $secret = '';

    /**
     * IAX host
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $host = '';

    /**
     * Qualify setting for IAX (0 or 1)
     *
     * @Column(type="string", length=1, nullable=true)
     */
    public ?string $qualify = '';

    /**
     *  Flag indicating whether this IAX record is disabled (0 or 1)
     *
     * @Column(type="string", length=1, nullable=false)
     */
    public ?string $disabled = '0';

    /**
     * Flag indicating whether IAX registration is disabled (0 or 1)
     *
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $noregister = '0';

    /**
     * Manual attributes for IAX settings
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $manualattributes = '';

    /**
     *  Description of the IAX setting
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';


    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_Iax');
        parent::initialize();
        $this->belongsTo(
            'uniqid',
            Providers::class,
            'iaxuid',
            [
                'alias' => 'Providers',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::ACTION_CASCADE,
                ],
            ]
        );
    }

    /**
     * Get the manual attributes of the model.
     *
     * @return string The decoded manual attributes.
     */
    public function getManualAttributes(): string
    {
        return base64_decode((string)$this->manualattributes);
    }

    /**
     * Set the manual attributes of the model.
     *
     * @param string $text The manual attributes text.
     * @return void
     */
    public function setManualAttributes($text): void
    {
        $this->manualattributes = base64_encode($text);
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
                    'message' => $this->t('mo_ThisUniqidMustBeUniqueForIAXModels'),
                ]
            )
        );

        return $this->validate($validation);
    }

}

