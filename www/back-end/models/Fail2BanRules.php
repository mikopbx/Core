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
    /**
     * @var integer
     */
    public $id;

    /**
     * @var integer
     */
    public $maxretry;

    /**
     * @var integer
     */
    public $bantime;

    /**
     * @var integer
     */
    public $findtime;

    /**
     * @var string
     */
    public $whitelist;

    public function getSource() :string
    {
        return 'm_Fail2BanRules';
    }

}