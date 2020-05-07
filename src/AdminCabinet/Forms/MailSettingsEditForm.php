<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */
namespace MikoPBX\AdminCabinet\Forms;

use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Password;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Form;


class MailSettingsEditForm extends Form
{
    public function initialize($entity = null, $options = null)
    {
        foreach ($options as $key => $value) {
            switch ($key) {
                case 'MailEnableNotifications' :
                case 'MailSMTPUseTLS' :
                case 'MailSMTPCertCheck' :
                    $cheskarr = ['value' => null];
                    if ($value) {
                        $cheskarr = ['checked' => 'checked', 'value' => null];
                    }
                    $this->add(new Check($key, $cheskarr));
                    break;

                case 'MailTplMissedCallBody' :
                case 'MailTplVoicemailBody' :
                case 'MailTplMissedCallFooter' :

                    $this->add(new TextArea($key, [
                        'value' => $value,
                    ]));
                    break;

                case 'MailSMTPPassword' :
                    $this->add(new Password($key, [
                        'value' => $value,
                    ]));
                    break;

                default :
                    $this->add(new Text($key, [
                        'value' => $value,
                    ]));

            }
        }

    }

}