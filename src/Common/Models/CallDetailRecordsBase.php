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
     * Time when the call starts.
     * @Column(type="string", nullable=true)
     */
    public ?string $start = '';

    /**
     * Time when the call ends.
     * @Column(type="string", nullable=true)
     */
    public ?string $endtime = '';

    /**
     * Answer status of the call.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $answer = '';

    /**
     * Source channel of the call.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $src_chan = '';

    /**
     * Source number of the call.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $src_num = '';

    /**
     * Destination channel of the call.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $dst_chan = '';

    /**
     * Destination number of the call.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $dst_num = '';

    /**
     * Unique ID of the call.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $UNIQUEID = '';

    /**
     * Linked ID of the call.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $linkedid = '';

    /**
     * DID (Direct Inward Dialing) of the call.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $did = '';

    /**
     * Disposition of the call.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $disposition = '';

    /**
     * Recording file of the call.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $recordingfile = '';

    /**
     *  Source account of the call.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $from_account = '';

    /**
     * Destination account of the call.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $to_account = '';

    /**
     * Dial status of the call.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $dialstatus = '';

    /**
     * Application name of the call.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $appname = '';

    /**
     *  Transfer status of the call.
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $transfer = '';

    /**
     * Indicator if the call is associated with an application.
     *
     * @Column(type="string", length=1, nullable=true)
     */
    public ?string $is_app = '';

    /**
     * Duration of the call in seconds.
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $duration = '';

    /**
     * Duration of the call in billing seconds.
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $billsec = '';

    /**
     * Indicator if the work is completed.
     *
     * @Column(type="string", length=1, nullable=true)
     */
    public ?string $work_completed = '';

    /**
     * Source call ID.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $src_call_id = '';

    /**
     * Destination call ID.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $dst_call_id = '';

    /**
     *  Verbose call ID.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $verbose_call_id = '';

    /**
     *  Indicator if the call is a transferred call.
     *
     * @Column(type="integer", nullable=true)
     */
    public ?string $a_transfer = '0';
}