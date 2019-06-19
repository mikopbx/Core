<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace Models;


class Fail2BanRules extends ModelsBase
{
    public $id;
    public $maxretry;
    public $bantime;
    public $findtime;
    public $whitelist;

    public function getSource()
    {
        return 'm_Fail2BanRules';
    }

    public function initialize() {
	    parent::initialize();
    }
}