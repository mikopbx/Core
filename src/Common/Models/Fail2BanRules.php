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
    public ?string $maxretry = '5';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $bantime = '86400';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $findtime = '1800';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $whitelist = '';

    public function initialize(): void
    {
        $this->setSource('m_Fail2BanRules');
        parent::initialize();
    }
}