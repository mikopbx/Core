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

use MikoPBX\AdminCabinet\Forms\DefaultIncomingRouteForm;
use MikoPBX\AdminCabinet\Forms\IncomingRouteEditForm;
use MikoPBX\Common\Models\{Extensions, IncomingRoutingTable, Providers, Sip};


class IncomingRoutesController extends BaseController
{
    /**
     * Построение списка входящих маршрутов
     */
    public function indexAction(): void
    {
        $parameters = [
            'conditions' => 'id>1',
        ];

        $rules        = IncomingRoutingTable::find($parameters);
        $routingTable = [];
        foreach ($rules as $rule) {
            $provider = $rule->Providers;
            if ($provider) {
                $modelType  = ucfirst($provider->type);
                $provByType = $provider->$modelType;
            } else {
                $provByType = new SIP();
            }
            $extension = $rule->Extensions;

            $values = [
                'id'        => $rule->id,
                'rulename'  => $rule->rulename,
                'priority'  => $rule->priority,
                'number'    => $rule->number,
                'timeout'   => $rule->timeout,
                'provider'  => $rule->Providers ? $rule->Providers->getRepresent() : '',
                'disabled'  => $provByType->disabled,
                'extension' => $rule->extension,
                'callerid'  => $extension ? $extension->getRepresent() : '',
                'note'      => $rule->note,
            ];

            $routingTable[] = $values;
        }
        usort($routingTable, [__CLASS__, 'sortArrayByPriority']);

        // Create incoming rule with default action
        $defaultRule = IncomingRoutingTable::findFirstById(1);
        if ($defaultRule === null) {
            $defaultRule = IncomingRoutingTable::resetDefaultRoute();
        }
        // Список всех используемых эктеншенов
        $forwardingExtensions     = [];
        $forwardingExtensions[''] = $this->translation->_('ex_SelectNumber');
        $parameters               = [
            'conditions' => 'number IN ({ids:array})',
            'bind'       => [
                'ids' => [
                    $defaultRule->extension,
                ],
            ],
        ];
        $extensions               = Extensions::find($parameters);
        foreach ($extensions as $record) {
            $forwardingExtensions[$record->number] = $record ? $record->getRepresent() : '';
        }

        $form                     = new DefaultIncomingRouteForm($defaultRule, ['extensions' => $forwardingExtensions]);
        $this->view->form         = $form;
        $this->view->routingTable = $routingTable;
        $this->view->submitMode   = null;
    }


    /**
     * Карточка редактирования входящего маршрута
     *
     * @param string $ruleId Идентификатор правила маршрутизации
     */
    public function modifyAction(string $ruleId = ''): void
    {
        if ((int)$ruleId === 1) {
            $this->forward('incoming-routes/index');
        } // Первая строка маршрут по умолчанию, ее не трогаем.

        $rule = IncomingRoutingTable::findFirstByid($ruleId);
        if ($rule === null) {
            $parameters = [
                'column' => 'priority',
                'conditions'=>'id!=1'
            ];
            $rule = new IncomingRoutingTable();
            $rule->priority = (int)IncomingRoutingTable::maximum($parameters)+1;
        }

        // Список провайдеров
        $providersList         = [];
        $providersList['none'] = $this->translation->_('ir_AnyProvider');
        $providers             = Providers::find();
        foreach ($providers as $provider) {
            $modelType                          = ucfirst($provider->type);
            $provByType                         = $provider->$modelType;
            $providersList[$provByType->uniqid] = $provByType->getRepresent();
        }

        // Список всех используемых эктеншенов
        $forwardingExtensions     = [];
        $forwardingExtensions[''] = $this->translation->_('ex_SelectNumber');
        $parameters               = [
            'conditions' => 'number IN ({ids:array})',
            'bind'       => [
                'ids' => [
                    $rule->extension,
                ],
            ],
        ];
        $extensions               = Extensions::find($parameters);
        foreach ($extensions as $record) {
            $forwardingExtensions[$record->number] = $record ? $record->getRepresent() : '';
        }
        $form                  = new IncomingRouteEditForm(
            $rule,
            ['extensions' => $forwardingExtensions, 'providers' => $providersList]
        );
        $this->view->form      = $form;
        $this->view->represent = $rule->getRepresent();
    }


    /**
     * Сохранение входящего маршрута
     */
    public function saveAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }
        $this->db->begin();
        $data = $this->request->getPost();
        $rule = IncomingRoutingTable::findFirstByid($data['id']);
        if ($rule === null) {
            $rule = new IncomingRoutingTable();
        }

        foreach ($rule as $name => $value) {
            switch ($name) {
                case 'provider':
                    if ($data[$name] === 'none') {
                        $rule->$name = null;
                    } else {
                        $rule->$name = $data[$name];
                    }
                    break;
                case 'priority':
                    if (empty($data[$name])) {
                        // Найдем строчку с самым высоким приоиртетом, кроме 9999
                        $params      = [
                            'column'     => 'priority',
                            'conditions' => 'priority != 9999',
                        ];
                        $request     = IncomingRoutingTable::maximum($params);
                        $rule->$name = $request + 1;
                    } else {
                        $rule->$name = $data[$name];
                    }

                    break;
                default:
                    if (array_key_exists($name, $data)) {
                        $rule->$name = $data[$name];
                    }
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
            $this->view->reload = "incoming-routes/modify/{$rule->id}";
        }
    }

    /**
     * Удаление входящего маршрута
     *
     * @param string $ruleId
     */
    public function deleteAction(string $ruleId)
    {
        if ((int)$ruleId === 1) {
            $this->forward('incoming-routes/index'); // Первая строка маршрут по умолчанию, ее не трогаем.
        }

        $rule = IncomingRoutingTable::findFirstByid($ruleId);
        if ($rule !== null) {
            $rule->delete();
        }

        $this->forward('incoming-routes/index');
    }

    /**
     * Changes rules priority
     *
     */
    public function changePriorityAction(): void
    {
        $this->view->disable();
        $result = true;

        if ( ! $this->request->isPost()) {
            return;
        }
        $priorityTable = $this->request->getPost();
        $rules = IncomingRoutingTable::find();
        foreach ($rules as $rule){
            if (array_key_exists ( $rule->id, $priorityTable)){
                $rule->priority = $priorityTable[$rule->id];
                $result         .= $rule->update();
            }
        }
        echo json_encode($result);
    }
}