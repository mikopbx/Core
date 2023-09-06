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

use MikoPBX\AdminCabinet\Forms\CallQueueEditForm;
use MikoPBX\Common\Models\{CallQueueMembers, CallQueues, Extensions, SoundFiles};

class CallQueuesController extends BaseController
{

    /**
     *  Builds call queues representation
     */
    public function indexAction(): void
    {
        $records = CallQueueMembers::find();
        $callQueueMembers=[];
        foreach ($records as $record) {
            $callQueueMembers[$record->queue][$record->id]=[
                'priority'=>$record->priority,
                'represent'=>$record->Extensions===null?'ERROR':$record->Extensions->getRepresent()
            ];
        }

        $records = CallQueues::find();
        $callQueuesList=[];
        foreach ($records as $record) {
            $members = $callQueueMembers[$record->uniqid];
            if (is_array($members)){
                usort($members, [__CLASS__, 'sortArrayByPriority']);
            } else {
                $members = [];
            }
            $callQueuesList[]=[
                'uniqid'=>$record->uniqid,
                'name'=>$record->name,
                'extension'=>$record->extension,
                'members'=>$members,
                'description'=>$record->description,
            ];
        }
        $this->view->callQueuesList = $callQueuesList;

    }

    /**
     * Карточка редактирования очереди
     *
     * @param string $uniqid - идентификатор редактируемой очереди
     */
    public function modifyAction(string $uniqid = ''): void
    {
        $queue            = CallQueues::findFirstByUniqid($uniqid);
        $queueMembersList = [];
        $soundfilesList   = [];
        $extensionList    = [];
        if ($queue === null) {
            $queue                              = new CallQueues();
            $queue->uniqid                      = Extensions::TYPE_QUEUE . strtoupper('-' . md5($queue->id . time()));
            $queue->caller_hear                 = 'moh';
            $queue->seconds_to_ring_each_member = 60;
            $queue->seconds_for_wrapup          = 1;
            $queue->announce_position           = 0;
            $queue->announce_hold_time          = 0;
            $queue->periodic_announce_frequency = 30;
            $queue->extension                   = Extensions::getNextFreeApplicationNumber();
        } else {
            // Списк экстеншенов очереди
            $parameters = [
                'conditions' => 'queue=:queue:',
                'bind'       => [
                    'queue' => $queue->uniqid,
                ],
            ];
            $members    = CallQueueMembers::find($parameters);
            foreach ($members as $member) {
                $queueMembersList[] = [
                    'id'       => $member->id,
                    'number'   => $member->extension,
                    'priority'  => $member->priority,
                    'callerid' => $member->Extensions===null?'ERROR':$member->Extensions->getRepresent(),
                ];
            }
            usort($queueMembersList, [__CLASS__, 'sortArrayByPriority']);
        }

        $extensionList[""] = $this->translation->_("ex_SelectNumber");
        // Список всех используемых эктеншенов
        $parameters = [
            'conditions' => 'number IN ({ids:array})',
            'bind'       => [
                'ids' => [
                    $queue->timeout_extension,
                    $queue->redirect_to_extension_if_empty,
                    $queue->redirect_to_extension_if_unanswered,
                    $queue->redirect_to_extension_if_repeat_exceeded,
                ],
            ],
        ];
        $extensions = Extensions::find($parameters);
        foreach ($extensions as $record) {
            $extensionList[$record->number] = $record->getRepresent();
        }

        // Список звуковых файлов для очередей
        $soundfilesList[""] = $this->translation->_("sf_SelectAudioFile");
        $soundfilesList[-1] = '-';
        $mohSoundFilesList  = $soundfilesList;

        $soundFiles         = SoundFiles::find(['columns' => 'id,name,category']);
        foreach ($soundFiles as $soundFile) {
            if(SoundFiles::CATEGORY_CUSTOM === $soundFile->category){
                $soundfilesList[$soundFile->id] = $soundFile->name;
            }else{
                $mohSoundFilesList[$soundFile->id] = $soundFile->name;
            }
        }

        $form                        = new CallQueueEditForm(
            $queue, [
                      'extensions' => $extensionList,
                      'soundfiles' => $soundfilesList,
                      'mohSoundFiles' => $mohSoundFilesList,
                  ]
        );
        $this->view->form            = $form;
        $this->view->extensionsTable = $queueMembersList;
        $this->view->represent       = $queue->getRepresent();
        $this->view->extension       = $queue->extension;
    }


