<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\Common\Models;

use Phalcon\Di;
use Phalcon\Mvc\Model\Relation;
use Phalcon\Mvc\Model\ResultsetInterface;

/**
 * Class NetworkFilters
 *
 * @package MikoPBX\Common\Models
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
     * @Column(type="string", nullable=true)
     */
    public ?string $permit = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $deny = '';

    /**
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $newer_block_ip = '0';

    /**
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $local_network = '0';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    /**
     * Вернуть список подсетей с разрешенным типом трафика
     *
     * @param array $arrTrafficCategory
     *
     * @return ResultsetInterface
     */
    public static function getAllowedFiltersForType(array $arrTrafficCategory): ResultsetInterface
    {
        $di         = DI::getDefault();
        $parameters = [
            'models'     => [
                'NetworkFilters' => __CLASS__,
            ],
            'conditions' => 'FirewallRules.category in ({arrkeys:array}) and FirewallRules.action="allow"',
            'bind'       => [
                'arrkeys' => $arrTrafficCategory,
            ],
            'joins'      => [
                'FirewallRules' => [
                    0 => FirewallRules::class,
                    1 => 'FirewallRules.networkfilterid=NetworkFilters.id',
                    2 => 'FirewallRules',
                    3 => 'INNER',
                ],
            ],
        ];
        $query      = $di->get('modelsManager')->createBuilder($parameters)->getQuery();

        return $query->execute();
    }

    public function initialize(): void
    {
        $this->setSource('m_NetworkFilters');
        parent::initialize();
        $this->hasMany(
            'id',
            Sip::class,
            'networkfilterid',
            [
                'alias'      => 'Sip',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );
        $this->hasMany(
            'id',
            FirewallRules::class,
            'networkfilterid',
            [
                'alias'      => 'FirewallRules',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::ACTION_CASCADE,
                ],
            ]
        );
        $this->hasMany(
            'id',
            AsteriskManagerUsers::class,
            'networkfilterid',
            [
                'alias'      => 'AsteriskManagerUsers',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );
    }

}

