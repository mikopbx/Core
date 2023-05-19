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
 * Class DialplanApplications
 *
 * @method static mixed findFirstByUniqid(array|string|int $parameters = null)
 *
 * @package MikoPBX\Common\Models
 */
class DialplanApplications extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Unique identifier for the dialplan application
     *
     * @Primary
     * @Column(type="string", nullable=true)
     */
    public ?string $uniqid = '';

    /**
     * Name of the dialplan application
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $name = '';

    /**
     * Extension associated with the dialplan application
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $extension = '';

    /**
     * Hint for the dialplan application
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $hint = '';

    /**
     * Application logic for the dialplan application
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $applicationlogic = '';

    /**
     * Type of the dialplan application
     *
     * @Column(type="string", nullable=true) {'plaintext'|'php'}
     */
    public ?string $type = 'plaintext';

    /**
     * Description of the dialplan application
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_DialplanApplications');
        parent::initialize();

        // Define the relationship with Extensions model
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            [
                'alias' => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION
                    // DialplanApplications is deleted through its associated Extension
                ],
            ]
        );
    }

    /**
     * Get the decoded application logic from the model.
     *
     * @return string The decoded application logic.
     */
    public function getApplicationlogic(): string
    {
        return base64_decode((string)$this->applicationlogic);
    }

    /**
     * Set the encoded application logic for the model.
     *
     * @param string $text The application logic to be encoded and set.
     * @return void
     */
    public function setApplicationlogic($text): void
    {
        $this->applicationlogic = base64_encode($text);
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
                    'message' => $this->t('mo_ThisUniqidNotUniqueForDialplanApplicationsModels'),
                ]
            )
        );

        $validation->add(
            'extension',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisExtensionNotUniqueForDialplanApplicationsModels'),
                ]
            )
        );

        return $this->validate($validation);
    }
}