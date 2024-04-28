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

use MikoPBX\AdminCabinet\Forms\ConferenceRoomEditForm;
use MikoPBX\Common\Models\{ConferenceRooms, Extensions};


class ConferenceRoomsController extends BaseController
{
    /**
     * Build the list of conference rooms.
     */
    public function indexAction(): void
    {
        $records             = ConferenceRooms::find();
        $this->view->records = $records;
    }

    /**
     * Edit conference room details.
     *
     * @param string|null $uniqid The unique identifier of the conference room.
     */
    public function modifyAction(string $uniqid = null): void
    {
        $record = ConferenceRooms::findFirstByUniqid($uniqid);
        if ($record === null) {
            // Create a new conference room if not found
            $record            = new ConferenceRooms();
            $record->uniqid    = ConferenceRooms::generateUniqueID(Extensions::TYPE_CONFERENCE.'-');
            $record->extension = Extensions::getNextFreeApplicationNumber();
        }
        $this->view->form      = new ConferenceRoomEditForm($record);
        $this->view->represent = $record->getRepresent();
        $this->view->extension = $record->extension;
    }

    /**
     * Save the conference room.
     */
    public function saveAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }
        $this->db->begin();
        $data = $this->request->getPost();
        $room = ConferenceRooms::findFirstByUniqid($data['uniqid']);
        if ($room === null) {
            // Create new conference room and extension if not found
            $room                         = new ConferenceRooms();
            $extension                    = new Extensions();
            $extension->type              = Extensions::TYPE_CONFERENCE;
            $extension->number            = $data["extension"];
            $extension->callerid          = $this->sanitizeCallerId($data["name"]);
            $extension->userid            = null;
            $extension->show_in_phonebook = 1;
            $extension->public_access     = 1;
        } else {
            $extension = $room->Extensions;
        }

        // Update extension parameters
        if ( ! $this->updateExtension($extension, $data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // Update conference room parameters
        if ( ! $this->updateConferenceRoom($room, $data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
        $this->db->commit();

        // If it was a new entity, reload the page with the new ID
        if (empty($data['id'])) {
            $this->view->reload = "conference-rooms/modify/{$data['uniqid']}";
        }
    }

    /**
     * Update extension parameters.
     *
     * @param \MikoPBX\Common\Models\Extensions $extension The extension entity.
     * @param array                             $data      The array of fields from the POST request.
     *
     * @return bool The update result.
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
     * Update conference room properties.
     *
     * @param \MikoPBX\Common\Models\ConferenceRooms $room The conference room entity.
     * @param array                                  $data The POST fields.
     *
     * @return bool The update result.
     */
    private function updateConferenceRoom(ConferenceRooms $room, array $data): bool
    {
        foreach ($room as $name => $value) {
            switch ($name) {
                case "extension":
                case "name":
                    $room->$name = $data[$name];
                    break;
                default:
                    if ( ! array_key_exists($name, $data)) {
                        continue 2;
                    }
                    $room->$name = $data[$name];
            }
        }
        if ($room->save() === false) {
            $errors = $room->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;
    }

}