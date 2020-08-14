<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\ExtensionEditForm;
use MikoPBX\Common\Models\{
    ExtensionForwardingRights,
    Extensions,
    ExternalPhones,
    NetworkFilters,
    PbxExtensionModules,
    PbxSettings,
    Sip,
    Users
};
use Phalcon\Text;

use function MikoPBX\Common\Config\appPath;

class ExtensionsController extends BaseController
{

    /**
     * Построение списка внутренних номеров и сотрудников
     */
    public function indexAction(): void
    {
        $extensionTable = [];

        $parameters = [
            'models'     => [
                'Extensions' => Extensions::class,
            ],
            'conditions' => 'Extensions.is_general_user_number = 1',
            'columns'    => [
                'id'       => 'Extensions.id',
                'username' => 'Users.username',
                'number'   => 'Extensions.number',
                'userid'   => 'Extensions.userid',
                'disabled' => 'Sip.disabled',
                'secret'   => 'Sip.secret',
                'email'    => 'Users.email',
                'type'     => 'Extensions.type',
                'avatar'   => 'Users.avatar',

            ],
            'order'      => 'number',
            'joins'      => [
                'Sip'   => [
                    0 => Sip::class,
                    1 => 'Sip.extension=Extensions.number',
                    2 => 'Sip',
                    3 => 'LEFT',
                ],
                'Users' => [
                    0 => Users::class,
                    1 => 'Users.id = Extensions.userid',
                    2 => 'Users',
                    3 => 'INNER',
                ],
            ],
        ];
        $query      = $this->modelsManager->createBuilder($parameters)->getQuery();
        $extensions = $query->execute();

        foreach ($extensions as $extension) {
            switch ($extension->type) {
                case 'SIP':
                    $extensionTable[$extension->userid]['userid']   = $extension->userid;
                    $extensionTable[$extension->userid]['number']   = $extension->number;
                    $extensionTable[$extension->userid]['status']   = ($extension->disabled === '1') ? 'disabled' : '';
                    $extensionTable[$extension->userid]['id']       = $extension->id;
                    $extensionTable[$extension->userid]['username'] = $extension->username;
                    $extensionTable[$extension->userid]['email']    = $extension->email;
                    $extensionTable[$extension->userid]['secret']   = $extension->secret;

                    if ( ! array_key_exists('mobile', $extensionTable[$extension->userid])) {
                        $extensionTable[$extension->userid]['mobile'] = '';
                    }
                    if ($extension->avatar) {
                        $filename    = md5($extension->avatar);
                        $imgCacheDir = appPath('sites/admin-cabinet/assets/img/cache');
                        $imgFile     = "{$imgCacheDir}/$filename.jpg";
                        if ( ! file_exists($imgFile)) {
                            $this->base64ToJpeg($extension->avatar, $imgFile);
                        }

                        $extensionTable[$extension->userid]['avatar'] = "{$this->url->get()}assets/img/cache/{$filename}.jpg";
                    } else {
                        $extensionTable[$extension->userid]['avatar'] = "{$this->url->get()}assets/img/unknownPerson.jpg";
                    }

                    break;
                case 'EXTERNAL':
                    $extensionTable[$extension->userid]['mobile'] = $extension->number;
                    break;
                default:
            }
        }
        $this->view->extensions = $extensionTable;
    }

    /**
     * Создает файл jpeg из переданной картинки
     *
     * @param $base64_string
     * @param $output_file
     *
     * @return void
     */
    private function base64ToJpeg($base64_string, $output_file):void
    {
        // open the output file for writing
        $ifp = fopen($output_file, 'wb');

        if ($ifp===false){
            return;
        }
        // split the string on commas
        // $data[ 0 ] == "data:image/png;base64"
        // $data[ 1 ] == <actual base64 string>
        $data = explode(',', $base64_string);

        // we could add validation here with ensuring count( $data ) > 1
        fwrite($ifp, base64_decode($data[1]));

        // clean up the file resource
        fclose($ifp);
    }

