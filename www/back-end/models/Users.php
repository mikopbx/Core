<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace Models;

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

    public function getSource(): string
    {
        return 'm_Users';
    }

    static function getRoleValues(): array
    {
        return ['Admins', 'Users'];
    }

    static function getLanguages(): array
    {
        return ['ru', 'en', 'de'];
    }

    public function afterSave(): void
    {

        // Обновим кеш для списков выбора если поменяли имя, фамилию сотрудрника
        $this->clearCache('Models\Extensions');
        parent::afterSave();
    }

    public function initialize(): void
    {
        parent::initialize();
        $this->hasMany(
            'id',
            'Models\Extensions',
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


}
