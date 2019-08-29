<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace Models;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

class LanInterfaces extends ModelsBase
{
    /**
     * @var integer
     */
    public $id;

    /**
     * @var string
     */
    public $name;

    /**
     * @var string
     */
    public $interface;

    /**
     * @var integer
     */
    public $vlanid;

    /**
     * @var string
     */
    public $subnet;

    /**
     * @var string
     */
    public $ipaddr;

    /**
     * @var string
     */
    public $gateway;

    /**
     * @var string
     */
    public $topology;

    /**
     * @var string
     */
    public $extipaddr;

    /**
     * @var string
     */
    public $exthostname;

    /**
     * @var string
     */
    public $hostname;

    /**
     * @var string
     */
    public $domain;

    /**
     * @var string
     */
    public $primarydns;

    /**
     * @var string
     */
    public $secondarydns;

    /**
     * @var integer
     */
    public $dhcp;

    /**
     * @var integer
     */
    public $internet;

    /**
     * @var integer
     */
    public $disabled;

    public function getSource() :string
    {
        return 'm_LanInterfaces';
    }


    public function validation() :bool
    {
        $validation = new \Phalcon\Validation();
        $validation->add(array('interface', 'vlanid'), new UniquenessValidator([
            'message' => $this->t('mo_ThisVlanIdNotUniqueForLanInterfacesModels')
        ]));

        return $this->validate($validation);
    }
}

