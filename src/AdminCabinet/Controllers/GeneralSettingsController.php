<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\GeneralSettingsEditForm;
use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Models\PbxSettings;

class GeneralSettingsController extends BaseController
{

    /**
     * Построение формы настроек
     */
    public function modifyAction(): void
    {
        $parameters = [
            'conditions'=>'type="audio"',
        ];
        $this->view->audioCodecs     = Codecs::find($parameters);
        usort($this->view->audioCodecs, [__CLASS__, 'sortArrayByPriority']);
        $parameters['conditions'] = 'type="video"';
        $this->view->videoCodecs     = Codecs::find($parameters);
        usort($this->view->videoCodecs, [__CLASS__, 'sortArrayByPriority']);

        $pbxSettings            = PbxSettings::getAllPbxSettings();
        $this->view->form       = new GeneralSettingsEditForm(null, $pbxSettings);
        $this->view->submitMode = null;
    }

    /**
     * Sorts array by Priority field
     *
     * @param $a
     * @param $b
     *
     * @return int|null
     */
    public function sortArrayByPriority($a, $b): ?int
    {
        $a = (int)$a->priority;
        $b = (int)$b->priority;
        if ($a === $b) {
            return 0;
        } else {
            return ($a < $b) ? -1 : 1;
        }
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