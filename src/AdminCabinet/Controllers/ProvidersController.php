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

use MikoPBX\AdminCabinet\Forms\{IaxProviderEditForm, SipProviderEditForm};
use MikoPBX\Common\Models\{Iax, Providers, Sip, SipHosts};

class ProvidersController extends BaseController
{

    /**
     * Получение общего списка провайдеров
     */
    public function indexAction(): void
    {
        $providers     = Providers::find();
        $providersList = [];
        foreach ($providers as $provider) {
            $modelType       = ucfirst($provider->type);
            $provByType      = $provider->$modelType;
            $providersList[] = [
                'uniqid'     => $provByType->uniqid,
                'name'       => $provByType->description,
                'username'   => $provByType->username,
                'hostname'   => $provByType->host,
                'type'       => $provider->type,
                'status'     => $provByType->disabled ? 'disabled' : '',
                'existLinks' => $provider->OutgoingRouting->count() > 0 ? 'true' : 'false',

            ];
        }
        $this->view->providerlist = $providersList;
    }


    /**
     * Открытие карточки SIP провайдера и заполнение значений по умолчанию
     *
     * @param string $uniqid Уникальный идентификатор провайдера, если мы открываем существующего
     */
    public function modifysipAction(string $uniqid = ''): void
    {
        $provider = Providers::findFirstByUniqid($uniqid);

        if ($provider === null) {
            $uniqid                     = strtoupper('SIP-' . time());
            $provider                   = new Providers();
            $provider->type             = 'SIP';
            $provider->uniqid           = $uniqid;
            $provider->sipuid           = $uniqid;
            $provider->Sip              = new Sip();
            $provider->Sip->uniqid      = $uniqid;
            $provider->Sip->type        = 'friend';
            $provider->Sip->port        = 5060;
            $provider->Sip->disabled    = '0';
            $provider->Sip->qualifyfreq = 60;
            $provider->Sip->qualify     = '1';
        }

        $providerHost = $provider->Sip->host;
        $sipHosts   = $provider->Sip->SipHosts;
        $hostsTable = [];
        foreach ($sipHosts as $host) {
            if ($providerHost !== $host->address){
                $hostsTable[] = $host->address;
            }
        }
        $this->view->hostsTable = $hostsTable;
        $this->view->form       = new SipProviderEditForm($provider->Sip);
        $this->view->represent  = $provider->getRepresent();
    }

    /**
     * Открытие карточки IAX провайдера и заполнение значений по умолчанию
     *
     * @param string $uniqid Уникальный идентификатор провайдера, если мы открываем существующего
     */
    public function modifyiaxAction(string $uniqid = ''): void
    {
        $provider = Providers::findFirstByUniqid($uniqid);

        if ($provider === null) {
            $uniqid                  = strtoupper('IAX-' . time());
            $provider                = new Providers();
            $provider->type          = 'IAX';
            $provider->uniqid        = $uniqid;
            $provider->iaxuid        = $uniqid;
            $provider->Iax           = new Iax();
            $provider->Iax->uniqid   = $uniqid;
            $provider->Iax->disabled = '0';
            $provider->Iax->qualify  = '1';
        }

        $this->view->form      = new IaxProviderEditForm($provider->Iax);
        $this->view->represent = $provider->getRepresent();
    }

    /**
     * Включение провайдера
     *
     * @param string $type   тип провайдера SIP или IAX
     * @param string $uniqid Уникальный идентификатор провайдера, если мы открываем существующего
     */
    public function enableAction(string $type, string $uniqid = ''): void
    {
        $this->view->success = false;
        switch ($type) {
            case 'iax':
            {
                $provider = Iax::findFirstByUniqid($uniqid);
                break;
            }
            case 'sip':
            {
                $provider = Sip::findFirstByUniqid($uniqid);
                break;
            }
            default:
                $provider = null;
        }
        if ($provider !== null) {
            $provider->disabled = '0';
            if ($provider->save() === true) {
                $this->view->success = true;
            }
        }
    }

    /**
     * Отключение провайдера
     *
     * @param string $type   тип провайдера SIP или IAX
     * @param string $uniqid Уникальный идентификатор провайдера, если мы открываем существующего
     */
    public function disableAction(string $type, string $uniqid = ''): void
    {
        $this->view->success = false;
        switch ($type) {
            case 'iax':
            {
                $provider = Iax::findFirstByUniqid($uniqid);
                break;
            }
            case 'sip':
            {
                $provider = Sip::findFirstByUniqid($uniqid);
                break;
            }
            default:
                $provider = null;
        }
        if ($provider !== null) {
            $provider->disabled = '1';
            if ($provider->save() === true) {
                $this->view->success = true;
            }
        }
    }

