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

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\GeneralSettingsEditForm;
use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Models\PbxSettings;

class GeneralSettingsController extends BaseController
{

    /**
     * Builds general settings form
     */
    public function modifyAction(): void
    {
        $audioCodecs     = Codecs::find(['conditions'=>'type="audio"'])->toArray();
        usort($audioCodecs, [__CLASS__, 'sortArrayByPriority']);
        $this->view->audioCodecs = $audioCodecs;
        $videoCodecs     = Codecs::find(['conditions'=>'type="video"'])->toArray();
        usort($videoCodecs, [__CLASS__, 'sortArrayByPriority']);
        $this->view->videoCodecs = $videoCodecs;
        $pbxSettings            = PbxSettings::getAllPbxSettings();
        $this->view->form       = new GeneralSettingsEditForm(null, $pbxSettings);
        $this->view->submitMode = null;
    }



    /**
     * Сохранение настроек системы
     */
    public function saveAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }
        $data        = $this->request->getPost();
        $pbxSettings = PbxSettings::getDefaultArrayValues();
        $this->db->begin();
        foreach ($pbxSettings as $key => $value) {
            $record = PbxSettings::findFirstByKey($key);
            if ($record === null) {
                $record        = new PbxSettings();
                $record->key   = $key;
                $record->value = $value;
            }

            switch ($key) {
                case 'PBXRecordCalls':
                case 'AJAMEnabled':
                case 'AMIEnabled':
                case 'RestartEveryNight':
                case 'RedirectToHttps':
                case 'PBXSplitAudioThread':
                case 'PBXAllowGuestCalls':
                case '***ALL CHECK BOXES ABOVE***':
                    $record->value = ($data[$key] === 'on') ? '1' : '0';
                    break;
                case 'SSHPassword':
                    //Если отправили пароль по-умолчанию, то сделаем его равным паролю WEB
                    if ($data[$key] === $pbxSettings[$key]) {
                        $record->value = $data['WebAdminPassword'];
                    } else {
                        $record->value = $data[$key];
                    }
                    break;
                case 'SendMetrics':
                    $record->value = ($data[$key] === 'on') ? '1' : '0';
                    $this->session->set('SendMetrics', $record->value);
                    break;
                case 'PBXFeatureTransferDigitTimeout':
                    $record->value = ceil((int)$data['PBXFeatureDigitTimeout']/1000);
                    break;
                default:
                    if (array_key_exists($key, $data)) {
                        $record->value = $data[$key];
                    }
            }
            if ($record->save() === false) {
                $errors = $record->getMessages();
                $this->flash->warning(implode('<br>', $errors));
                $this->view->success = false;
                $this->db->rollback();

                return;
            }
        }

        $codecs = json_decode($data['codecs'], true);
        foreach ($codecs as $codec){
           $record = Codecs::findFirstById($codec['codecId']);
           $record->priority = $codec['priority'];
           $record->disabled = $codec['disabled']===true?'1':'0';
           $record->update();
        }

        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
        $this->db->commit();
    }

}