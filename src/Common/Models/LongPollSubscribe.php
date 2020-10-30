<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 1 2020
 */

namespace MikoPBX\Common\Models;

/**
 * Class LongPollSubscribe
 *
 * @package MikoPBX\Common\Models
 */
class LongPollSubscribe extends ModelsBase
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
    public ?string $action = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $data = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $channel = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $timeout = '';

    /**
     *  @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $enable = '0';


    public function initialize(): void
    {
        $this->setSource('m_LongPollSubscribe');
        parent::initialize();
    }
}