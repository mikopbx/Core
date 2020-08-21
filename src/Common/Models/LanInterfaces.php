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
    public ?string $name = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $interface = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public  ?string $vlanid = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $subnet = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $ipaddr = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $gateway = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $topology = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $extipaddr = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $exthostname = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $hostname = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $domain = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $primarydns = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $secondarydns = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $dhcp = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $internet = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $disabled = null;

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

