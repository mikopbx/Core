<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\Common\Models;

/**
 * Class Fail2BanRules
 *
 * @package MikoPBX\Common\Models
 */
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
    public ?string $maxretry = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $bantime = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $findtime = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $whitelist = null;

    public function initialize(): void
    {
        $this->setSource('m_Fail2BanRules');
        parent::initialize();
    }
}