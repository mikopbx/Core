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

use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di\Di;
use Phalcon\Mvc\Model\Relation;
use Phalcon\Mvc\Model\ResultsetInterface;

/**
 * Class NetworkFilters
 *
 * @package MikoPBX\Common\Models
 * @property Sip $Sip
 * @property FirewallRules $FirewallRules
 * @property AsteriskManagerUsers $AsteriskManagerUsers
 * @property Iax $Iax
 * @property ApiKeys $ApiKeys
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
     * Priority for rule ordering (lower number = higher priority).
     * Used for drag-drop reordering in the firewall UI.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $priority = '0';

    /**
     * networkfilterid value of AMI users and API keys restricted to local connections
     */
    public const string LOCALHOST_FILTER_ID = 'localhost';

    /**
     * Networks of both address families, in the comma-separated form Asterisk ACLs accept
     */
    public const string ACL_LOCALHOST = '127.0.0.1/32,::1/128';
    public const string ACL_ANY = '0.0.0.0/0,::/0';

    /**
     * Resolves permit/deny networks of the filter a record is bound to
     *
     * An empty id ('', '0', 'none') means no restriction, 'localhost' allows local connections only.
     * A reference to a deleted filter must not silently drop the restriction, so it resolves to the
     * localhost-only ACL as well.
     *
     * @param string|null $filterId Value of the record's networkfilterid
     * @param string $owner Record description for the log, e.g. "SIP peer 201"
     *
     * @return array{permit: string, deny: string}
     */
    public static function getAclByFilterId(?string $filterId, string $owner): array
    {
        if (empty($filterId) || $filterId === 'none') {
            return ['permit' => '', 'deny' => ''];
        }
        $localhostOnly = ['permit' => self::ACL_LOCALHOST, 'deny' => self::ACL_ANY];
        if ($filterId === self::LOCALHOST_FILTER_ID) {
            return $localhostOnly;
        }
        $filter = self::findFirstById($filterId);
        if ($filter === null) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "$owner references missing network filter $filterId, access is limited to localhost",
                LOG_WARNING
            );
            return $localhostOnly;
        }
        return ['permit' => (string)$filter->permit, 'deny' => (string)$filter->deny];
    }

    /**
     * Returns allowed networks for provided list of traffic categories
     *
     * @param array<string> $arrTrafficCategory
     *
     * @return ResultsetInterface
     */
    public static function getAllowedFiltersForType(array $arrTrafficCategory): ResultsetInterface
    {
        $di = DI::getDefault();
        if ($di === null) {
            throw new \RuntimeException('DI container is not available');
        }
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
        // A record restricted by a filter must not silently lose the restriction when the filter is deleted
        $this->hasMany(
            'id',
            Sip::class,
            'networkfilterid',
            [
                'alias' => 'Sip',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action' => Relation::ACTION_RESTRICT,
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
                    'action' => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasMany(
            'id',
            Iax::class,
            'networkfilterid',
            [
                'alias' => 'Iax',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action' => Relation::ACTION_RESTRICT,
                ],
            ]
        );
        $this->hasMany(
            'id',
            ApiKeys::class,
            'networkfilterid',
            [
                'alias' => 'ApiKeys',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action' => Relation::ACTION_RESTRICT,
                ],
            ]
        );
    }

    /**
     * Validate the model before saving
     *
     * @return bool True if validation passes, false otherwise
     */
    public function beforeValidation(): bool
    {
        // Validate permit field (IPv4 or IPv6 CIDR)
        if (!empty($this->permit)) {
            $cidrInfo = \MikoPBX\Core\Utilities\IpAddressHelper::normalizeCidr($this->permit);
            if ($cidrInfo === false) {
                $this->appendMessage(new \Phalcon\Messages\Message(
                    'Invalid permit network CIDR notation',
                    'permit'
                ));
                return false;
            }
        }

        // Validate deny field
        if (!empty($this->deny)) {
            $cidrInfo = \MikoPBX\Core\Utilities\IpAddressHelper::normalizeCidr($this->deny);
            if ($cidrInfo === false) {
                $this->appendMessage(new \Phalcon\Messages\Message(
                    'Invalid deny network CIDR notation',
                    'deny'
                ));
                return false;
            }
        }

        return true;
    }

}

