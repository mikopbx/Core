<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\SoundFilesEditForm;
use MikoPBX\Common\Models\SoundFiles;

class SoundFilesController extends BaseController
{

    /**
     * Build sounds list
     */
    public function indexAction(): void
    {
        $this->view->mohFiles    = SoundFiles::find('category="' . SoundFiles::CATEGORY_MOH . '"');
        $this->view->customFiles = SoundFiles::find('category="' . SoundFiles::CATEGORY_CUSTOM . '"');
    }


    /**
     * Open and edit record
     *
     * @param string $id редактируемой записи
     */
    public function modifyAction(string $id = ''): void
    {
        if (in_array($id, [SoundFiles::CATEGORY_CUSTOM, SoundFiles::CATEGORY_MOH], true)) {
            $file           = new SoundFiles();
            $file->category = $id;
        } else {
            $file = SoundFiles::findFirstById($id);
        }
        if ($file === null) {
            $file           = new SoundFiles();
            $file->category = SoundFiles::CATEGORY_CUSTOM;
        }

        $form                  = new SoundFilesEditForm($file);
        $this->view->form      = $form;
        $this->view->audioPath = empty($file->path) ? '' : "/pbxcore/api/cdr/playback?view={$file->path}";
    }


    /**
     * Save sound file to storage
     *
     * @return void
     */
    public function saveAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }
        $data = $this->request->getPost();

        $soundFile = SoundFiles::findFirstById($data['id']);
        if ($soundFile === null) {
            $soundFile = new SoundFiles();
        }

        foreach ($soundFile as $name => $value) {
            switch ($name) {
                case "id":
                    break;
                default:
                    if ( ! array_key_exists($name, $data)) {
                        continue 2;
                    }
                    $soundFile->$name = $data[$name];
            }
        }

        if ($soundFile->save() === false) {
            $errors = $soundFile->getMessages();
            $this->flash->error(implode('<br>', $errors));
            $this->view->success = false;
        } else {
            $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
            $this->view->success = true;
            // If it was create new one, we will reload page
            if (empty($data['id'])) {
                $this->view->reload = "sound-files/modify/{$soundFile->id}";
            }
        }
    }

    /**
     * Delete sound file by ID
     *
     * @param string $id
     */
    public function deleteAction(string $id = ''): void
    {
        $soundFile = SoundFiles::findFirstById($id);
        $errors    = null;
        if ($soundFile !== null && ! $soundFile->delete()) {
            $errors = $soundFile->getMessages();
        }
        if ($errors) {
            $this->flash->error(implode('<br>', $errors));
            $this->view->success = false;
        } else {
            $this->view->success = true;
        }
    }

    /**
     * Get full path to the file by ID
     *
     * @param string $id
     */
    public function getPathByIdAction(string $id = ''): void
    {
        $soundFile = SoundFiles::findFirstById($id);
        if ($soundFile !== null) {
            $this->view->message = $soundFile->path;
            $this->view->success = true;
        } else {
            $this->view->success = false;
        }
    }

}