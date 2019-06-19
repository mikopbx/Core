<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

use Phalcon\Forms\Form;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\File;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Select;

class SoundFilesEditForm extends Form
{
    public function initialize($entity = null, $options = null)
    {
        foreach ($entity as $key=>$value){
            switch ($key){

                case "id":
	            case "path":
	            case "***ALL HIDDEN ABOVE***":
                    $this->add(new Hidden($key));
                    break;
                default:
                    $this->add(new Text($key));
            }

        }
    }
}