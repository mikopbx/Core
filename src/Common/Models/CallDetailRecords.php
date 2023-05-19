<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
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
    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('cdr_general');
        parent::initialize();
        $this->useDynamicUpdate(true);
        $this->setConnectionService('dbCDR');
    }
}