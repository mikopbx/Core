<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\OutgoingRouteEditForm;
use MikoPBX\Common\Models\{OutgoingRoutingTable, Providers};


class OutboundRoutesController extends BaseController
{


    /**
     * Builds the list outgoing routes
     */
    public function indexAction(): void
    {
        $rules        = OutgoingRoutingTable::find(['order' => 'priority']);
        $routingTable = [];
        foreach ($rules as $rule) {
            $provider = $rule->Providers;
            if ($provider) {
                $modelType      = ucfirst($provider->type);
                $provByType     = $provider->$modelType;
                $routingTable[] = [
                    'id'               => $rule->id,
                    'priority'         => $rule->priority,
                    'provider'         => $provider->getRepresent(),
                    'numberbeginswith' => $rule->numberbeginswith,
                    'restnumbers'      => $rule->restnumbers,
                    'trimfrombegin'    => $rule->trimfrombegin,
                    'prepend'          => $rule->prepend,
                    'note'             => $rule->note,
                    'rulename'         => $rule->getRepresent(),
                    'disabled'         => $provByType->disabled,
                ];
            } else {
                $routingTable[] = [
                    'id'               => $rule->id,
                    'priority'         => $rule->priority,
                    'provider'         => null,
                    'numberbeginswith' => $rule->numberbeginswith,
                    'restnumbers'      => $rule->restnumbers,
                    'trimfrombegin'    => $rule->trimfrombegin,
                    'prepend'          => $rule->prepend,
                    'note'             => $rule->note,
                    'rulename'         => '<i class="icon attention"></i> ' . $rule->getRepresent(),
                    'disabled'         => false,
                ];
            }
        }

        $this->view->routingTable = $routingTable;
    }

    /**
     * Shows the edit form for an outbound route
     *
     * @param string $id
     */
    public function modifyAction($id = ''): void
    {
        $rule = OutgoingRoutingTable::findFirstByid($id);
        if ($rule === null) {
            $rule = new OutgoingRoutingTable();
        }

        $providers     = Providers::find();
        $providersList = [];
        foreach ($providers as $provider) {
            $providersList[$provider->uniqid] = $provider->getRepresent();
        }

        uasort($providersList, [__CLASS__, "sortArrayByNameAndState"]);

        if ($rule->restnumbers === '-1') {
            $rule->restnumbers = '';
        }
        $this->view->form      = new OutgoingRouteEditForm($rule, $providersList);
        $this->view->represent = $rule->getRepresent();
    }

    /**
     * Сохранение карточки исходящего маршрута
     */
    public function saveAction(): void
    {
        $this->db->begin();

        $data = $this->request->getPost();

        $rule = OutgoingRoutingTable::findFirstByid($data['id']);
        if ($rule === null) {
            $rule = new OutgoingRoutingTable();
        }

        foreach ($rule as $name => $value) {
            switch ($name) {
                case 'restnumbers':
                {
                    if ( ! array_key_exists($name, $data)) {
                        continue 2;
                    }
                    $rule->$name = $data[$name] === '' ? '-1' : $data[$name];
                    break;
                }
                default:
                    if ( ! array_key_exists($name, $data)) {
                        continue 2;
                    }
                    $rule->$name = $data[$name];
            }
        }

        if ($rule->save() === false) {
            $errors = $rule->getMessages();
            $this->flash->warning(implode('<br>', $errors));
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
        $this->db->commit();

        // Если это было создание карточки то надо перегрузить страницу с указанием ID
        if (empty($data['id'])) {
            $this->view->reload = "outbound-routes/modify/{$rule->id}";
        }
    }


    /**
     * Удаление исходящего маршрута из базы данных
     *
     * @param string $id
     */
    public function deleteAction($id = ''): void
    {
        $rule = OutgoingRoutingTable::findFirstByid($id);
        if ($rule !== null) {
            $rule->delete();
        }

        $this->forward('outbound-routes/index');
    }

    /**
     * Изменение приоритета правила
     *
     * @param string $ruleid
     */
    public function changePriorityAction($ruleid = ''): void
    {
        $this->view->disable();
        $result = false;

        if ( ! $this->request->isPost()) {
            return;
        }
        $data = $this->request->getPost();
        $rule = OutgoingRoutingTable::findFirstById($ruleid);
        if ($rule !== null) {
            $rule->priority = intval($data['newPriority']);
            $result         = $rule->update();
        }
        echo json_encode($result);
    }

    /**
     * Sort array
     *
     * @param $a
     * @param $b
     *
     * @return int|null
     */
    private function sortArrayByNameAndState($a, $b): ?int
    {
        $sDisabled = $this->translation->_('mo_Disabled');
        if ($a == $b) {
            return 0;
        } elseif (strpos($a, $sDisabled) !== false && strpos($b, $sDisabled) === false) {
            return 1;
        } else {
            return ($a < $b) ? -1 : 1;
        }
    }
}