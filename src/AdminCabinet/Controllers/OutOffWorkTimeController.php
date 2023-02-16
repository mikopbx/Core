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

use MikoPBX\AdminCabinet\Forms\TimeFrameEditForm;
use MikoPBX\Common\Models\{Extensions,
    IncomingRoutingTable,
    OutWorkTimes,
    OutWorkTimesRouts,
    Sip,
    SoundFiles};

class OutOffWorkTimeController extends BaseController
{


    /**
     * Построение списка правила маршрутизации в нерабочее время
     */
    public function indexAction(): void
    {
        $paremeters      = [
            'order' => 'date_from, weekday_from, time_from',
        ];
        $timeframesTable = [];
        $timeFrames      = OutWorkTimes::find($paremeters);
        foreach ($timeFrames as $timeFrame) {
            if(mb_strlen($timeFrame->description) < 50){
                $shot_description = $timeFrame->description;
            }else{
                $shot_description = trim(mb_substr($timeFrame->description, 0 , 50)).'...';
            }
            $timeframesTable[] = [
                'id'               => $timeFrame->id,
                'date_from'        => ( ! empty($timeFrame->date_from))
                > 0 ? date(
                    "d.m.Y",
                    $timeFrame->date_from
                ) : '',
                'date_to'          => ( ! empty($timeFrame->date_to)) > 0
                    ? date("d.m.Y", $timeFrame->date_to) : '',
                'weekday_from'     => ( ! empty($timeFrame->weekday_from)) ? $this->translation->_(
                    date(
                        'D',
                        strtotime("Sunday +{$timeFrame->weekday_from} days")
                    )
                ) : '',
                'weekday_to'       => ( ! empty($timeFrame->weekday_to)) ? $this->translation->_(
                    date(
                        'D',
                        strtotime("Sunday +{$timeFrame->weekday_to} days")
                    )
                ) : '',
                'time_from'        => $timeFrame->time_from,
                'time_to'          => $timeFrame->time_to,
                'action'           => $timeFrame->action,
                'audio_message_id' => ($timeFrame->SoundFiles) ? $timeFrame->SoundFiles->name : '',
                'extension'        => ($timeFrame->Extensions) ? $timeFrame->Extensions->getRepresent() : '',
                'description'      => $timeFrame->description,
                'allowRestriction' => $timeFrame->allowRestriction,
                'shot_description' => $shot_description,
            ];
        }

        $this->view->indexTable = $timeframesTable;
    }

    /**
     * Карточка редактирования записи нерабочего времени
     *
     * @param string $id
     */
    public function modifyAction($id = ''): void
    {
        $timeFrame = OutWorkTimes::findFirstById($id);
        if ($timeFrame === null) {
            $timeFrame = new OutWorkTimes();
        }
        $forwardingExtensions = [];
        $forwardingExtensions[""] = $this->translation->_("ex_SelectNumber");
        $parameters               = [
            'conditions' => 'number = :extension:',
            'bind'       => [
                'extension' => $timeFrame->extension,
            ],
        ];
        $extensions               = Extensions::find($parameters);
        foreach ($extensions as $record) {
            $forwardingExtensions[$record->number] = $record->getRepresent();
        }
        $audioMessages = [];
        $audioMessages[""] = $this->translation->_("sf_SelectAudioFile");
        $soundFiles        = SoundFiles::find('category="custom"');
        foreach ($soundFiles as $record) {
            $audioMessages[$record->id] = $record->name;
        }

        $availableActions = [
            'playmessage' => $this->translation->_('tf_SelectActionPlayMessage'),
            'extension'   => $this->translation->_('tf_SelectActionRedirectToExtension'),
        ];

        $weekDays = ['-1' => '-'];
        for ($i = "1"; $i <= 7; $i++) {
            $weekDays[$i] = $this->translation->_(date('D', strtotime("Sunday +{$i} days")));
        }

        $form                  = new TimeFrameEditForm(
            $timeFrame, [
            'extensions'        => $forwardingExtensions,
            'audio-message'     => $audioMessages,
            'available-actions' => $availableActions,
            'week-days'         => $weekDays,
        ]
        );
        $this->view->form      = $form;
        $this->view->represent = $timeFrame->getRepresent();

        // Получим список ссылок на разрещенные правила маршутизации в этой группе
        $parameters      = [
            'columns'    => 'routId AS rule_id',
            'conditions' => 'timeConditionId=:timeConditionId:',
            'bind'       => [
                'timeConditionId' => $id,
            ],
        ];
        $allowedRules    = OutWorkTimesRouts::find($parameters)->toArray();
        $allowedRulesIds = array_column($allowedRules, 'rule_id');

        // Получим список правил маршрутизации
        $rules        = IncomingRoutingTable::find(['order' => 'priority', 'conditions' => 'id>1']);
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
                'provider-uniqid'  => $rule->Providers ? $rule->Providers->uniqid : 'none',
                'disabled'  => $provByType->disabled,
                'extension' => $rule->extension,
                'callerid'  => $extension ? $extension->getRepresent() : '',
                'note'      => $rule->note,
                'status'    => in_array($rule->id, $allowedRulesIds, true) ? '' : 'disabled',
            ];

