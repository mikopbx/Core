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

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use Phalcon\Mvc\Model\Relation;
use Phalcon\Security\Random;
use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * Class AsteriskManagerUsers
 *
 * @package MikoPBX\Common\Models
 */
class AsteriskManagerUsers extends ModelsBase
{
    /**
     * AMI users ID
     *
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * AMI users username
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $username = '';

    /**
     * AMI users password
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $secret = '';

    /**
     * Flag indicating if user has call access
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $call = '';

    /**
     * Flag indicating if user has CDR access
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $cdr = '';

    /**
     * Flag indicating if user has originate access
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $originate = '';

    /**
     * Flag indicating if user has reporting access
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $reporting = '';

    /**
     * Flag indicating if user has agent access
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $agent = '';

    /**
     * Flag indicating if user has config access
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $config = '';

    /**
     * Flag indicating if user has dialplan access
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $dialplan = '';

    /**
     * Flag indicating if user has DTMF access
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $dtmf = '';

    /**
     * Flag indicating if user has log access
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $log = '';

    /**
     * Flag indicating if user has system access
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $system = '';

    /**
     * Flag indicating if user has user access
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $user = '';

    /**
     * Flag indicating if user has verbose access
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $verbose = '';

    /**
     * Flag indicating if user has command access.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string  $command = '';

    /**
     * ID of the network filter associated with the user
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $networkfilterid = '';

    /**
     * AMI users description
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    /**
     * Status of the user secret check by weak dictionary (0 = not checked, 1 = ok, 2 = weak).
     *
     * @Column(type="string", nullable=true, default="0")
     */
    public ?string $weakSecret = '0';


    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_AsteriskManagerUsers');
        parent::initialize();
        $this->belongsTo(
            'networkfilterid',
            NetworkFilters::class,
            'id',
            [
                'alias' => 'NetworkFilters',
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
            'username',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisUsernameNotUniqueForStorageModels'),
                ]
            )
        );

        return $this->validate($validation);
    }

    /**
     * Generates a random AMI password.
     *
     * @return string The generated AMI password.
     */
    public static function generateAMIPassword(): string
    {
        $random = new Random();
        $passwordLength = 8;
        try {
            $password = $random->base64Safe($passwordLength);
        } catch (\Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            $password = md5(microtime());
        }
        return $password;
    }
}