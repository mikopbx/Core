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

use Phalcon\Di;
use Phalcon\Mvc\Model\Relation;
use Phalcon\Mvc\Model\ResultsetInterface;

/**
 * Class NetworkFilters
 *
 * @package MikoPBX\Common\Models
 * @property Sip Sip
 * @property FirewallRules FirewallRules
 * @property AsteriskManagerUsers AsteriskManagerUsers
 */
class NetworkFilters extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Specifies the permitted IP addresses or networks.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $permit = '';

    /**
     * Specifies the denied IP addresses or networks.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $deny = '';

    /**
     * This flag means that this subnet is included in the trusted list,
     * and addresses from this subnet will never be blocked by Fail2Ban.
     *
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $newer_block_ip = '0';

    /**
     * This flag indicates that this record describes addresses of the local subnet
     *
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $local_network = '0';

    /**
     * A description of the network filter.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    /**
     * Returns allowed networks for provided list of traffic categories
     *
     * @param array $arrTrafficCategory
     *
     * @return ResultsetInterface
     */
    public static function getAllowedFiltersForType(array $arrTrafficCategory): ResultsetInterface
    {
        $di = DI::getDefault();
        $parameters = [
            'models' => [
                'NetworkFilters' => __CLASS__,
            ],
            'conditions' => 'FirewallRules.category in ({arrkeys:array}) and FirewallRules.action="allow"',
            'bind' => [
                'arrkeys' => $arrTrafficCategory,
            ],
            'joins' => [
                'FirewallRules' => [
                    0 => FirewallRules::class,
                    1 => 'FirewallRules.networkfilterid=NetworkFilters.id',
                    2 => 'FirewallRules',
                    3 => 'INNER',
                ],
            ],
        ];
        $query = $di->get('modelsManager')->createBuilder($parameters)->getQuery();

        return $query->execute();
    }

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_NetworkFilters');
        parent::initialize();
        $this->hasMany(
            'id',
            Sip::class,
            'networkfilterid',
            [
                'alias' => 'Sip',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action' => Relation::NO_ACTION,
                ],
            ]
        );
        $this->hasMany(
            'id',
            FirewallRules::class,
            'networkfilterid',
            [
                'alias' => 'FirewallRules',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action' => Relation::ACTION_CASCADE,
                ],
            ]
        );
        $this->hasMany(
            'id',
            AsteriskManagerUsers::class,
            'networkfilterid',
            [
                'alias' => 'AsteriskManagerUsers',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action' => Relation::NO_ACTION,
                ],
            ]
        );
    }

}