    /**
     * Сохранение очереди через AJAX запрос из формы
     */
    public function saveAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }
        $this->db->begin();

        $data  = $this->request->getPost();
        $queue = CallQueues::findFirstByUniqid($data['uniqid']);
        if ($queue === null) {
            $queue                        = new CallQueues();
            $extension                    = new Extensions();
            $extension->type              = Extensions::TYPE_QUEUE;
            $extension->number            = $data["extension"];
            $extension->callerid          = $this->sanitizeCallerId($data["name"]);
            $extension->userid            = null;
            $extension->show_in_phonebook = 1;
            $extension->public_access     = 1;
        } else {
            $extension = $queue->Extensions;
        }

        // Заполним параметры внутреннего номера
        if ( ! $this->updateExtension($extension, $data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // Заполним параметры пользователя
        if ( ! $this->updateQueue($queue, $data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // Заполним параметры участников очереди
        if ( ! $this->updateQueueMembers($data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
        $this->db->commit();

        // Если это было создание карточки то надо перегрузить страницу с указанием ID
        if (empty($data['id'])) {
            $this->view->reload = "call-queues/modify/{$data['uniqid']}";
        }
    }

    /**
     * Обновление параметров внутреннего номера
     *
     * @param \MikoPBX\Common\Models\Extensions $extension
     * @param array                             $data массив полей из POST запроса
     *
     * @return bool update result
     */
    private function updateExtension(Extensions $extension, array $data): bool
    {
        $extension->number   = $data['extension'];
        $extension->callerid = $this->sanitizeCallerId($data['name']);
        if ($extension->save() === false) {
            $errors = $extension->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;
    }

    /**
     * Обновление параметров очереди
     *
     * @param \MikoPBX\Common\Models\CallQueues $queue
     * @param array                             $data массив полей из POST запроса
     *
     * @return bool update result
     */
    private function updateQueue(CallQueues $queue, array $data): bool
    {
        foreach ($queue as $name => $value) {
            switch ($name) {
                case "extension":
                case "name":
                    $queue->$name = $data[$name];
                    break;
                case "recive_calls_while_on_a_call":
                case "announce_position":
                case "announce_hold_time":
                    if (array_key_exists($name, $data)) {
                        $queue->$name = ($data[$name] == 'on') ? "1" : "0";
                    } else {
                        $queue->$name = "0";
                    }
                    break;

                case "periodic_announce_sound_id":
                case "moh_sound_id":
                case "redirect_to_extension_if_repeat_exceeded":
                case "redirect_to_extension_if_empty":
                    if ( ! array_key_exists($name, $data) || empty($data[$name])) {
                        $queue->$name = null;
                        continue 2;
                    }
                    $queue->$name = $data[$name];

                    break;
                case "timeout_to_redirect_to_extension":
                case "number_unanswered_calls_to_redirect":
                    if ( ! array_key_exists($name, $data)) {
                        continue 2;
                    }
                    if (empty($data[$name])) {
                        $queue->$name = null;
                    } else {
                        $queue->$name = $data[$name];
                    }
                    break;
                case "timeout_extension":
                    if ( ! array_key_exists($name, $data)
                        || empty($data[$name])
                        || (array_key_exists('timeout_to_redirect_to_extension', $data)
                            && intval($data['timeout_to_redirect_to_extension']) === 0)) {
                        $queue->$name = null;
                        continue 2;
                    }
                    $queue->$name = $data[$name];

                    break;
                case "redirect_to_extension_if_unanswered":
                    if ( ! array_key_exists($name, $data)
                        || empty($data[$name])
                        || (array_key_exists('number_unanswered_calls_to_redirect', $data)
                            && intval($data['number_unanswered_calls_to_redirect']) === 0)) {
                        $queue->$name = null;
                        continue 2;
                    }
                    $queue->$name = $data[$name];

                    break;
                default:
                    if ( ! array_key_exists($name, $data)) {
                        continue 2;
                    }
                    $queue->$name = $data[$name];
            }
        }

        if ($queue->save() === false) {
            $errors = $queue->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;
    }

    /**
     * Обновление списка участников очереди
     *
     * @param array $data массив полей из POST запроса
     *
     * @return bool update result
     */
    private function updateQueueMembers(array $data): bool
    {
        $realMembers = [];
        // Обновим настройки у существующих членов очереди
        $membersTable = json_decode($data['members']);
        foreach ($membersTable as $member) {
            $parameters   = [
                'conditions' => 'extension = :number: AND queue=:uniqid:',
                'bind'       => [
                    'number' => $member->number,
                    'uniqid' => $data['uniqid'],
                ],
            ];
            $queueMembers = CallQueueMembers::find($parameters);
            if (is_countable($queueMembers) && count($queueMembers) > 1) {
                // откуда то взались лишние. Надо их всех удалить и создать нового
                if ($queueMembers->delete() === false) {
                    $errors = $queueMembers->getMessages();
                    $this->flash->error(implode('<br>', $errors));

                    return false;
                }
                $queueMember = new CallQueueMembers();
            } elseif (is_countable($queueMembers) && count($queueMembers) === 1) {
                $queueMember = $queueMembers->getFirst();
            } else {
                $queueMember = new CallQueueMembers();
            }

            $queueMember->priority  = $member->priority;
            $queueMember->extension = $member->number;
            $queueMember->queue     = $data['uniqid'];
            $realMembers[]          = $member->number;
            if ($queueMember->save() === false) {
                $errors = $queueMember->getMessages();
                $this->flash->error(implode('<br>', $errors));

                return false;
            }
        }

        // Удалим членов очереди которх нет в списке
        $parameters = [
            'conditions' => 'extension NOT IN  ({numbers:array}) AND queue=:uniqid:',
            'bind'       => [
                'numbers' => $realMembers,
                'uniqid'  => $data['uniqid'],
            ],
        ];

        $deletedMembers = CallQueueMembers::find($parameters);
        if ($deletedMembers && $deletedMembers->delete() === false) {
            $errors = $deletedMembers->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;
    }

    /**
     * Удаление очереди по ее ID
     *
     * @param string $uniqid
     */
    public function deleteAction(string $uniqid = ''): void
    {
        if ($uniqid === '') {
            return;
        }

        $queue = CallQueues::findFirstByUniqid($uniqid);
        if ($queue === null) {
            return;
        }
        $errors = false;

        $this->db->begin();
        $extension = $queue->Extensions;
        if ( ! $extension->delete()) {
            $errors = $extension->getMessages();
        }
        if ($errors) {
            $this->flash->warning(implode('<br>', $errors));
            $this->db->rollback();
        } else {
            $this->db->commit();
        }

        $this->forward('call-queues/index');
    }
}