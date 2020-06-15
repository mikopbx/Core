<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 6 2020
 */

namespace MikoPBX\Common\Models;

class CallEventsLogs extends ModelsBase
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
    public $eventtime;

    /**
     * @Column(type="string", nullable=true)
     */
    public $app;

    /**
     * @Column(type="string", nullable=true)
     */
    public $linkedid;

    /**
     * @Column(type="string", nullable=true)
     */
    public $datajson;


    public function initialize(): void
    {
        $this->setSource('call_events');
        parent::initialize();
        $this->useDynamicUpdate(true);
        $this->setConnectionService('dbEventsLog');
    }

}