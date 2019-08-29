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

    /**
     * @var integer
     */
	public $id;

    /**
     * @var string
     */
	public $eventtime;

    /**
     * @var string
     */
	public $app;

	/**
     * @var string
     */
	public $linkedid;

    /**
     * @var string
     */
	public $datajson;

	public function getSource() :string
	{
		return 'call_events';
	}

	public function initialize(): void
	{
		parent::initialize();
		$this->useDynamicUpdate(true);
		$this->setConnectionService('dbLog');
	}

}