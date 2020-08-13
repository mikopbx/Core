<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\Common\Models;

use Phalcon\Mvc\Model\Relation;

class Codecs extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * @Column(type="string", nullable=false)
     */
    public $name;

    /**
     * Audio or Video codec
     * @Column(type="string", nullable=false)
     */
    public $type;

    /**
     * @Column(type="integer", nullable=false, default=1)
     */
    public $priority;

    /**
     * @Column(type="integer", nullable=false, default=0)
     */
    public $disabled;

    /**
     * @Column(type="string", nullable=true)
     */
    public $description;

    public function initialize(): void
    {
        $this->setSource('m_Codecs');
        parent::initialize();
    }
}