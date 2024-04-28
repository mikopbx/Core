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

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\{IaxProviderEditForm, SipProviderEditForm};
use MikoPBX\Common\Models\{Iax, Providers, Sip, SipHosts};

class ProvidersController extends BaseController
{

    /**
     * Retrieves and prepares a list of providers for display in the index view.
     */
    public function indexAction(): void
    {
        $providers = Providers::find();
        $providersList = [];
        foreach ($providers as $provider) {
            $modelType = ucfirst($provider->type);
            $provByType = $provider->$modelType;
            $providersList[] = [
                'uniqid' => $provByType->uniqid,
                'name' => $provByType->description,
                'username' => $provByType->username,
                'hostname' => $provByType->host,
                'type' => $provider->type,
                'status' => $provByType->disabled ? 'disabled' : '',
                'existLinks' => $provider->OutgoingRouting->count() > 0 ? 'true' : 'false',

            ];
        }
        $this->view->providerlist = $providersList;
    }


    /**
     * Opens the SIP provider card and fills in default values.
     *
     * @param string $uniqId Unique identifier of the provider (optional) when opening an existing one.
     */
    public function modifysipAction(string $uniqId = ''): void
    {
        $idIsEmpty = false;
        if(empty($uniqId)){
            $idIsEmpty = true;
            $uniqId = (string)($_GET['copy-source']??'');
        }
        /** @var Providers $provider */
        $provider = Providers::findFirstByUniqid($uniqId);
        if ($provider === null) {
            $uniqId = Sip::generateUniqueID('SIP-TRUNK-');
            $provider = new Providers();
            $provider->type = 'SIP';
            $provider->uniqid = $uniqId;
            $provider->sipuid = $uniqId;
            $provider->Sip = new Sip();
            $provider->Sip->uniqid = $uniqId;
            $provider->Sip->type = 'friend';
            $provider->Sip->port = 5060;
            $provider->Sip->disabled = '0';
            $provider->Sip->qualifyfreq = 60;
            $provider->Sip->qualify = '1';
            $provider->Sip->secret = SIP::generateSipPassword();
        }elseif($idIsEmpty){
            $uniqId = Sip::generateUniqueID('SIP-TRUNK-');
            $oldProvider = $provider;
            $provider = new Providers();
            foreach ($oldProvider->toArray() as $key => $value){
                $provider->writeAttribute($key, $value);
            }
            $provider->Sip = new Sip();
            foreach ($oldProvider->Sip->toArray() as $key => $value){
                $provider->Sip->writeAttribute($key, $value);
            }
            $provider->id     = '';
            $provider->uniqid = $uniqId;
            $provider->sipuid = $uniqId;
            $provider->Sip->description = '';
            $provider->Sip->id     = '';
            $provider->Sip->uniqid = $uniqId;
            $provider->Sip->secret = md5(microtime());
        }

        $providerHost = $provider->Sip->host;
        $sipHosts = $provider->Sip->SipHosts;
        $hostsTable = [];
        foreach ($sipHosts as $host) {
            if ($providerHost !== $host->address) {
                $hostsTable[] = $host->address;
            }
        }
        $this->view->secret = $provider->Sip->secret;
        $this->view->hostsTable = $hostsTable;
        $options = ['note' => $provider->note];
        $this->view->form = new SipProviderEditForm($provider->Sip, $options);
        $this->view->represent = $provider->getRepresent();
    }

    /**
     * Opens the IAX provider card and fills in default values.
     *
     * @param string $uniqid Unique identifier of the provider (optional) when opening an existing one.
     */
    public function modifyiaxAction(string $uniqId = ''): void
    {
        $idIsEmpty = false;
        if(empty($uniqId)){
            $idIsEmpty = true;
            $uniqId = (string)($_GET['copy-source']??'');
        }

        $provider = Providers::findFirstByUniqid($uniqId);

        if ($provider === null) {
            $uniqId = Iax::generateUniqueID('IAX-TRUNK-');
            $provider = new Providers();
            $provider->type = 'IAX';
            $provider->uniqid = $uniqId;
            $provider->iaxuid = $uniqId;
            $provider->Iax = new Iax();
            $provider->Iax->uniqid = $uniqId;
            $provider->Iax->disabled = '0';
            $provider->Iax->qualify = '1';
        }elseif($idIsEmpty){
            $uniqId = Iax::generateUniqueID('IAX-TRUNK-');
            $oldProvider = $provider;
            $provider = new Providers();
            foreach ($oldProvider->toArray() as $key => $value){
                $provider->writeAttribute($key, $value);
            }
            $provider->Iax = new Iax();
            foreach ($oldProvider->Iax->toArray() as $key => $value){
                $provider->Iax->writeAttribute($key, $value);
            }
            $provider->id     = '';
            $provider->uniqid = $uniqId;
            $provider->sipuid = $uniqId;
            $provider->Iax->description = '';
            $provider->Iax->id     = '';
            $provider->Iax->uniqid = $uniqId;
            $provider->Iax->secret = md5(microtime());
        }
        $options = ['note' => $provider->note];
        $this->view->form = new IaxProviderEditForm($provider->Iax, $options);
        $this->view->represent = $provider->getRepresent();
    }

