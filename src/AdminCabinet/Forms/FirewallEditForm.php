<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */
namespace MikoPBX\AdminCabinet\Forms;

use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Form;

class FirewallEditForm extends Form
{
    public function initialize($entity = null, $options = null): void
    {
        $this->add(new Hidden('id'));
        $this->add(new Text('description'));
        $this->add(new Text('network', ['value' => $options['network']]));

        // Выбор подсети интерфейса
        $arrMasks = [
            "0"  => "0 - 0.0.0.0",
            "1"  => "1 - 128.0.0.0",
            "2"  => "2 - 192.0.0.0",
            "3"  => "3 - 224.0.0.0",
            "4"  => "4 - 240.0.0.0",
            "5"  => "5 - 248.0.0.0",
            "6"  => "6 - 252.0.0.0",
            "7"  => "7 - 254.0.0.0",
            "8"  => "8 - 255.0.0.0",
            "9"  => "9 - 255.128.0.0",
            "10" => "10 - 255.192.0.0",
            "11" => "11 - 255.224.0.0",
            "12" => "12 - 255.240.0.0",
            "13" => "13 - 255.248.0.0",
            "14" => "14 - 255.252.0.0",
            "15" => "15 - 255.254.0.0",
            "16" => "16 - 255.255.0.0",
            "17" => "17 - 255.255.128.0",
            "18" => "18 - 255.255.192.0",
            "19" => "19 - 255.255.224.0",
            "20" => "20 - 255.255.240.0",
            "21" => "21 - 255.255.248.0",
            "22" => "22 - 255.255.252.0",
            "23" => "23 - 255.255.254.0",
            "24" => "24 - 255.255.255.0",
            "25" => "25 - 255.255.255.128",
            "26" => "26 - 255.255.255.192",
            "27" => "27 - 255.255.255.224",
            "28" => "28 - 255.255.255.240",
            "29" => "29 - 255.255.255.248",
            "30" => "30 - 255.255.255.252",
            "31" => "31 - 255.255.255.254",
            "32" => "32 - 255.255.255.255",
        ];
        $mask     = new Select('subnet', $arrMasks, [
            'using'    => [
                'id',
                'name',
            ],
            'useEmpty' => false,
            'value'    => $options['subnet'],
            'class'    => 'ui selection dropdown ipaddress',
        ]);
        $this->add($mask);

        // Newer_block_ip
        $cheskarr = ['value' => null];
        if ($entity->newer_block_ip) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }

        $this->add(new Check('newer_block_ip', $cheskarr));


        // Local_network
        $cheskarr = ['value' => null];
        if ($entity->local_network) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }

        $this->add(new Check('local_network', $cheskarr));


    }
}