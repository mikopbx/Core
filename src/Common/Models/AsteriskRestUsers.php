<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Core\System\PasswordService;
use Phalcon\Filter\Validation;
use Phalcon\Filter\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * Class AsteriskRestUsers
 * Model for managing Asterisk REST Interface (ARI) users
 *
 * @package MikoPBX\Common\Models
 */
class AsteriskRestUsers extends ModelsBase
{
    /**
     * ARI user ID
     *
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * ARI username
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $username = '';

    /**
     * ARI user password
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $password = '';

    /**
     * List of allowed Stasis applications (JSON encoded)
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $applications = '';

    /**
     * ARI user description
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    /**
     * Status of the user password check by weak dictionary (0 = not checked, 1 = ok, 2 = weak).
     *
     * @Column(type="string", nullable=true, default="0")
     */
    public ?string $weakPassword = '0';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_AsteriskRestUsers');
        parent::initialize();
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
            'username',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisUsernameNotUniqueForAsteriskRestUsers'),
                ]
            )
        );

        return $this->validate($validation);
    }

    /**
     * Generates a secure ARI password using PasswordService.
     *
     * @return string The generated ARI password.
     */
    public static function generateARIPassword(): string
    {
        // Generate a secure password with 32 characters for ARI
        // ARI passwords need to be strong as they provide API access
        return PasswordService::generate(['length' => 32, 'includeSpecial' => true]);
    }

    /**
     * Get applications as array
     *
     * @return array
     */
    public function getApplicationsArray(): array
    {
        if (empty($this->applications)) {
            return [];
        }
        
        $apps = json_decode($this->applications, true);
        return is_array($apps) ? $apps : [];
    }

    /**
     * Set applications from array
     *
     * @param array $applications
     * @return void
     */
    public function setApplicationsArray(array $applications): void
    {
        $this->applications = json_encode(array_values(array_unique($applications)));
    }

    /**
     * Called before model is created
     */
    public function beforeCreate(): void
    {
        // Generate password if not set
        if (empty($this->password)) {
            $this->password = self::generateARIPassword();
        }
    }
}