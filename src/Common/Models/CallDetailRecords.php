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
 * Class CallDetailRecords
 *
 * @package MikoPBX\Common\Models
 *
 * @Indexes(
 *     [name='UNIQUEID', columns=['UNIQUEID'], type=''],
 *     [name='start', columns=['start'], type=''],
 *     [name='src_chan', columns=['src_chan'], type=''],
 *     [name='dst_chan',columns=['dst_chan'], type=''],
 *     [name='src_num', columns=['src_num'], type=''],
 *     [name='dst_num', columns=['dst_num'], type=''],
 *     [name='linkedid', columns=['linkedid'], type='']
 * )
 */
class CallDetailRecords extends CallDetailRecordsBase
{
    public function initialize(): void
    {
        $this->setSource('cdr_general');
        parent::initialize();
        $this->useDynamicUpdate(true);
        $this->setConnectionService('dbCDR');
    }
}