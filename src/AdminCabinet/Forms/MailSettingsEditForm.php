<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\AdminCabinet\Forms;

use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Password;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;

/**
 * Class MailSettingsEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 */
class MailSettingsEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

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
                case 'MailTplMissedCallFooter' :
                case 'MailTplVoicemailBody' :
                case 'MailTplVoicemailFooter' :

                    $this->add(
                        new TextArea(
                            $key, [
                            'value' => $value,
                        ]
                        )
                    );
                    break;

                case 'MailSMTPPassword' :
                    $this->add(
                        new Password(
                            $key, [
                            'value' => $value,
                        ]
                        )
                    );
                    break;

                default :
                    $this->add(
                        new Text(
                            $key, [
                            'value' => $value,
                        ]
                        )
                    );
            }
        }
    }

}