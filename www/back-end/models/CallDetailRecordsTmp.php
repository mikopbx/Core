<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace Models;

class CallDetailRecordsTmp extends CallDetailRecordsBase
{

    public function getSource(): string
    {
        return 'cdr';
    }

    public function initialize(): void
    {
        parent::initialize();
        $this->useDynamicUpdate(true);
        $this->setConnectionService('dbCDR');
    }

}