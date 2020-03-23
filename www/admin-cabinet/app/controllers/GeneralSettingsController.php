<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

use Models\PbxSettings;

class GeneralSettingsController extends BaseController {

	/**
	 * Построение формы настроек
	 */
	public function modifyAction()
	{
		$pbxSettings = PbxSettings::getAllPbxSettings();
		$this->view->form = new GeneralSettingsEditForm(null,$pbxSettings);
		$this->view->submitMode = NULL;
	}

	/**
	 * Сохранение настроек системы
	 */
	public function saveAction()
    {
        if (!$this->request->isPost()) {
            return;
        }
        $data = $this->request->getPost();
        $pbxSettings=PbxSettings::getDefaultArrayValues();
        $this->db->begin();
        foreach ($pbxSettings as $key=>$value){
            $record = PbxSettings::findFirstByKey($key);
            if (!$record) {
	            $record        = new PbxSettings();
	            $record->key   = $key;
	            $record->value = $value;
            }

            switch($key) {
                case 'PBXRecordCalls':
                case 'AJAMEnabled':
                case 'AMIEnabled':
                case 'RestartEveryNight':
                case 'RedirectToHttps':
                case '***ALL CHECK BOXES ABOVE***':
                    $record->value = ($data[$key] === 'on') ? '1' : '0';
                    break;
	            case 'SSHPassword':
		            //Если отправили пароль по-умолчанию, то сделаем его равным паролю WEB
		            if ( $data[ $key ] === $pbxSettings[ $key ] ) {
			            $record->value = $data['WebAdminPassword'];
		            } else {
			            $record->value = $data[ $key ];
		            }
		            break;
				case 'PBXLanguage':
					$record->value = $data[$key];
					if ($this->language !==$data[$key]){
						$sessionParams = $this->session->get('auth');
						$sessionParams['lang'] = substr($data[$key],0,2);
						$this->session->set('auth', $sessionParams);
						$this->session->set('PBXLanguage',$data[$key]);
						$this->view->reload = 'general-settings/modify/';
					}
					break;
                case 'SendMetrics':
                    $record->value = ($data[$key] === 'on') ? '1' : '0';
                    $this->session->set('SendMetrics', $record->value);
                    break;
                default:
                    if (array_key_exists($key, $data)){
						$record->value = $data[$key];
					}
            }
            if ($record->save()=== false){
                $errors = $record->getMessages();
                $this->flash->warning(implode('<br>', $errors));
                $this->view->success=false;
                $this->db->rollback();
                return;
            }
        }

        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success=true;
        $this->db->commit();
    }
}