    /**
     * Change extension settings
     * @param ?string $id modified extension id
     */
    public function modifyAction($id = null): void
    {
        $extension = Extensions::findFirstById($id);

        if ($extension === null) {
            $extension                         = new Extensions();
            $extension->show_in_phonebook      = '1';
            $extension->public_access          = '0';
            $extension->is_general_user_number = '1';
            $extension->type                   = 'SIP';
            $extension->Sip                    = new Sip();
            $extension->Sip->disabled          = 0;
            $extension->Sip->type              = 'peer';
            $extension->Sip->uniqid            = strtoupper('SIP-PHONE-' . md5(time()));
            $extension->Sip->busylevel         = 1;
            $extension->Sip->qualify           = '1';
            $extension->Sip->qualifyfreq       = 60;
            $extension->number                 = $this->getNextInternalNumber();

            $extension->Users       = new Users();
            $extension->Users->role = 'user';

            $extension->ExtensionForwardingRights = new ExtensionForwardingRights();

            $this->view->avatar        = '';
        } else {
            $this->view->avatar = $extension->Users->avatar;
        }

        $networkFilters            = NetworkFilters::getAllowedFiltersForType(['SIP']);
        $arrNetworkFilters['none'] = $this->translation->_('ex_NoNetworkFilter');
        foreach ($networkFilters as $filter) {
            $arrNetworkFilters[$filter->id] = $filter->getRepresent();
        }

        $parameters        = [
            'conditions' => 'type = "EXTERNAL" AND is_general_user_number = 1 AND userid=:userid:',
            'bind'       => [
                'userid' => $extension->userid,
            ],
        ];
        $externalExtension = Extensions::findFirst($parameters);
        if ($externalExtension === null) {
            $externalExtension                           = new Extensions();
            $externalExtension->userid                   = $extension->userid;
            $externalExtension->type                     = 'EXTERNAL';
            $externalExtension->is_general_user_number   = '1';
            $externalExtension->ExternalPhones           = new ExternalPhones();
            $externalExtension->ExternalPhones->uniqid   = strtoupper('EXTERNAL-' . md5(time()));
            $externalExtension->ExternalPhones->disabled = '0';
        }


        $forwardingExtensions[''] = $this->translation->_('ex_SelectNumber');

        $parameters = [
            'conditions' => 'number IN ({ids:array})',
            'bind'       => [
                'ids' => [
                    $extension->ExtensionForwardingRights->forwarding,
                    $extension->ExtensionForwardingRights->forwardingonbusy,
                    $extension->ExtensionForwardingRights->forwardingonunavailable,
                ],
            ],
        ];
        $extensions = Extensions::find($parameters);
        foreach ($extensions as $record) {
            $forwardingExtensions[$record->number] = $record->getRepresent();
        }

        // Ограничим длинну внутреннего номера согласно настройкам
        $extensionsLength      = PbxSettings::getValueByKey('PBXInternalExtensionLength');
        $internalExtensionMask = '9{' . $extensionsLength . '}';

        $form = new ExtensionEditForm(
            $extension, [
                          'network_filters'        => $arrNetworkFilters,
                          'external_extension'     => $externalExtension,
                          'forwarding_extensions'  => $forwardingExtensions,
                          'internalextension_mask' => $internalExtensionMask,
                      ]
        );

        $this->view->form      = $form;
        $this->view->represent = $extension->getRepresent();
    }

    /**
     * Получает из базы следующий за последним введенным внутренним номером
     */
    private function getNextInternalNumber()
    {
        $parameters = [
            'conditions' => 'type = "SIP"',
            'column'     => 'number',
        ];
        $query      = Extensions::maximum($parameters);
        if ($query === null) {
            $query = 200;
        }
        $result       = (int)$query + 1;
        $extensionsLength
                      = PbxSettings::getValueByKey('PBXInternalExtensionLength');
        $maxExtension = (10 ** $extensionsLength) - 1;

        return ($result <= $maxExtension) ? $result : '';
    }

