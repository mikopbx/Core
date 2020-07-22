<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\MailSettingsEditForm;
use MikoPBX\Common\Models\PbxSettings;

class MailSettingsController extends BaseController
{

    /**
     * Построение формы настроек почты
     */
    public function modifyAction(): void
    {
        $MailSettingsFields = [];
        $arrKeys = $this->getEmailSettingsArray();
        foreach ($arrKeys as $key) {
            $MailSettingsFields[$key] = PbxSettings::getValueByKey($key);
        }

        $this->view->form       = new MailSettingsEditForm(null, $MailSettingsFields);
        $this->view->submitMode = null;
    }

    /**
     * Возвращает список ключей для настройки почты на станции
     *
     * @return array
     */
    private function getEmailSettingsArray(): array
    {
        return [
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
            'VoicemailNotificationsEmail',
        ];
    }

    /**
     * Сохранение почтовых настроек
     */
    public function saveAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }
        $data = $this->request->getPost();

        $this->db->begin();
        $arrSettings = $this->getEmailSettingsArray();
        foreach ($arrSettings as $key) {
            $record = PbxSettings::findFirstByKey($key);
            if ($record === null) {
                $record      = new PbxSettings();
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
                    if ( ! array_key_exists($key, $data)) {
                        continue 2;
                    }
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
}
