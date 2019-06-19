<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */
namespace Models;

class CallDetailRecords extends ModelsBase
{

	public $id;
	public $start;
	public $endtime;
	public $answer;
	public $src_chan;
	public $dst_chan;
	public $dst_num;
	public $UNIQUEID;
	public $linkedid;
	public $did;
	public $disposition;
	public $recordingfile;
	public $from_account;
	public $to_account;
	public $dialstatus;
	public $appname;
	public $transfer;
	public $is_app;
	public $duration;
	public $billsec;
	public $work_completed;

	public function getSource()
	{
		return 'cdr_general';
	}

	public function initialize()
	{
		parent::initialize();
		$this->useDynamicUpdate(true);
		$this->setConnectionService('dbCDR');
	}

}