    /**
     * Enables a provider.
     *
     * @param string $type Provider type (SIP or IAX)
     * @param string $uniqid Unique identifier of the provider (optional) when opening an existing one.
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
     * Disables a provider.
     *
     * @param string $type Provider type (SIP or IAX)
     * @param string $uniqid Unique identifier of the provider (optional) when opening an existing one.
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
     * Saves a provider via AJAX request from a web form.
     *
     * @param string $type Provider type ('sip' or 'iax').
     */
    public function saveAction(string $type): void
    {
        if (!$this->request->isPost()) {
            $this->forward('network/index');
        }
        $this->db->begin();
        $data = $this->request->getPost();

        // Update SIP and IAX tables
        if (!$this->saveProvider($data, $type)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // Update additional hosts table for SIP providers
        if ($type === 'sip' && !$this->updateAdditionalHosts($data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
        $this->db->commit();

        // If it was creating a new provider, reload the page with the specified ID
        if (empty($data['id'])) {
            $this->view->reload = "providers/modify{$type}/{$data['uniqid']}";
        }
    }

    /**
     * Save provider data table.
     *
     * @param array $data POST data.
     * @param string $type Provider type ('sip' or 'iax').
     *
     * @return bool Save result.
     */
    private function saveProvider(array $data, string $type): bool
    {
        // Check if it's a new or existing provider.
        $provider = Providers::findFirstByUniqid($data['uniqid']);
        if ($provider === null) {
            $provider = new Providers();
            $provider->uniqid = $data['uniqid'];
            switch ($type) {
                case 'iax':
                    $provider->iaxuid = $data['uniqid'];
                    $provider->type = 'IAX';
                    $provider->Iax = new Iax();
                    break;
                case 'sip':
                    $provider->sipuid = $data['uniqid'];
                    $provider->type = 'SIP';
                    $provider->Sip = new Sip();
                    break;
            }
        }

        if (isset($data['note'])){
            $provider->note = $data['note'];
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
                case 'qualifyfreq':
                    $providerByType->$name = (int)$data[$name];
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
     * Update additional hosts table.
     *
     * @param array $data Array of fields from the POST request.
     *
     * @return bool Update result.
     */
    private function updateAdditionalHosts(array $data): bool
    {
        $providerHost = $data['host'];
        $additionalHosts = json_decode($data['additionalHosts']);
        if ($data['registration_type'] !== Sip::REG_TYPE_INBOUND) {
            $hosts = array_merge([], array_column($additionalHosts, 'address'), [$providerHost]);
        } else {
            $hosts = array_column($additionalHosts, 'address');
        }
        $parameters = [
            'conditions' => 'provider_id = :providerId:',
            'bind' => [
                'providerId' => $data['uniqid']
            ]
        ];
        $currentRecords = SipHosts::find($parameters);
        foreach ($currentRecords as $record) {
            if (!in_array($record->address, $hosts, true)) {
                if ($record->delete() === false) {
                    $errors = $record->getMessages();
                    $this->flash->warning(implode('<br>', $errors));
                    return false;
                }
            } elseif (($key = array_search($record->address, $hosts, true)) !== false) {
                unset($hosts[$key]);
            }
        }
        foreach ($hosts as $record) {
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
            if (!$iax->delete()) {
                $errors = $iax->getMessages();
            }
        }

        if ($errors === false && $provider->Sip) {
            $sip = $provider->Sip;
            if ($sip->SipHosts) {
                $sipHosts = $sip->SipHosts;
                if (!$sipHosts->delete()) {
                    $errors = $sipHosts->getMessages();
                }
            }
            if ($errors === false && !$sip->delete()) {
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