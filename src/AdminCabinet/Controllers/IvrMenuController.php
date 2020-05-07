<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */
namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\IvrMenuEditForm;
use MikoPBX\Common\Models\{Extensions, IvrMenu, IvrMenuActions, SoundFiles};

class IvrMenuController extends BaseController
{


    /**
     * Построение списка IVR меню
     */
    public function indexAction()
    {
        $this->view->ivrmenu = IvrMenu::find();
    }


    /**
     * Карточка редактирования IVR меню
     *
     * @param null $ivrmenuid идентификатор меню
     */
    public function modifyAction($ivrmenuid = null)
    {

        $ivrmenu                = IvrMenu::findFirstByUniqid($ivrmenuid);
        $ivrActionsList         = [];
        $soundfilesList[""]     = $this->translation->_("sf_SelectAudioFile");
        $extensionList[""]      = $this->translation->_("ex_SelectNumber");
        $extensionListForFilter = [];
        if ($ivrmenu===null) {
            $ivrmenu                   = new IvrMenu();
            $ivrmenu->uniqid           = strtoupper('IVR-' . md5($ivrmenu->id . time()));
            $ivrmenu->number_of_repeat = 3;
            $ivrmenu->extension
                                       = Extensions::getNextFreeApplicationNumber();
            $ivrmenu->timeout          = 7;

        } else {
            $extensionListForFilter[] = $ivrmenu->timeout_extension;
            // Списк экстеншенов очереди
            $parameters = [
                'order'      => 'digits',
                'conditions' => 'ivr_menu_id=:menu:',
                'bind'       => [
                    'menu' => $ivrmenu->uniqid,
                ],
            ];
            $actions    = IvrMenuActions::find($parameters);
            foreach ($actions as $action) {
                $ivrActionsList[]         = [
                    'id'                 => $action->id,
                    'extension'          => $action->extension,
                    'extensionRepresent' => str_replace('"', '\\"',
                        $action->Extensions->getRepresent()),
                    'digits'             => $action->digits,
                ];
                $extensionListForFilter[] = $action->extension;
            }
        }

        // Список всех эктеншенов выбранных ранее для правил адресации
        if (count($extensionListForFilter) > 0) {
            $parameters = [
                'conditions' => 'number IN ({ids:array})',
                'bind'       => [
                    'ids' => $extensionListForFilter,
                ],
            ];
            $extensions = Extensions::find($parameters);
            foreach ($extensions as $record) {
                $extensionList[$record->number] = $record->getRepresent();
            }
        }

        // Список звуковых файлов для IVR
        $soundFiles = SoundFiles::find('category="custom"');
        foreach ($soundFiles as $soundFile) {
            $soundfilesList[$soundFile->id] = $soundFile->getRepresent();
        }

        $form                   = new IvrMenuEditForm($ivrmenu, [
            'extensions' => $extensionList,
            'soundfiles' => $soundfilesList,
        ]);
        $this->view->form       = $form;
        $this->view->ivractions = $ivrActionsList;
        $this->view->represent  = $ivrmenu->getRepresent();

    }


