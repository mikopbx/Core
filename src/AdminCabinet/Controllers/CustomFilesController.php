<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */
namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\CustomFilesEditForm;
use MikoPBX\Common\Models\CustomFiles;


class CustomFilesController extends BaseController
{

    /**
     * Построение списка файлов
     */
    public function indexAction()
    {

        $files = CustomFiles::find();

        $this->view->files = $files;
    }


    /**
     * Открытие карточки редактирования Файла записи
     *
     * @param string $id редактируемой записи
     */
    public function modifyAction(string $id)
    {
        $file = CustomFiles::findFirstById($id);
        if ($file===null) {
            return $this->forward('custom-files/index');
        }

        $form                   = new CustomFilesEditForm($file);
        $this->view->content    = $file->getContent();
        $this->view->form       = $form;
        $this->view->represent  = $file->getRepresent();
        $this->view->submitMode = null;
    }


    /**
     * Сохранение параметров переопределения системного файла
     *
     * @return void
     */
    public function saveAction()
    {
        if ( ! $this->request->isPost()) {
            return;
        }

        $data       = $this->request->getPost();
        $customFile = CustomFiles::findFirstById($data['id']);
        if ($customFile === null) {
            return;
        }

        // Заполним параметры записи
        foreach ($customFile as $name => $value) {
            switch ($name) {
                case "changed":
                    $customFile->changed = 1;
                    break;
                case "content":
                    $customFile->setContent($data[$name]);
                    break;
                default:
                    if ( ! array_key_exists($name, $data)) {
                        continue 2;
                    }
                    $customFile->$name = $data[$name];
            }
        }
        if ($customFile->save() === false) {
            $errors = $customFile->getMessages();
            $this->flash->error(implode('<br>', $errors));
            $this->view->success = false;
        } else {
            $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
            $this->view->success = true;
        }

    }
}