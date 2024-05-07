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

use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * Class LanInterfaces
 *
 * @method static findFirstByInternet(int $int)
 *
 * @package MikoPBX\Common\Models
 */
class LanInterfaces extends ModelsBase
{
    const TOPOLOGY_PUBLIC = 'public';
    const TOPOLOGY_PRIVATE = 'private';

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Name of the LAN interface
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $name = '';

    /**
     * Interface system name
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $interface = '';

    /**
     * VLAN ID
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $vlanid = '0';

    /**
     * Subnet
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $subnet = '';

    /**
     * IP address
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $ipaddr = '';

    /**
     * Gateway
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $gateway = '';

    /**
     * Topology
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $topology = '';

    /**
     * External IP address
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $extipaddr = '';

    /**
     * External hostname
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $exthostname = '';

    /**
     * Hostname
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $hostname = '';

    /**
     * Domain name
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $domain = '';

    /**
     * Primary DNS server
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $primarydns = '';

    /**
     * Secondary DNS server
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $secondarydns = '';

    /**
     * DHCP enabled flag
     *
     * @Column(type="string", length=1, nullable=false)
     */
    public ?string $dhcp = '1';

    /**
     * The interface has the Internet connection flag
     *
     * @Column(type="string", length=1, nullable=false)
     */
    public ?string $internet = '0';

    /**
     * Disabled flag
     *
     * @Column(type="string", length=1, nullable=false)
     */
    public ?string $disabled = '0';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_LanInterfaces');
        parent::initialize();
    }

    /**
     * Perform validation on the model.
     *
     * @return bool Whether the validation was successful or not.
     */
    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add(
            ['interface', 'vlanid'],
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisVlanIdNotUniqueForLanInterfacesModels'),
                ]
            )
        );

        return $this->validate($validation);
    }
}

