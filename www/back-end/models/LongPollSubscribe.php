<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 1 2020
 */

namespace Models;

class LongPollSubscribe extends ModelsBase{

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * @Column(type="string", nullable=true)
     */
    public $action;

    /**
     * @Column(type="string", nullable=true)
     */
    public $data;

    /**
     * @Column(type="string", nullable=true)
     */
    public $channel;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $timeout;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $enable;

    public function getSource(): string
    {
        return 'm_LongPollSubscribe';
    }

}