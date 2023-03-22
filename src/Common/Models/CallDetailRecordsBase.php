<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
 * Class CallDetailRecordsBase
 *
 * @package MikoPBX\Common\Models
 *
 */
abstract class CallDetailRecordsBase extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Time call starts
     * @Column(type="string", nullable=true)
     */
    public ?string $start = '';

    /**
     * Time when call ends
     * @Column(type="string", nullable=true)
     */
    public ?string $endtime = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $answer = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $src_chan = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $src_num = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $dst_chan = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $dst_num = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $UNIQUEID = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $linkedid = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $did = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $disposition = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $recordingfile = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $from_account = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $to_account = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $dialstatus = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $appname = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $transfer = '';

    /**
     * @Column(type="string", length=1, nullable=true)
     */
    public ?string $is_app = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $duration = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $billsec = '';

    /**
     * @Column(type="string", length=1, nullable=true)
     */
    public ?string $work_completed = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $src_call_id = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $dst_call_id = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $verbose_call_id = '';

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $a_transfer = '0';
}