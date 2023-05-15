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

/**
 * Class Users
 *
 * @method static mixed findFirstByEmail(array|string|int $parameters = null)
 * @property Extensions Extensions
 * @package MikoPBX\Common\Models
 */
class Users extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $email = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $username = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $password = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $role = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $language = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $voicemailpincode = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $ldapauth = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $avatar = '';

    /**
     * Get the available role values.
     *
     * This static method returns an array of available role values, such as 'Admins' and 'Users'.
     *
     * @return array An array of available role values.
     */
    public static function getRoleValues(): array
    {
        return ['Admins', 'Users'];
    }

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_Users');
        parent::initialize();
        $this->hasMany(
            'id',
            Extensions::class,
            'userid',
            [
                'alias' => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::ACTION_CASCADE,
                ],
            ]
        );
    }

    /**
     * Perform actions after the model is saved.
     *
     * This method is called after the model is successfully saved. It updates the cache for selection lists
     * if there are any changes to the employee's name or surname. It clears the cache for the Extensions model
     * by calling the clearCache() method of the ModelsBase class.
     *
     * @return void
     */
    public function afterSave(): void
    {
        ModelsBase::clearCache(Extensions::class);
    }

}
