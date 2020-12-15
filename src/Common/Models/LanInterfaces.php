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
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $name = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $interface = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $vlanid = '0';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $subnet = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $ipaddr = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $gateway = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $topology = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $extipaddr = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $exthostname = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $hostname = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $domain = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $primarydns = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $secondarydns = '';

    /**
     * @Column(type="string", length=1, nullable=false)
     */
    public ?string $dhcp = '1';

    /**
     * @Column(type="string", length=1, nullable=false)
     */
    public ?string $internet = '0';

    /**
     * @Column(type="string", length=1, nullable=false)
     */
    public ?string $disabled = '0';

    public function initialize(): void
    {
        $this->setSource('m_LanInterfaces');
        parent::initialize();
    }

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

