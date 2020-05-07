<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */
namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\TimeFrameEditForm;
use MikoPBX\Common\Models\{Extensions, OutWorkTimes, SoundFiles};

class OutOffWorkTimeController extends BaseController
{


    /**
     * Построение списка правила маршрутизации в нерабочее время
     */
    public function indexAction()
    {
        $paremeters      = [
            'order' => 'date_from, weekday_from, time_from',
        ];
        $timeframesTable = [];
        $timeFrames      = OutWorkTimes::find($paremeters);
        foreach ($timeFrames as $timeFrame) {
            $timeframesTable[] = [
                'id'               => $timeFrame->id,
                'date_from'        => ( ! empty($timeFrame->date_from))
                > 0 ? date("d/m/Y",
                    $timeFrame->date_from) : '',
                'date_to'          => ( ! empty($timeFrame->date_to)) > 0
                    ? date("d/m/Y", $timeFrame->date_to) : '',
                'weekday_from'     => ( ! empty($timeFrame->weekday_from)) ? $this->translation->_(date('D',
                    strtotime("Sunday +{$timeFrame->weekday_from} days"))) : '',
                'weekday_to'       => ( ! empty($timeFrame->weekday_to)) ? $this->translation->_(date('D',
                    strtotime("Sunday +{$timeFrame->weekday_to} days"))) : '',
                'time_from'        => $timeFrame->time_from,
                'time_to'          => $timeFrame->time_to,
                'action'           => $timeFrame->action,
                'audio_message_id' => ($timeFrame->SoundFiles) ? $timeFrame->SoundFiles->name : '',
                'extension'        => ($timeFrame->Extensions) ? $timeFrame->Extensions->getRepresent() : '',
                'description'      => $timeFrame->description,
            ];
        }

        $this->view->indexTable = $timeframesTable;
    }

    /**
     * Карточка редактирования записи нерабочего времени
     *
     * @param null $id
     */
    public function modifyAction($id = null): void
    {
        $timeFrame = OutWorkTimes::findFirstById($id);
        if ($timeFrame===null) {
            $timeFrame = new OutWorkTimes();
        }

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

        $form                  = new TimeFrameEditForm($timeFrame, [
            'extensions'        => $forwardingExtensions,
            'audio-message'     => $audioMessages,
            'available-actions' => $availableActions,
            'week-days'         => $weekDays,
        ]);
        $this->view->form      = $form;
        $this->view->represent = $timeFrame->getRepresent();
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
        if ($timeFrame ===null) {
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

        if ($timeFrame->save() === false) {
            $errors = $timeFrame->getMessages();
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
            $this->view->reload = "out-off-work-time/modify/{$timeFrame->id}";
        }

    }

    /**
     * Удаление запси с данными о нерабочем времени
     *
     * @param null $id
     */
    public function deleteAction($id = null)
    {
        $timeFrame = OutWorkTimes::findFirstByid($id);
        if ($timeFrame!==null) {
            $timeFrame->delete();
        }

        return $this->forward('OutOffWorkTime/index');

    }


}
