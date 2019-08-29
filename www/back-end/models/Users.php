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
     * @var integer
     */
    public $id;

    /**
     * @var string
     */
    public $email;

    /**
     * @var string
     */
    public $username;

    /**
     * @var string
     */
    public $password;

    /**
     * @var string
     */
    public $role;

    /**
     * @var string
     */
    public $language;

    /**
     * @var string
     */
    public $voicemailpincode;

    /**
     * @var string
     */
    public $ldapauth;

    /**
     * @var string
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
