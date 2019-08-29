<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

class IndexController extends BaseController {
    public function initialize():void
    {
        $this->tag->setTitle($this->translation->_('Askozia phone system'));
        parent::initialize();
    }

    public function indexAction()
    {

    }


}