    /**
     * Сохранение ivr меню
     */
    public function saveAction()
    {
        if ( ! $this->request->isPost()) {
            return;
        }

        $this->db->begin();

        $data          = $this->request->getPost();
        $ivrMenuRecord = IvrMenu::findFirstByUniqid($data['uniqid']);
        if ($ivrMenuRecord ===null) {
            $ivrMenuRecord = new IvrMenu();

            $extension                    = new Extensions();
            $extension->type              = "IVR MENU";
            $extension->number            = $data["extension"];
            $extension->callerid          = parent::transliterate($data["name"]);
            $extension->userid            = null;
            $extension->show_in_phonebook = 1;
            $extension->public_access     = 1;

        } else {
            $extension = $ivrMenuRecord->Extensions;
        }

        // Заполним параметры внутреннего номера
        if ( ! $this->updateExtension($extension, $data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // Заполним параметры IVR меню
        if ( ! $this->updateIVRMenu($ivrMenuRecord, $data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // Заполним параметры участников IVR Меню
        if ( ! $this->updateIVRMenuActions($data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        $this->view->success = true;
        $this->db->commit();

        // Если это было создание карточки то надо перегрузить страницу с указанием ID
        if (empty($data['id'])) {
            $this->view->reload = "ivr-menu/modify/{$data['uniqid']}";
        }
    }

    /**
     * Обновление параметров внутреннего номера
     *
     * @param \MikoPBX\Common\Models\Extensions $extension
     * @param array                      $data массив полей из POST запроса
     *
     * @return bool update result
     */
    private function updateExtension(Extensions $extension, array $data)
    {

        $extension->number   = $data['extension'];
        $extension->callerid = parent::transliterate($data['name']);
        if ($extension->save() === false) {
            $errors = $extension->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;

    }

    /**
     * Обновление параметров IVR меню
     *
     * @param \MikoPBX\Common\Models\IvrMenu $ivrMenu
     * @param array                   $data массив полей из POST запроса
     *
     * @return bool update result
     */
    private function updateIVRMenu(IvrMenu $ivrMenu, array $data)
    {

        // Заполним параметры записи Ivr Menu
        foreach ($ivrMenu as $name => $value) {
            switch ($name) {
                case "extension":
                    $ivrMenu->$name = $data[$name];
                    break;
                case "name":
                    $ivrMenu->$name = $data[$name];
                    break;
                case "allow_enter_any_internal_extension":
                    if (array_key_exists($name, $data) && $data[$name] == "on") {
                        $ivrMenu->$name = "1";
                    } else {
                        $ivrMenu->$name = "0";
                    }
                    break;
                default:
                    if ( ! array_key_exists($name, $data)) {
                        continue 2;
                    }
                    $ivrMenu->$name = $data[$name];
            }
        }
        if ($ivrMenu->save() === false) {
            $errors = $ivrMenu->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;

    }

    /**
     * Обновление действий в IVR меню
     *
     * @param array $data массив полей из POST запроса
     *
     * @return bool update result
     */
    private function updateIVRMenuActions(array $data)
    {

        $existDigits = [];

        // Заполним параметры IvrMenuActions
        $arrActions = json_decode($data['actions']);
        foreach ($arrActions as $value) {

            $parameters = [
                'conditions' => 'ivr_menu_id = :uniqid: AND digits=:digits:',
                'bind'       => [
                    'digits' => $value->digits,
                    'uniqid' => $data['uniqid'],
                ],
            ];
            $newRule    = IvrMenuActions::findFirst($parameters);
            if ($newRule ===null) {
                $newRule              = new IvrMenuActions();
                $newRule->digits      = $value->digits;
                $newRule->ivr_menu_id = $data['uniqid'];
            }
            $newRule->extension = $value->extension;
            if ($newRule->save() === false) {
                $errors = $newRule->getMessages();
                $this->flash->warning(implode('<br>', $errors));
                $this->view->success = false;

                return false;
            }
            $existDigits[] = $value->digits;
        }

        // Удалим лишние элементы меню
        $parameters = [
            'conditions' => 'digits NOT IN ({numbers:array}) AND ivr_menu_id=:uniqid:',
            'bind'       => [
                'numbers' => $existDigits,
                'uniqid'  => $data['uniqid'],
            ],
        ];

        $deletedActions = IvrMenuActions::find($parameters);
        if ($deletedActions && $deletedActions->delete() === false) {
            $errors = $deletedActions->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;

    }

    /**
     * Удаление ivr меню
     *
     * @param null $uniqid
     */
    public function deleteAction($uniqid = null)
    {
        $this->db->begin();
        $ivrmenu = IvrMenu::findFirstByUniqid($uniqid);

        $errors = false;
        if ($ivrmenu!==null && ! $ivrmenu->Extensions->delete()) {
            $errors = $ivrmenu->Extensions->getMessages();
        }

        if ($errors) {
            $this->flash->warning(implode('<br>', $errors));
            $this->db->rollback();
        } else {
            $this->db->commit();
        }

        return $this->forward('ivr-menu/index');
    }


}