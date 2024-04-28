<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Password;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;

/**
 * Class MailSettingsEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class MailSettingsEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        foreach ($options as $key => $value) {
            switch ($key) {
                case PbxSettingsConstants::MAIL_ENABLE_NOTIFICATIONS :
                case PbxSettingsConstants::MAIL_SMTP_USE_TLS :
                case PbxSettingsConstants::MAIL_SMTP_CERT_CHECK :
                    $cheskarr = ['value' => null];
                    if ($value) {
                        $cheskarr = ['checked' => 'checked', 'value' => null];
                    }
                    $this->add(new Check($key, $cheskarr));
                    break;

                case PbxSettingsConstants::MAIL_TPL_MISSED_CALL_BODY :
                case PbxSettingsConstants::MAIL_TPL_MISSED_CALL_FOOTER :
                case PbxSettingsConstants::MAIL_TPL_VOICEMAIL_BODY :
                case PbxSettingsConstants::MAIL_TPL_VOICEMAIL_FOOTER :

                    $this->add(
                        new TextArea(
                            $key, [
                                'value' => $value,
                            ]
                        )
                    );
                    break;

                case PbxSettingsConstants::MAIL_SMTP_PASSWORD :
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