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

use MikoPBX\AdminCabinet\Forms\Fail2BanEditForm;
use MikoPBX\Common\Models\{Fail2BanRules, PbxSettings, PbxSettingsConstants};

class Fail2BanController extends BaseController
{

    /**
     * Builds the index page for the internal numbers and employees.
     */
    public function indexAction(): void
    {
        // Check if Fail2Ban rules exist, otherwise create a new instance
        $rules = Fail2BanRules::findFirst();
        if ($rules === null) {
            $rules = new Fail2BanRules();
        }

        // Get the Fail2Ban enabled status from PbxSettings
        $fail2BanEnabled = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_FAIL2BAN_ENABLED);

        // Set the Fail2BanEditForm and its data to the view
        $this->view->form = new Fail2BanEditForm(
            $rules,
            [PbxSettingsConstants::PBX_FAIL2BAN_ENABLED => $fail2BanEnabled]
        );
        $this->view->submitMode = null;
    }

    /**
     * Saves the Fail2Ban rules.
     *
     * This action is responsible for handling the form submission and saving the Fail2Ban rules to the database.
     *
     * @return void
     */
    public function saveAction(): void
    {
        if (!$this->request->isPost()) {
            return;
        }
        $data = $this->request->getPost();
        $record = Fail2BanRules::findFirst();

        // Find the existing Fail2Ban rules record or create a new one
        if ($record === null) {
            $record = new Fail2BanRules();
        }
        $this->db->begin();

        // Iterate over each property of the Fail2BanRules record
        foreach ($record as $key => $value) {
            switch ($key) {
                case "id":
                    break;
                default:
                    // Check if the key exists in the POST data
                    if (!array_key_exists($key, $data)) {
                        $record->$key = '';
                        continue 2; // Skip to the next iteration
                    }
                    // Assign the value from the POST data to the record's property
                    $record->$key = $data[$key];
            }
            // Save the record
            if ($record->save() === false) {
                $errors = $record->getMessages();
                $this->flash->warning(implode('<br>', $errors));
                $this->view->success = false;
                $this->db->rollback();

                return;
            }
        }

        // Set success flash message
        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = false;
        $this->db->commit();
    }

}