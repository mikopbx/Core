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

    public $id;
    public $name;
    public $interface;
    public $vlanid;
    public $subnet;
    public $ipaddr;
    public $gateway;
    public $topology;
    public $extipaddr;
    public $exthostname;
    public $hostname;
    public $domain;
    public $primarydns;
    public $secondarydns;
    public $dhcp;
    public $internet;
    public $disabled;

    public function getSource()
    {
        return 'm_LanInterfaces';
    }


    public function initialize()
    {
	    parent::initialize();
    }
    public function validation()
    {
        $validation = new \Phalcon\Validation();
        $validation->add(array('interface', 'vlanid'), new UniquenessValidator([
            'message' => $this->t("mo_ThisVlanIdNotUniqueForLanInterfacesModels")
        ]));

        return $this->validate($validation);
    }
}

