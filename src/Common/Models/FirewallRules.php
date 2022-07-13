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

use MikoPBX\Modules\Config\ConfigClass;
use Phalcon\Mvc\Model\Relation;

/**
 * Class FirewallRules
 *
 * @method static mixed findByCategory(string $category)
 *
 * @package MikoPBX\Common\Models
 */
class FirewallRules extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * @Column(type="string", nullable=true){'udp','tcp','icmp'}
     */
    public ?string $protocol = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $portfrom = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $portto = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $networkfilterid = '';

    /**
     * @Column(type="string", nullable=true){'allow','block'}
     */
    public ?string $action = 'allow';

    /**
     * @Column(type="string", nullable=true){'SIP','WEB','SSH','AMI','CTI','ICMP'}
     */
    public ?string $category = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $portFromKey = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $portToKey = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';


    /**
     * Returns array of protected network ports from PbxSettings
     *
     * @return array
     */
    public static function getProtectedPortSet(): array
    {
        $portSet = [
            'RTPPortFrom',
            'RTPPortTo',
            'SIPPort',
            'TLS_PORT',
            'AMIPort',
            'AJAMPort',
            'AJAMPortTLS',
            'WEBPort',
            'WEBHTTPSPort',
            'SSHPort',
        ];
        $result  = [];
        foreach ($portSet as $portName) {
            $result[$portName] = PbxSettings::getValueByKey($portName);
        }

        return $result;
    }


    /**
     * Prepares template with firewall settings
     *
     * @return array[]
     */
    public static function getDefaultRules(): array
    {
        $protectedPortSet = self::getProtectedPortSet();

        $template = [
            'SIP'  => [
                'rules'     => [
                    [
                        'portfrom'    => $protectedPortSet['SIPPort'],
                        'portto'      => $protectedPortSet['SIPPort'],
                        'protocol'    => 'udp',
                        'portFromKey' => 'SIPPort',
                        'portToKey'   => 'SIPPort',
                    ],
                    [
                        'portfrom'    => $protectedPortSet['SIPPort'],
                        'portto'      => $protectedPortSet['SIPPort'],
                        'protocol'    => 'tcp',
                        'portFromKey' => 'SIPPort',
                        'portToKey'   => 'SIPPort',
                    ],
                    [
                        'portfrom'    => $protectedPortSet['TLS_PORT'],
                        'portto'      => $protectedPortSet['TLS_PORT'],
                        'protocol'    => 'tcp',
                        'portFromKey' => 'TLS_PORT',
                        'portToKey'   => 'TLS_PORT',
                    ],
                    [
                        'portfrom'    => $protectedPortSet['RTPPortFrom'],
                        'portto'      => $protectedPortSet['RTPPortTo'],
                        'protocol'    => 'udp',
                        'portFromKey' => 'RTPPortFrom',
                        'portToKey'   => 'RTPPortTo',
                    ],
                ],
                'action'    => 'allow',
                'shortName' => 'SIP & RTP',
            ],
            'WEB'  => [
                'rules'     => [
                    [
                        'portfrom'    => $protectedPortSet['WEBPort'],
                        'portto'      => $protectedPortSet['WEBPort'],
                        'protocol'    => 'tcp',
                        'portFromKey' => 'WEBPort',
                        'portToKey'   => 'WEBPort',
                    ],
                    [
                        'portfrom'    => $protectedPortSet['WEBHTTPSPort'],
                        'portto'      => $protectedPortSet['WEBHTTPSPort'],
                        'protocol'    => 'tcp',
                        'portFromKey' => 'WEBHTTPSPort',
                        'portToKey'   => 'WEBHTTPSPort',
                    ],
                ],
                'action'    => 'allow',
                'shortName' => 'WEB',

            ],
            'SSH'  => [
                'rules'     => [
                    [
                        'portfrom'    => $protectedPortSet['SSHPort'],
                        'portto'      => $protectedPortSet['SSHPort'],
                        'protocol'    => 'tcp',
                        'portFromKey' => 'SSHPort',
                        'portToKey'   => 'SSHPort',
                    ],
                ],
                'action'    => 'allow',
                'shortName' => 'SSH',
            ],
            'AMI'  => [
                'rules'     => [
                    [
                        'portfrom'    => $protectedPortSet['AMIPort'],
                        'portto'      => $protectedPortSet['AMIPort'],
                        'protocol'    => 'tcp',
                        'portFromKey' => 'AMIPort',
                        'portToKey'   => 'AMIPort',
                    ],
                ],
                'action'    => 'allow',
                'shortName' => 'AMI',
            ],
            'AJAM' => [
                'rules'     => [
                    [
                        'portfrom'    => $protectedPortSet['AJAMPort'],
                        'portto'      => $protectedPortSet['AJAMPort'],
                        'protocol'    => 'tcp',
                        'portFromKey' => 'AJAMPort',
                        'portToKey'   => 'AJAMPort',
                    ],
                    [
                        'portfrom'    => $protectedPortSet['AJAMPortTLS'],
                        'portto'      => $protectedPortSet['AJAMPortTLS'],
                        'protocol'    => 'tcp',
                        'portFromKey' => 'AJAMPortTLS',
                        'portToKey'   => 'AJAMPortTLS',
                    ],
                ],
                'action'    => 'allow',
                'shortName' => 'AJAM',
            ],
            'ICMP' => [
                'rules'     => [
                    ['portfrom' => 0, 'portto' => 0, 'protocol' => 'icmp'],
                ],
                'action'    => 'allow',
                'shortName' => 'ICMP',
            ],
        ];


        //Add modules firewall rules
        $configClassObj  = new ConfigClass();
        $additionalRules = $configClassObj->hookModulesMethodWithArrayResult(ConfigClass::GET_DEFAULT_FIREWALL_RULES);
        foreach ($additionalRules as $additionalRuleFromModule) {
            if ($additionalRuleFromModule !== []) {
                $additionalRuleFromModule = array_change_key_case($additionalRuleFromModule, CASE_UPPER);
                foreach ($additionalRuleFromModule as $key => $rule) {
                    $template[$key] = $rule;
                }
            }
        }

        return $template;
    }


    public function initialize(): void
    {
        $this->setSource('m_FirewallRules');
        parent::initialize();
        $this->belongsTo(
            'networkfilterid',
            NetworkFilters::class,
            'id',
            [
                'alias'      => 'NetworkFilters',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );
    }
}

