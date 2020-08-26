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
 * Class Codecs
 *
 * @package MikoPBX\Common\Models
 */
class Codecs extends ModelsBase
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
    public ?string $name = null;

    /**
     * Audio or Video codec
     * @Column(type="string", nullable=false)
     */
    public string $type='audio';

    /**
     * @Column(type="integer", nullable=false, default='1')
     */
    public string $priority='1';

    /**
     * @Column(type="integer", nullable=false, default=0)
     */
    public string $disabled='0';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $description = null;

    public function initialize(): void
    {
        $this->setSource('m_Codecs');
        parent::initialize();
    }
}