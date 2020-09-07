<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\Common\Models;

/**
 * Class CallDetailRecordsBase
 *
 * @package MikoPBX\Common\Models
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
     * @Column(type="integer", nullable=true)
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
     * @Column(type="integer", nullable=true)
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

    public function getIndexColumn():array {
        return ['UNIQUEID', 'src_chan', 'dst_chan', 'linkedid', 'start', 'src_num', 'dst_num'];
    }

}