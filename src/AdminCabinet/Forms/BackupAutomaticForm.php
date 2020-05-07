<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */
namespace MikoPBX\AdminCabinet\Forms;

use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Password;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Form;


class BackupAutomaticForm extends Form
{

    public function initialize($entity = null, $options = null)
    {
        foreach ($entity as $key => $value) {
            switch ($key) {

                case "id":
                case "***ALL HIDDEN ABOVE***":
                    $this->add(new Hidden($key));
                    break;
                case "ftp_secret":
                    $this->add(new Password($key));
                    break;
                case "keep_older_versions":
                case "ftp_port":
                case "***ALL INTEGER ABOVE***":
                    $this->add(new Numeric($key));
                    break;
                case "every":
                    $action = new Select($key, $options['week-days'], [
                        'using'    => [
                            'id',
                            'name',
                        ],
                        'useEmpty' => false,
                        'value'    => empty($entity->$key) ? 0 : $value,
                        'class'    => 'ui selection dropdown',
                    ]);
                    $this->add($action);
                    break;
                case "ftp_sftp_mode":
                case "enabled":
                    $cheskarr = ['value' => null];
                    if ($entity->$key === "1") {
                        $cheskarr = ['checked' => 'checked', 'value' => null];
                    }
                    $this->add(new Check($key, $cheskarr));
                    break;
                default:
                    $this->add(new Text($key));
            }
        }
    }
}