    /**
     * Saves provider over ajax request from a web form
     *
     * @param string $type - sip or iax
     *
     */
    public function saveAction(string $type): void
    {
        if ( ! $this->request->isPost()) {
            $this->forward('network/index');
        }
        $this->db->begin();
        $data = $this->request->getPost();

        // Updates SIP and IAX tables
        if ( ! $this->saveProvider($data, $type)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // Update additional hosts table
        if ( ! $this->updateAdditionalHosts($data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
        $this->db->commit();

        // Если это было создание карточки то надо перегрузить страницу с указанием ID
        if (empty($data['id'])) {
            $this->view->reload = "providers/modify{$type}/{$data['uniqid']}";
        }
    }

    /**
     * Save providers data table
     *
     * @param array  $data - POST DATA
     * @param string $type - sip or iax
     *
     * @return bool save result
     */
    private function saveProvider(array $data, string $type): bool
    {
        // Проверим это новый провайдер или старый
        $provider = Providers::findFirstByUniqid($data['uniqid']);
        if ($provider === null) {
            $provider         = new Providers();
            $provider->uniqid = $data['uniqid'];
            switch ($type) {
                case 'iax':
                    $provider->iaxuid = $data['uniqid'];
                    $provider->type   = 'IAX';
                    $provider->Iax    = new Iax();
                    break;
                case 'sip':
                    $provider->sipuid = $data['uniqid'];
                    $provider->type   = 'SIP';
                    $provider->Sip    = new Sip();
                    break;
            }
        }

        if ($provider->save() === false) {
            $errors = $provider->getMessages();
            $this->flash->warning(implode('<br>', $errors));
            return false;
        }

        switch ($type) {
            case 'iax':
                $providerByType = $provider->Iax;
                break;
            case 'sip':
                $providerByType = $provider->Sip;
                break;
            default:
                $providerByType = [];
        }

        foreach ($providerByType as $name => $value) {
            switch ($name) {
                case 'id':
                    break;
                case 'qualify':
                case 'disablefromuser':
                case 'noregister':
                case 'receive_calls_without_auth':
                    if (array_key_exists($name, $data)) {
                        $providerByType->$name = ($data[$name] === 'on') ? 1 : 0;
                    } else {
                        $providerByType->$name = 0;
                    }
                    break;
                case 'manualattributes':
                    if (array_key_exists($name, $data)) {
                        $providerByType->setManualAttributes($data[$name]);
                    }
                    break;
                default:
                    if (array_key_exists($name, $data)) {
                        $providerByType->$name = $data[$name];
                    }
            }
        }

        if ($providerByType->save() === false) {
            $errors = $providerByType->getMessages();
            $this->flash->warning(implode('<br>', $errors));

            return false;
        }

        return true;
    }

    /**
     * Update additional hosts table
     *
     * @param array $data массив полей из POST запроса
     *
     * @return bool update result
     */
    private function updateAdditionalHosts(array $data): bool
    {
        $providerHost = $data['host'];
        $additionalHosts = json_decode($data['additionalHosts']);
        $hosts = array_merge([], array_column($additionalHosts, 'address'), [$providerHost]);
        $parameters=[
            'conditions'=>'provider_id = :providerId:',
            'bind'=>[
                'providerId'=>$data['uniqid']
            ]
        ];
        $currentRecords = SipHosts::find($parameters);
        foreach ($currentRecords as $record){
            if (!in_array($record->address, $hosts)){
                if ($record->delete() === false) {
                    $errors = $record->getMessages();
                    $this->flash->warning(implode('<br>', $errors));
                    return false;
                }
            } elseif (($key = array_search($record->address, $hosts)) !== false) {
                unset($hosts[$key]);
            }
        }
        foreach ($hosts as $record){
            $currentRecord = new SipHosts();
            $currentRecord->provider_id = $data['uniqid'];
            $currentRecord->address = $record;
            if ($currentRecord->save() === false) {
                $errors = $currentRecord->getMessages();
                $this->flash->warning(implode('<br>', $errors));
                return false;
            }
        }

        return true;
    }

    /**
     * Deletes provider record by unique id
     *
     * @param string $uniqid
     */
    public function deleteAction(string $uniqid = ''): void
    {
        if ($uniqid === '') {
            return;
        }

        $provider = Providers::findFirstByUniqid($uniqid);
        if ($provider === null) {
            return;
        }

        $this->db->begin();
        $errors = false;
        if ($provider->Iax) {
            $iax = $provider->Iax;
            if ( ! $iax->delete()) {
                $errors = $iax->getMessages();
            }
        }

        if ($errors === false && $provider->Sip) {
            $sip = $provider->Sip;
            if ($sip->SipHosts) {
                $sipHosts = $provider->SipHosts;
                if ( ! $sipHosts->delete()) {
                    $errors = $sipHosts->getMessages();
                }
            }
            if ($errors === false && ! $sip->delete()) {
                $errors = $sip->getMessages();
            }
        }

        if ($errors) {
            $this->flash->warning(implode('<br>', $errors));
            $this->db->rollback();
        } else {
            $this->db->commit();
        }


        $this->forward('providers/index');
    }

}