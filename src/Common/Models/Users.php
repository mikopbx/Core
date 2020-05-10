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
    public $email;

    /**
     * @Column(type="string", nullable=true)
     */
    public $username;

    /**
     * @Column(type="string", nullable=true)
     */
    public $password;

    /**
     * @Column(type="string", nullable=true)
     */
    public $role;

    /**
     * @Column(type="string", nullable=true)
     */
    public $language;

    /**
     * @Column(type="string", nullable=true)
     */
    public $voicemailpincode;

    /**
     * @Column(type="string", nullable=true)
     */
    public $ldapauth;

    /**
     * @Column(type="string", nullable=true)
     */
    public $avatar;

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
        // Обновим кеш для списков выбора если поменяли имя, фамилию сотрудрника
        $this->clearCache(Extensions::class);
        parent::afterSave();
    }

}
