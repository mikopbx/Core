<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2019
 *
 */
namespace Models;

abstract class CallDetailRecordsBase extends ModelsBase
{

    /**
     * @var integer
     */
    public $id;

    /**
     * Time call starts
     * @var string
     */
    public $start;

    /**
     * Time when call ends
     * @var string
     */
    public $endtime;

    /**
     * @var string
     */
    public $answer;

    /**
     * @var string
     */
    public $src_chan;

    /**
     * @var string
     */
    public $dst_chan;

    /**
     * @var string
     */
    public $dst_num;

    /**
     * @var string
     */
    public $UNIQUEID;

    /**
     * @var string
     */
    public $linkedid;

    /**
     * @var string
     */
    public $did;

    /**
     * @var string
     */
    public $disposition;

    /**
     * @var string
     */
    public $recordingfile;

    /**
     * @var string
     */
    public $from_account;

    /**
     * @var string
     */
    public $to_account;

    /**
     * @var string
     */
    public $dialstatus;

    /**
     * @var string
     */
    public $appname;

    /**
     * @var integer
     */
    public $transfer;

    /**
     * @var integer
     */
    public $is_app;

    /**
     * @var integer
     */
    public $duration;

    /**
     * @var integer
     */
    public $billsec;

    /**
     * @var integer
     */
    public $work_completed;


}