<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

use Models\PbxSettings;
use Phalcon\Text;

class LicensingController extends BaseController
{

    private $licenseWorker;

    /**
     * Инициализация базового класса
     */
    public function initialize(): void
    {
        parent::initialize();
        $this->licenseWorker = $this->getDI()->getLicenseWorker();
    }

    /**
     * Форма работы с лицензионными ключами
     * @param $backurl string адрес возврата на исходную страницу, откуда была переадресация сюда
     */
    public function modifyAction($backurl = null): void
    {

        // Форма лицензионного ключа
        $licKey                           = PbxSettings::getValueByKey('PBXLicense');
        $changeLicenseKeyForm  = new LicensingChangeLicenseKeyForm(null, ['licKey' => $licKey]);
        $this->view->changeLicenseKeyForm = $changeLicenseKeyForm;

        // Форма активации купона
        $activateCouponForm             = new LicensingActivateCouponForm();
        $this->view->activateCouponForm = $activateCouponForm;

        // Форма получения триала
        $getTrialForm             = new LicensingGetTrialForm();
        $this->view->getTrialForm = $getTrialForm;

        $this->view->backurl = $backurl;
        $this->view->submitMode = null;
    }

    /**
     * Обработка нажатий на кнопки в форме
     */
    public function updateLicenseAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }
        $data = $this->request->getPost();
        if ( ! empty($data['licKey'])) {
            $oldLicKey = PbxSettings::getValueByKey('PBXLicense');
            if ($oldLicKey !== $data['licKey']) {

                $licenseInfo = $this->licenseWorker->getLicenseInfo($data['licKey']);
                if ($licenseInfo instanceof SimpleXMLElement) {
                    $this->saveLicenseKey($data['licKey']);
                    $this->licenseWorker->changeLicenseKey($data['licKey']);
                    $this->licenseWorker->addTrial('11'); // Askozia PBX
                    $this->view->success = true;
                } elseif ( ! empty($licenseInfo) && strpos($licenseInfo, '2026') !== false) {
                    $this->flash->error($this->translation->_('lic_FailedCheckLicense2026'));
                    $this->view->success = false;
                } elseif  (! empty($licenseInfo)) {
                    $this->flash->error($licenseInfo);
                    $this->view->success = false;
                } else {
                    $this->flash->error($this->translation->_('lic_FailedCheckLicense'));
                    $this->view->success = false;
                }

            }
            if ( ! empty($data['coupon'])) {
                $result
                    = $this->licenseWorker->activateCoupon($data['coupon']);
                if ($result === true) {
                    $this->flash->success($this->translation->_('lic_SuccessfulCouponActivated'));
                    $this->view->success = true;
                } else {
                    $message = $this->licenseWorker->translateLicenseErrorMessage($result);
                    $this->flash->error($message);
                    $this->view->success = false;
                }
            }
        } else { // Получим триальную лицензию для ключа
            $newLicenseKey = $this->licenseWorker->getTrialLicense($data);
            if (strlen($newLicenseKey) === 28
                && Text::startsWith($newLicenseKey, 'MIKO-')) {
                $this->saveLicenseKey($newLicenseKey);
                $this->licenseWorker->changeLicenseKey($newLicenseKey);
            } else {
                // Не удалось получить триальную лицензию, попробуем вывести корректное сообщение об ошибке
                $message = $this->licenseWorker->translateLicenseErrorMessage($newLicenseKey);
                $this->flash->error($message);
                $this->view->success = false;
            }
        }

        if ($this->view->success === true) {
            if ( ! empty($data['backurl'])) {
                $this->view->reload = $data['backurl'].'/index/';
            } else {
                $this->view->reload = 'licensing/modify/';
            }
        }
        $this->session->remove('PBXLicense');
        $this->session->remove('checkRegistration');

    }

    /**
     * Сохранение ключа в базу данных
     */
    private function saveLicenseKey($licenseKey): void
    {
        $this->db->begin();
        $record = PbxSettings::findFirstByKey('PBXLicense');
        if ( ! $record) {
            $record      = new PbxSettings();
            $record->key = 'PBXLicense';
        }
        $record->value = $licenseKey;

        if ($record->save() === false) {
            $errors = $record->getMessages();
            $this->flash->warning(implode('<br>', $errors));
            $this->view->success = false;
            $this->db->rollback();

            return;
        }
        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
        $this->db->commit();
    }


    /**
     * Очистка всех настроек и сброс ключа
     */
    public function resetSettingsAction(): void
    {
        $record = PbxSettings::findFirstByKey('PBXLicense');
        if ($record !== false && $record->delete() === false) {
            $errors = $record->getMessages();
            $this->flash->error(implode('<br>', $errors));
            $this->view->success = false;

            return;
        }
        $this->view->success = true;
        $this->licenseWorker->changeLicenseKey('');
        $this->session->remove('checkRegistration');
    }

    /**
     * Возвращает информацию о лицензионном ключе
     *
     * @param $licenseKey
     */
    public function getLicenseInfoAction($licenseKey)
    {
        if (empty($licenseKey)) {
            return [];
        }
        $licenseInfo         = $this->licenseWorker->getLicenseInfo($licenseKey);
        $this->view->success = true;
        $this->view->message = json_encode($licenseInfo);

    }

    /**
     * Проверка на наличие базовой лицензии
     */
    public function getBaseFeatureStatusAction() :void
    {
        $checkBaseFeature = $this->licenseWorker->featureAvailable(33);
        if ($checkBaseFeature['success']===false) {
            $this->view->success = false;
            $this->view->message = $this->licenseWorker->translateLicenseErrorMessage($checkBaseFeature['error']);
        } else {
            $this->view->success = true;
        }
    }

    /**
     * Попытка захвата фичи, если не удалось пробуем получить триал и повторно захватить фичу
     */
    public function captureFeatureForProductIdAction() :void
    {
        $this->view->success = true;
        if ( ! $this->request->isPost()) {
            return;
        }
        $data = $this->request->getPost();
        if (!isset( $data['licFeatureId'], $data['licProductId'])){
            return;
        }
        if ($data['licFeatureId']> 0){
            // Пробуем захватить фичу
            $result = $this->licenseWorker->captureFeature($data['licFeatureId']);
            if ($result['success']===false) {
                // Добавим тириал и захватим фичу еще раз
                $this->licenseWorker->addTrial($data['licProductId']);
                $result = $this->licenseWorker->captureFeature($data['licFeatureId']);
                if ($result['success']===false) {
                    $this->view->message = $this->licenseWorker->translateLicenseErrorMessage($result['error']);
                    $this->view->success = false;
                }
            }
        }
    }


}