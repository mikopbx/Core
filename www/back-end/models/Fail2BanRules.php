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
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $maxretry;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $bantime;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $findtime;

    /**
     * @Column(type="string", nullable=true)
     */
    public $whitelist;

    public function getSource(): string
    {
        return 'm_Fail2BanRules';
    }

}