<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\AsteriskManagerEditForm;
use MikoPBX\Common\Models\{AsteriskManagerUsers, NetworkFilters};
use Phalcon\Mvc\Model\Resultset;

class AsteriskManagersController extends BaseController
{

    private array $arrCheckBoxes;

    /**
     * Base class initialization
     */
    public function initialize(): void
    {
        $this->arrCheckBoxes = [
            'call',
            'cdr',
            'originate',
            'reporting',
            'agent',
            'config',
            'dialplan',
            'dtmf',
            'log',
            'system',
            'user',
            'verbose',
        ];
        parent::initialize();
    }

    /**
     * Generates Asterisk Managers index page
     */
    public function indexAction()
    {
        $amiUsers = AsteriskManagerUsers::find();
        $amiUsers->setHydrateMode(
            Resultset::HYDRATE_ARRAYS
        );

        $arrNetworkFilters = [];
        $networkFilters    = NetworkFilters::find();
        foreach ($networkFilters as $filter) {
            $arrNetworkFilters[$filter->id] = $filter->getRepresent();
        }
        $this->view->networkFilters = $arrNetworkFilters;
        $this->view->amiUsers       = $amiUsers;
    }


    /**
     * Modifies Asterisk Managers by Webinterface
     *
     * @param string $id AsteriskManagerUsers record ID
     */
    public function modifyAction($id = '')
    {
        $manager = AsteriskManagerUsers::findFirstById($id);
        if ($manager === null) {
            $manager = new AsteriskManagerUsers();
        }

        $arrNetworkFilters = [];
        $networkFilters    = NetworkFilters::getAllowedFiltersForType(
            [
                'AJAM',
                'AMI',
            ]
        );
        $arrNetworkFilters['none']
                           = $this->translation->_('ex_NoNetworkFilter');
        foreach ($networkFilters as $filter) {
            $arrNetworkFilters[$filter->id] = $filter->getRepresent();
        }


        $this->view->form = new AsteriskManagerEditForm(
            $manager,
            [
                'network_filters'     => $arrNetworkFilters,
                'array_of_checkboxes' => $this->arrCheckBoxes,
            ]
        );

        $this->view->arrCheckBoxes = $this->arrCheckBoxes;
        $this->view->represent     = $manager->getRepresent();
    }


    /**
     * Save Asterisk Manager User settings
     */
    public function saveAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }

        $data    = $this->request->getPost();
        $manager = null;
        if (isset($data['id'])) {
            $manager = AsteriskManagerUsers::findFirst($data['id']);
        }
        if ($manager === null) {
            $manager = new AsteriskManagerUsers();
        }

        foreach ($manager as $name => $value) {
            if (in_array($name, $this->arrCheckBoxes, true)) {
                $manager->$name = '';
                $manager->$name .= ($data[$name . '_read'] === 'on') ? 'read' : '';
                $manager->$name .= ($data[$name . '_write'] === 'on') ? 'write' : '';
                continue;
            }

            if ( ! array_key_exists($name, $data)) {
                continue;
            }
            $manager->$name = $data[$name];
        }
        $errors = false;
        if ( ! $manager->save()) {
            $errors = $manager->getMessages();
        }

        if ($errors) {
            $this->flash->error(implode('<br>', $errors));
            $this->view->success = false;
        } else {
            $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
            $this->view->success = true;
            $this->view->reload  = "asterisk-managers/modify/{$manager->id}";
        }
    }

    /**
     * Deletes Asterisk Manager
     *
     * @param string $amiId
     *
     * @return void
     */
    public function deleteAction(string $amiId = ''): void
    {
        $manager = AsteriskManagerUsers::findFirstByid($amiId);
        if ($manager !== null) {
            $manager->delete();
        }
        $this->forward('asterisk-managers/index');
    }

    /**
     * Checks uniqueness for AMI username from JS.
     *
     * @param string $username
     *
     * @return void  result send by ControllerBase::afterExecuteRoute()
     */
    public function availableAction(string $username): void
    {
        $result = true;
        $amiUser = AsteriskManagerUsers::findFirst("username = '{$username}'");
        if ($amiUser !== null) {
            $result             = false;
            $this->view->userId = $amiUser->id;
        }
        $this->view->nameAvailable = $result;
        $this->view->success = true;
    }
}