    /**
     * Сохранение карточки пользователя с его номерами
     *
     * @return void параметры помещаются в view и обрабатваются через ControllerBase::afterExecuteRoute()
     */
    public function saveAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }

        $this->db->begin();

        $data = $this->request->getPost();

        $sipEntity = null;

        if (array_key_exists('sip_uniqid', $data)) {
            $sipEntity = SIP::findFirstByUniqid($data['sip_uniqid']);
        }

        if ($sipEntity === null) {
            $sipEntity             = new SIP();
            $extension             = new Extensions();
            $userEntity            = new Users();
            $fwdEntity             = new ExtensionForwardingRights();
            $fwdEntity->ringlength = 45;
        } else {
            $extension = $sipEntity->Extensions;
            if ( ! $extension) {
                $extension = new Extensions();
            }
            $userEntity = $extension->Users;
            if ( ! $userEntity) {
                $userEntity = new Users();
            }
            $fwdEntity = $extension->ExtensionForwardingRights;
            if ( ! $fwdEntity) {
                $fwdEntity = new ExtensionForwardingRights();
            }
        }

        // Заполним параметры пользователя
        if ( ! $this->saveUser($userEntity, $data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // Заполним параметры внутреннего номера
        if ( ! $this->saveExtension($extension, $userEntity, $data, false)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // Заполним параметры SIP учетки
        if ( ! $this->saveSip($sipEntity, $data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }


        // Заполним параметры маршрутизации
        if ( ! $this->saveForwardingRights($fwdEntity, $data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // Если мобильный не указан, то не будем его добавлять в базу
        if ( ! empty($data['mobile_number'])) {
            $externalPhone = ExternalPhones::findFirstByUniqid($data['mobile_uniqid']);
            if ($externalPhone === null) {
                $externalPhone   = new ExternalPhones();
                $mobileExtension = new Extensions();
            } else {
                $mobileExtension = $externalPhone->Extensions;
            }

            // Заполним параметры Extension для мобильного
            if ( ! $this->saveExtension($mobileExtension, $userEntity, $data, true)) {
                $this->view->success = false;
                $this->db->rollback();

                return;
            }

            // Заполним параметры ExternalPhones для мобильного
            if ( ! $this->saveExternalPhones($externalPhone, $data)) {
                $this->view->success = false;
                $this->db->rollback();

                return;
            }
        } else {
            // Удалить номер мобильного если он был привязан к пользователю
            $parameters          = [
                'conditions' => 'type="EXTERNAL" AND is_general_user_number = 1 AND userid=:userid:',
                'bind'       => [
                    'userid' => $userEntity->id,
                ],
            ];
            $deletedMobileNumber = Extensions::findFirst($parameters);
            if ($deletedMobileNumber !== null
                && $deletedMobileNumber->delete() === false) {
                $errors = $deletedMobileNumber->getMessages();
                $this->flash->error(implode('<br>', $errors));
                $this->view->success = false;
                $this->db->rollback();

                return;
            }
        }

        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
        $this->db->commit();

        // Если это было создание карточки то надо перегрузить страницу с указанием ID
        if (empty($data['id'])) {
            $this->view->reload = "extensions/modify/{$extension->id}";
        }
    }

    /**
     * Сохранение параметров в таблицу Users
     *
     * @param Users $userEntity
     * @param array $data - POST дата
     *
     * @return bool результат сохранения
     */
    private function saveUser(Users $userEntity, $data)
    {
        // Заполним параметры пользователя
        foreach ($userEntity as $name => $value) {
            switch ($name) {
                case 'role':
                    if (array_key_exists('user_' . $name, $data)) {
                        $userEntity->$name = ($userEntity->$name === 'user') ? 'user' : $data['user_' . $name]; // не повышаем роль
                    }
                    break;
                default:
                    if (array_key_exists('user_' . $name, $data)) {
                        $userEntity->$name = $data['user_' . $name];
                    }
            }
        }

        if ($userEntity->save() === false) {
            $errors = $userEntity->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;
    }

    /**
     * Сохранение параметров в таблицу Extensions
     *
     * @param Extensions $extension
     * @param Users      $userEntity
     * @param array      $data - POST дата
     * @param bool isMobile - это мобильный телефон
     *
     * @return bool результат сохранения
     */
    private function saveExtension(Extensions $extension, Users $userEntity, $data, $isMobile = false): bool
    {
        foreach ($extension as $name => $value) {
            switch ($name) {
                case 'id':
                    break;
                case 'show_in_phonebook':
                case 'is_general_user_number':
                    $extension->$name = '1';
                    break;
                case 'type':
                    $extension->$name = $isMobile ? 'EXTERNAL' : 'SIP';
                    break;
                case 'public_access':
                    if (array_key_exists($name, $data)) {
                        $extension->$name = ($data[$name] === 'on') ? '1' : '0';
                    } else {
                        $extension->$name = '0';
                    }
                    break;
                case 'callerid':
                    $extension->$name = $this->transliterate($data['user_username']);
                    break;
                case 'userid':
                    $extension->$name = $userEntity->id;
                    break;
                case 'number':
                    $extension->$name = $isMobile ? $data['mobile_number'] : $data['number'];
                    break;
                default:
                    if (array_key_exists($name, $data)) {
                        $extension->$name = $data[$name];
                    }
            }
        }

        if ($extension->save() === false) {
            $errors = $extension->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;
    }

    /**
     * Сохранение параметров в таблицу SIP
     *
     * @param Sip   $sipEntity
     * @param array $data - POST дата
     *
     * @return bool результат сохранения
     */
    private function saveSip(Sip $sipEntity, $data): bool
    {
        foreach ($sipEntity as $name => $value) {
            switch ($name) {
                case 'qualify':
                    if (array_key_exists($name, $data)) {
                        $sipEntity->$name = ($data[$name] === 'on') ? '1' : '0';
                    } else {
                        $sipEntity->$name = "0";
                    }
                    break;
                case 'disabled':
                case 'disablefromuser':
                    if (array_key_exists('sip_' . $name, $data)) {
                        $sipEntity->$name = ($data['sip_' . $name] === 'on') ? '1' : '0';
                    } else {
                        $sipEntity->$name = "0";
                    }
                    break;
                case 'networkfilterid':
                    if ( ! array_key_exists('sip_' . $name, $data)) {
                        continue 2;
                    }
                    if ($data['sip_' . $name] === 'none') {
                        $sipEntity->$name = null;
                    } else {
                        $sipEntity->$name = $data['sip_' . $name];
                    }
                    break;
                case 'extension':
                    $sipEntity->$name = $data['number'];
                    break;
                case 'description':
                    $sipEntity->$name = $data['user_username'];
                    break;
                case 'manualattributes':
                    $sipEntity->setManualAttributes($data['sip_manualattributes']);
                    break;
                default:
                    if (array_key_exists('sip_' . $name, $data)) {
                        $sipEntity->$name = $data['sip_' . $name];
                    }
            }
        }
        if ($sipEntity->save() === false) {
            $errors = $sipEntity->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;
    }

    /**
     * Заполним параметры переадресации
     *
     * @param \MikoPBX\Common\Models\ExtensionForwardingRights $forwardingRight
     * @param                                                  $data
     *
     * @return bool
     */
    private function saveForwardingRights(ExtensionForwardingRights $forwardingRight, $data): bool
    {
        foreach ($forwardingRight as $name => $value) {
            switch ($name) {
                case 'extension':
                    $forwardingRight->$name = $data['number'];
                    break;
                default:
                    if (array_key_exists('fwd_' . $name, $data)) {
                        $forwardingRight->$name = ($data['fwd_' . $name] === -1) ? '' : $data['fwd_' . $name];
                    }
            }
        }
        if (empty($forwardingRight->forwarding)) {
            $forwardingRight->ringlength = null;
        }

        if ($forwardingRight->save() === false) {
            $errors = $forwardingRight->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;
    }

    /**
     * Заполним параметры ExternalPhones для мобильного номера
     *
     * @param ExternalPhones $externalPhone
     * @param array          $data - POST дата
     *
     * @return bool результат сохранения
     */
    private function saveExternalPhones(ExternalPhones $externalPhone, $data): bool
    {
        foreach ($externalPhone as $name => $value) {
            switch ($name) {
                case 'extension':
                    $externalPhone->$name = $data['mobile_number'];
                    break;
                case 'description':
                    $externalPhone->$name = $data['user_username'];
                    break;
                case 'disabled':
                    if (array_key_exists('mobile_' . $name, $data)) {
                        $externalPhone->$name = ($data['mobile_' . $name] === 'on') ? '1' : '0';
                    } else {
                        $externalPhone->$name = '0';
                    }
                    break;
                default:
                    if (array_key_exists('mobile_' . $name, $data)) {
                        $externalPhone->$name = $data['mobile_' . $name];
                    }
            }
        }
        if ($externalPhone->save() === false) {
            $errors = $externalPhone->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;
    }

    /**
     * Удаление внутреннего номера и всех зависимых от него записей в том числе мобильного и переадресаций
     *
     * @param string $id - записи внутренненго номера
     */
    public function deleteAction($id = null)
    {
        $this->db->begin();
        $extension = Extensions::findFirstById($id);

        // Чтобы не было зацикливания при удалении сначала удалим
        // настройки переадресации у этой же учетной записи, т.к. она может ссылаться на себя

        $errors = null;
        if ($extension !== null && $extension->ExtensionForwardingRights
            && ! $extension->ExtensionForwardingRights->delete()) {
            $errors = $extension->ExtensionForwardingRights->getMessages();
        }

        if ( ! $errors && $extension) {
            $user = $extension->Users;
            if ( ! $user->delete()) {
                $errors = $user->getMessages();
            }
        }

        if ($errors) {
            $this->flash->error(implode('<br>', $errors));
            $this->db->rollback();
        } else {
            $this->db->commit();
        }

        $this->forward('extensions/index');
    }

    /**
     * Проверка на доступность номера JS скрипта extensions.js
     *
     * @param string $number - внутренний номер пользователя
     *
     * @return void параметры помещаются в view и обрабатваются через ControllerBase::afterExecuteRoute()
     */
    public function availableAction($number = null): void
    {
        $result = true;
        // Проверим пересечение с внутренним номерным планом
        $extension = Extensions::findFirstByNumber($number);
        if ($extension !== null) {
            $result             = false;
            $this->view->userId = $extension->userid;
        }
        // Проверим пересечение с парковочными слотами
        if ($result) {
            $parkExt       = PbxSettings::getValueByKey('PBXCallParkingExt');
            $parkStartSlot = PbxSettings::getValueByKey('PBXCallParkingStartSlot');
            $parkEndSlot   = PbxSettings::getValueByKey('PBXCallParkingEndSlot');
            if ($number === $parkExt || ($number >= $parkStartSlot && $number <= $parkEndSlot)) {
                $result             = false;
                $this->view->userId = 0;
            }
        }

        $this->view->numberAvailable = $result;
    }

    /**
     * Отключение всех номеров пользователя
     *
     * @param string $number - внутренний номер пользователя
     *
     * @return void
     */
    public function disableAction($number = null): void
    {
        $extension = Extensions::findFirstByNumber($number);
        if ($extension !== null) {
            $extensions = Extensions::findByUserid($extension->userid);
            foreach ($extensions as $extension) {
                switch ($extension->type) {
                    case 'SIP':
                        $extension->Sip->disabled = '1';
                        break;
                    case 'EXTERNAL':
                        $extension->ExternalPhones->disabled = '1';
                        break;
                }
                if ($extension->save() === true) {
                    $this->view->success = true;
                } else {
                    $this->view->success = false;
                    $errors              = $extension->getMessages();
                    $this->flash->error(implode('<br>', $errors));

                    return;
                }
            }
        }
    }

    /**
     * Включение всех номеров пользователя
     *
     * @param string $number - внутренний номер пользователя
     *
     * @return void
     */
    public function enableAction($number = null): void
    {
        $extension = Extensions::findFirstByNumber($number);
        if ($extension !== null) {
            $extensions = Extensions::findByUserid($extension->userid);
            foreach ($extensions as $extension) {
                switch ($extension->type) {
                    case 'SIP':
                        $extension->Sip->disabled = '0';
                        break;
                    case 'EXTERNAL':
                        $extension->ExternalPhones->disabled = '1';
                        break;
                }
                if ($extension->save() === true) {
                    $this->view->success = true;
                } else {
                    $this->view->success = false;
                    $errors              = $extension->getMessages();
                    $this->flash->error(implode('<br>', $errors));

                    return;
                }
            }
        }
    }

    /**
     * Возвращает представление для списка нормеров телефонов по AJAX запросу
     *
     * @return void
     */
    public function GetPhonesRepresentAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }
        $numbers = $this->request->getPost('numbers');
        $result  = [];
        foreach ($numbers as $number) {
            $result[$number] = [
                'number'    => $number,
                'represent' => $this->GetPhoneRepresentAction($number),
            ];
        }
        $this->view->success = true;
        $this->view->message = $result;
    }

    /**
     * Возвращает представление нормера телефона по AJAX запросу
     *
     * @param $phoneNumber
     *
     * @return string
     */
    public function GetPhoneRepresentAction($phoneNumber): string
    {
        $response = $phoneNumber;

        if (strlen($phoneNumber) > 10) {
            $seekNumber = substr($phoneNumber, -9);
            $parameters = [
                'conditions' => 'number LIKE :SearchPhrase1:',
                'bind'       => [
                    'SearchPhrase1' => "%{$seekNumber}",
                ],
            ];
        } else {
            $parameters = [
                'conditions' => 'number = :SearchPhrase1:',
                'bind'       => [
                    'SearchPhrase1' => $phoneNumber,
                ],
            ];
        }
        $result = Extensions::findFirst($parameters);
        if ($result !== null) {
            $response = $result->getRepresent();
        }

        return $response;
    }

    /**
     * Используется для генерации списка выбора пользователей из JS скрипта extensions.js
     *
     * @param string $type {all, phones, internal} - отображать только телефоны или все возможные номера
     *
     * @return void параметры помещаются в view и обрабатваются через ControllerBase::afterExecuteRoute()
     */
    public function getForSelectAction($type = 'all'): void
    {
        $results = [];

        switch ($type) {
            case 'all':
            {
                $parameters = [
                    'conditions' => 'show_in_phonebook="1"',
                ];
                break;
            }
            case 'phones':
            {
                // Список телефоонных эктеншенов
                $parameters = [
                    'conditions' => 'type IN ({ids:array}) AND show_in_phonebook="1"',
                    'bind'       => [
                        'ids' => ['SIP', 'EXTERNAL'],
                    ],
                ];
                break;
            }
            case 'internal':
            {
                // Только внутренние
                $parameters = [
                    'conditions' => 'type IN ({ids:array}) AND show_in_phonebook="1"',
                    'bind'       => [
                        'ids' => ['SIP'],
                    ],
                ];
                break;
            }
            default:
            {
                $parameters = [
                    'conditions' => 'show_in_phonebook="1"',
                ];
            }
        }
        $extensions = Extensions::find($parameters);
        foreach ($extensions as $record) {
            $type = ($record->userid > 0) ? ' USER'
                : $record->type; // Пользователи будут самыми первыми в списке
            $type = Text::underscore(strtoupper($type));


            // Необходимо проверить к какому модулю относится эта запись
            // и включен ли этот модуль в данный момент
            if ($type === 'MODULES') {
                $module = $this->findModuleByExtensionNumber($record->number);
                if ($module === null || $module->disabled === '1') {
                    continue; // исключаем отключенные модули
                }
            }
            $represent        = $record->getRepresent();
            $clearedRepresent = strip_tags($represent);
            $results[]        = [
                'name'          => $represent,
                'value'         => $record->number,
                'type'          => $type,
                'typeLocalized' => $this->translation->_("ex_dropdownCategory_{$type}"),
                'sorter'        => ($record->userid > 0) ? "{$type}{$clearedRepresent}{$record->number}" : "{$type}{$clearedRepresent}"
                // 'avatar' => ( $record->userid > 0 )
                // 	? $record->Users->avatar : '',
            ];
        }

        usort(
            $results,
            [__CLASS__, 'sortExtensionsArray']
        );

        $this->view->success = true;
        $this->view->results = $results;
    }

    /**
     * Сортировка массива extensions
     *
     * @param $a
     * @param $b
     *
     * @return int
     */
    private function sortExtensionsArray($a, $b): int
    {
        return strcmp($a['sorter'], $b['sorter']);
    }


    /**
     * Try to find module by extension number
     *
     * @param string $number
     *
     * @return mixed|null
     */
    private function findModuleByExtensionNumber(string $number)
    {
        $result         = null;
        $extension      = Extensions::findFirst("number ='{$number}'");
        $relatedLinks   = $extension->getRelatedLinks();
        $moduleUniqueID = false;
        foreach ($relatedLinks as $relation) {
            $obj = $relation['object'];
            if (strpos(get_class($obj), 'Modules\\') === 0) {
                $moduleUniqueID = explode('Models\\', get_class($obj))[1];
            }
        }
        if ($moduleUniqueID) {
            $result = PbxExtensionModules::findFirstByUniqid($moduleUniqueID);
        }

        return $result;
    }


}