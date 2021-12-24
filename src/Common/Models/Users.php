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
 * @property \MikoPBX\Common\Models\Extensions Extensions
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
    public ?string  $voicemailpincode = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $ldapauth = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $avatar = '';

    public static function getRoleValues(): array
    {
        return ['Admins', 'Users'];
    }

    public function initialize(): void
    {
        $this->setSource('m_Users');
        parent::initialize();
        $this->hasMany(
            'id',
            Extensions::class,
            'userid',
            [
                'alias'      => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE,
                ],
            ]
        );
    }

    public function afterSave(): void
    {
        // Обновим кеш для списков выбора если поменяли имя, фамилию сотрудника
        ModelsBase::clearCache(Extensions::class);
    }

}
