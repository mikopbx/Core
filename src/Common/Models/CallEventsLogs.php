<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 6 2020
 */

namespace MikoPBX\Common\Models;

/**
 * Class CallEventsLogs
 *
 * @package MikoPBX\Common\Models
 */
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
    public ?string $eventtime = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $app = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $linkedid = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $datajson = '';


    public function initialize(): void
    {
        $this->setSource('call_events');
        parent::initialize();
        $this->useDynamicUpdate(true);
        $this->setConnectionService('dbEventsLog');
    }

    public function getIndexColumn(): array{
        return ['eventtime', 'linkedid', 'app'];
    }
}