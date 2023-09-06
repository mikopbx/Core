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
use MikoPBX\Core\System\Util;

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

        $this->view->simplePasswords = $this->getSimplePasswords($pbxSettings);
    }

    private function getSimplePasswords($data):array
    {
        $passwordCheckFail = [];
        $CloudInstanceId = $data['CloudInstanceId']??'';
        foreach (['SSHPassword', 'WebAdminPassword'] as $value){
            if( !isset($data[$value]) ){
                continue;
            }
            if($CloudInstanceId === $data[$value] || Util::isSimplePassword($data[$value])){
                $passwordCheckFail[] = $value;
            }
        }
        return $passwordCheckFail;
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
        if($data['SSHDisablePasswordLogins' ] !== 'on'){
            $passwordCheckFail = $this->getSimplePasswords($data);
            if(!empty($passwordCheckFail)){
                $this->view->message = [
                    'error' => $this->translation->_('gs_SetPasswordInfo')
                ];
                $this->view->success = false;
                $this->view->passwordCheckFail = $passwordCheckFail;
                return;
            }
        }

        $pbxSettings = PbxSettings::getDefaultArrayValues();
        if(isset($data['SSHPassword'])){
            // Если отправили пароль по-умолчанию, то сделаем его хэш равным хэш пароля WEB
            if($data['SSHPassword'] === $pbxSettings['SSHPassword']){
                $data['SSHPasswordHash'] = md5($data['WebAdminPassword']);
            }else{
                $data['SSHPasswordHash'] = md5($data['SSHPassword']);
            }
        }
        $this->db->begin();
        foreach ($pbxSettings as $key => $value) {
            switch ($key) {
                case 'PBXRecordCalls':
                case 'PBXRecordCallsInner':
                case 'AJAMEnabled':
                case 'AMIEnabled':
                case 'RestartEveryNight':
                case 'RedirectToHttps':
                case 'PBXSplitAudioThread':
                case 'UseWebRTC':
                case 'SSHDisablePasswordLogins':
                case 'PBXAllowGuestCalls':
                case '***ALL CHECK BOXES ABOVE***':
                    $newValue = ($data[$key] === 'on') ? '1' : '0';
                    break;
                case 'SSHPassword':
                    // Если отправили пароль по-умолчанию, то сделаем его равным паролю WEB
                    if ($data[$key] === $value) {
                        $newValue = $data['WebAdminPassword'];
                    } else {
                        $newValue = $data[$key];
                    }
                    break;
                case 'SendMetrics':
                    $newValue = ($data[$key] === 'on') ? '1' : '0';
                    $this->session->set('SendMetrics', $newValue);
                    break;
                case 'PBXFeatureTransferDigitTimeout':
                    $newValue = ceil((int)$data['PBXFeatureDigitTimeout']/1000);
                    break;
                default:
                    $newValue = $data[$key];
            }

            if (array_key_exists($key, $data)) {
                $record = PbxSettings::findFirstByKey($key);
                if ($record === null) {
                    $record        = new PbxSettings();
                    $record->key   = $key;
                } elseif ($record->key === $key
                    && $record->value === $newValue) {
                    continue;
                }
                $record->value = $newValue;

                if ($record->save() === false) {
                    $errors = $record->getMessages();
                    $this->flash->warning(implode('<br>', $errors));
                    $this->view->success = false;
                    $this->db->rollback();

                    return;
                }
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