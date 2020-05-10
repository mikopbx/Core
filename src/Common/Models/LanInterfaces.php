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
 * @method static findFirstByInternet(int $int)
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
    public $name;

    /**
     * @Column(type="string", nullable=true)
     */
    public $interface;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $vlanid;

    /**
     * @Column(type="string", nullable=true)
     */
    public $subnet;

    /**
     * @Column(type="string", nullable=true)
     */
    public $ipaddr;

    /**
     * @Column(type="string", nullable=true)
     */
    public $gateway;

    /**
     * @Column(type="string", nullable=true)
     */
    public $topology;

    /**
     * @Column(type="string", nullable=true)
     */
    public $extipaddr;

    /**
     * @Column(type="string", nullable=true)
     */
    public $exthostname;

    /**
     * @Column(type="string", nullable=true)
     */
    public $hostname;

    /**
     * @Column(type="string", nullable=true)
     */
    public $domain;

    /**
     * @Column(type="string", nullable=true)
     */
    public $primarydns;

    /**
     * @Column(type="string", nullable=true)
     */
    public $secondarydns;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $dhcp;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $internet;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $disabled;

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

