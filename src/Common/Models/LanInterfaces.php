<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
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
     * @Column(type="integer", nullable=true)
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