            $routingTable[] = $values;
        }
        $this->view->rules = $routingTable;
    }

    /**
     * Сохранение записи нерабочего времени
     */
    public function saveAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }
        $data = $this->request->getPost();

        $this->db->begin();
        $timeFrame = OutWorkTimes::findFirstByid($data['id']);
        if ($timeFrame === null) {
            $timeFrame = new OutWorkTimes();
        }

        // Заполним параметры пользователя
        foreach ($timeFrame as $name => $value) {
            switch ($name) {
                case 'weekday_from':
                case 'weekday_to':
                    if ( ! array_key_exists($name, $data)) {
                        $timeFrame->$name = '';
                    } else {
                        $timeFrame->$name = ($data[$name] < 1) ? null : $data[$name];
                    }

                    break;
                case 'allowRestriction':
                    if(isset($data[$name])){
                        $timeFrame->$name = ($data[$name] === 'on') ? "1" : "0";
                    }else{
                        $timeFrame->$name = '0';
                    }
                    break;
                case 'date_from':
                case 'date_to':
                case 'time_from':
                case 'time_to':
                    if ( ! array_key_exists($name, $data)) {
                        $timeFrame->$name = '';
                    } else {
                        $timeFrame->$name = $data[$name];
                    }
                    break;
                default:
                    if ( ! array_key_exists($name, $data)) {
                        continue 2;
                    }
                    $timeFrame->$name = $data[$name];
            }
        }

        if('playmessage' === $timeFrame->action){
            $timeFrame->extension = '';
        }
        $error = false;
        if ($timeFrame->save() === false) {
            $errors = $timeFrame->getMessages();
            $this->flash->warning(implode('<br>', $errors));
            $this->view->success = false;
            $this->db->rollback();
            return;
        }
        if ( ! $error) {
            $data['id'] = $timeFrame->id;
            $error = ! $this->saveAllowedOutboundRules($data);
        }

        if($error){
            $this->view->success = false;
            $this->db->rollback();
        }else{
            $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
            $this->view->success = true;
            $this->db->commit();
        }


        // Если это было создание карточки то надо перегрузить страницу с указанием ID
        if (empty($data['id'])) {
            $this->view->reload = "out-off-work-time/modify/{$timeFrame->id}";
        }
    }

    /**
     * Сохраняет параметры маршрутов
     *
     * @param $data
     *
     * @return bool
     */
    private function saveAllowedOutboundRules($data): bool
    {
        // 1. Удалим все старые ссылки на правила относящиеся к этой группе
        $parameters = [
            'conditions' => 'timeConditionId=:timeConditionId:',
            'bind'       => [
                'timeConditionId' => $data['id'],
            ],
        ];
        $oldRules   = OutWorkTimesRouts::find($parameters);
        if ($oldRules->delete() === false) {
            $errors = $oldRules->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        // 2. Запишем разрешенные направления
        foreach ($data as $key => $value) {
            if (substr_count($key, 'rule-') > 0) {
                $rule_id = explode('rule-', $key)[1];
                if ($data[$key] === 'on') {
                    $newRule = new OutWorkTimesRouts();
                    $newRule->id = $rule_id;
                    $newRule->timeConditionId = $data['id'];
                    $newRule->routId          = $rule_id;
                    if ($newRule->save() === false) {
                        $errors = $newRule->getMessages();
                        $this->flash->error(implode('<br>', $errors));
                        return false;
                    }
                }
            }
        }

        return true;
    }

    /**
     * Удаление запси с данными о нерабочем времени
     *
     * @param string $id
     */
    public function deleteAction($id = '')
    {
        $timeFrame = OutWorkTimes::findFirstByid($id);
        if ($timeFrame !== null) {
            $timeFrame->delete();
        }

        $this->forward('OutOffWorkTime/index');
    }


}
