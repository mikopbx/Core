<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 12 2019
 */
namespace MikoPBX\Common\Models;

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
    public $start;

    /**
     * Time when call ends
     * @Column(type="string", nullable=true)
     */
    public $endtime;

    /**
     * @Column(type="string", nullable=true)
     */
    public $answer;

    /**
     * @Column(type="string", nullable=true)
     */
    public $src_chan;

    /**
     * @Column(type="string", nullable=true)
     */
    public $src_num;

    /**
     * @Column(type="string", nullable=true)
     */
    public $dst_chan;

    /**
     * @Column(type="string", nullable=true)
     */
    public $dst_num;

    /**
     * @Primary
     * @Column(type="string", nullable=true)
     */
    public $UNIQUEID;

    /**
     * @Primary
     * @Column(type="string", nullable=true)
     */
    public $linkedid;

    /**
     * @Column(type="string", nullable=true)
     */
    public $did;

    /**
     * @Column(type="string", nullable=true)
     */
    public $disposition;

    /**
     * @Column(type="string", nullable=true)
     */
    public $recordingfile;

    /**
     * @Column(type="string", nullable=true)
     */
    public $from_account;

    /**
     * @Column(type="string", nullable=true)
     */
    public $to_account;

    /**
     * @Column(type="string", nullable=true)
     */
    public $dialstatus;

    /**
     * @Column(type="string", nullable=true)
     */
    public $appname;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $transfer;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $is_app;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $duration;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $billsec;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $work_completed;

    /**
     * @Column(type="string", nullable=true)
     */
    public $src_call_id;

    /**
     * @Column(type="string", nullable=true)
     */
    public $dst_call_id;


}