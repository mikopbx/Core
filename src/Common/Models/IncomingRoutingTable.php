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
 * Class IncomingRoutingTable
 *
 * @package MikoPBX\Common\Models
 */
class IncomingRoutingTable extends ModelsBase
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
    public ?string $rulename = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $number = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $extension = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $provider = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $priority = '0';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $timeout = '30';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $action = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $note = '';

    /**
     * Resets default rule to busy action
     */
    public static function resetDefaultRoute(): IncomingRoutingTable
    {
        $defaultRule = self::find('priority=9999');
        foreach ($defaultRule as $rule) {
            $rule->delete();
        }
        $defaultRule = self::findFirstById(1);
        if ($defaultRule === null) {
            $defaultRule = new self();
            $defaultRule->id = 1;
        }
        $defaultRule->action = 'busy';
        $defaultRule->priority = 9999;
        $defaultRule->rulename = 'default action';
        $defaultRule->save();
        return $defaultRule;
    }

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_IncomingRoutingTable');
        parent::initialize();
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            [
                'alias' => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION,
                ],
            ]
        );

        $this->belongsTo(
            'provider',
            Providers::class,
            'uniqid',
            [
                'alias' => 'Providers',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action' => Relation::NO_ACTION,
                ],
            ]
        );
    }

}

