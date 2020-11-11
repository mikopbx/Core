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

/**
 * Class Users
 *
 * @method static mixed findFirstByEmail(array|string|int $parameters = null)
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
        // Обновим кеш для списков выбора если поменяли имя, фамилию сотрудрника
        self::clearCache(Extensions::class);
        parent::afterSave();
    }

}
