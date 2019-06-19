<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace Models;

class CallEventsLogs extends ModelsBase
{

	public $id;
	public $eventtime;
	public $app;
	public $linkedid;
	public $datajson;

	public function getSource()
	{
		return 'call_events';
	}

	public function initialize()
	{
		parent::initialize();
		$this->useDynamicUpdate(true);
		$this->setConnectionService('dbLog');
	}

}