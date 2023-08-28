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

use MikoPBX\AdminCabinet\Forms\CustomFilesEditForm;
use MikoPBX\Common\Models\CustomFiles;


class CustomFilesController extends BaseController
{

    /**
     * Build the list of files.
     */
    public function indexAction(): void
    {
        $files = CustomFiles::find();

        $this->view->files = $files;
    }


    /**
     * Open the file edit card.
     *
     * @param string $id The ID of the file to be edited.
     */
    public function modifyAction(string $id): void
    {
        $file = CustomFiles::findFirstById($id);
        if ($file === null) {
            $this->forward('custom-files/index');
        }

        $form                   = new CustomFilesEditForm($file);
        $this->view->content    = $file->getContent();
        $this->view->form       = $form;
        $this->view->represent  = $file->getRepresent();
        $this->view->submitMode = null;
    }


    /**
     * Save the parameters of the custom file override.
     */
    public function saveAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }

        $data       = $this->request->getPost();
        $customFile = CustomFiles::findFirstById($data['id']);
        if ($customFile === null) {
            return;
        }

        // Update file parameters
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
        if (empty($customFile->getContent())){
            $customFile->mode = CustomFiles::MODE_NONE;
        }

        $this->saveEntity($customFile, "custom-files/modify/{id}");
    }
}