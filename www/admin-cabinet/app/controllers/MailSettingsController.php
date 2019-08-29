<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

use Models\PbxSettings;

class MailSettingsController extends BaseController {

	/**
	 * Построение формы настроек почты
	 */
	public function modifyAction()
    {
        $arrKeys = MailSettingsController::getEmailSettingsArray();
        foreach ($arrKeys as $key) {
            $MailSettingsFields[$key] = PbxSettings::getValueByKey($key);
        }

        $this->view->form = new MailSettingsEditForm(null,$MailSettingsFields);
		$this->view->submitMode = NULL;
    }


	/**
	 * Сохранение почтовых настроек
	 */
	public function saveAction()
    {
        if (!$this->request->isPost()) return;
        $data = $this->request->getPost();

        $this->db->begin();
        $arrSettings = MailSettingsController::getEmailSettingsArray();
        foreach ($arrSettings as $key) {
            $record = PbxSettings::findFirstByKey($key);
            if (!$record) {
                $record = new PbxSettings();
                $record->key = $key;
            }

            switch ($key) {
                case "MailEnableNotifications":
                case "MailSMTPUseTLS":
                case "MailSMTPCertCheck":
                case "***ALL CHECK BOXES ABOVE***":
                    $record->value = ($data[$key] == 'on') ? "1" : "0";
                    break;
                default:
                    if (!array_key_exists($key, $data)) continue;
                    $record->value = $data[$key];
            }
            if ($record->save() === false) {
                $errors = $record->getMessages();
                $this->flash->warning(implode('<br>', $errors));
                $this->view->success = false;
                $this->db->rollback();
                return;
            }
        }

        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
        $this->db->commit();
    }

    /**
	 * Возвращает список ключей для настройки почты на станции
	 * @return array
	 */
	private function getEmailSettingsArray(){
		return array(
			'MailSMTPHost',
			'MailSMTPPort',
			'MailSMTPUsername',
			'MailSMTPPassword',
			'MailEnableNotifications',
			'MailSMTPFromUsername',
			'MailSMTPSenderAddress',
			'MailSMTPUseTLS',
			'MailSMTPCertCheck',
			'MailTplMissedCallSubject',
			'MailTplMissedCallBody',
			'MailTplMissedCallFooter',
			'MailTplVoicemailSubject',
			'MailTplVoicemailBody',
			'SystemNotificationsEmail',
            'VoicemailNotificationsEmail'
		);
	}
}
