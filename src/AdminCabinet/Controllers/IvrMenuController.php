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

use MikoPBX\AdminCabinet\Forms\IvrMenuEditForm;
use MikoPBX\Common\Models\{Extensions, IvrMenu, IvrMenuActions, SoundFiles};

class IvrMenuController extends BaseController
{


    /**
     * Builds the IVR menu representation.
     *
     * This method retrieves IVR menu actions and IVR menus from the database and constructs the representation
     * of the IVR menu, including its actions and related information.
     */
    public function indexAction(): void
    {
        $records = IvrMenuActions::find();
        $ivrMenuActions=[];
        foreach ($records as $record) {
            $ivrMenuActions[$record->ivr_menu_id][$record->id]=[
                'digits'=>$record->digits,
                'represent'=>$record->Extensions===null?'ERROR':$record->Extensions->getRepresent()
            ];
        }

        $records = IvrMenu::find();
        $ivrMenuList=[];

        // Retrieve IVR menus and build the representation
        foreach ($records as $record) {
            usort($ivrMenuActions[$record->uniqid], [__CLASS__, 'sortArrayByDigits']);
            $ivrMenuList[]=[
                'uniqid'=>$record->uniqid,
                'name'=>$record->name,
                'extension'=>$record->extension,
                'actions'=>$ivrMenuActions[$record->uniqid],
                'description'=>$record->description,
                'timeoutExtension'=>$record->TimeoutExtensions===null?'ERROR':$record->TimeoutExtensions->getRepresent()
            ];
        }
        $this->view->ivrmenu = $ivrMenuList;
    }

    /**
     * Modify IVR menu action.
     *
     * This method is responsible for modifying an IVR menu action. It retrieves the IVR menu and related data
     * from the database, including IVR menu actions, sound files, and extensions. It constructs the form for
     * modifying the IVR menu and populates it with the retrieved data. It assigns the form, IVR menu actions,
     * representation, and extension to the view for rendering.
     *
     * @param string $ivrmenuid - The ID of the IVR menu to modify.
     */
    public function modifyAction(string $ivrmenuid = ''): void
    {
        // Retrieve the IVR menu by ID
        $ivrmenu                = IvrMenu::findFirstByUniqid($ivrmenuid);
        $ivrActionsList         = [];
        $soundfilesList         = [];
        $extensionList          = [];
        $soundfilesList[""]     = $this->translation->_("sf_SelectAudioFile");
        $extensionList[""]      = $this->translation->_("ex_SelectNumber");
        $extensionListForFilter = [];
        if ($ivrmenu === null) {
            // Create a new IVR menu if not found
            $ivrmenu                   = new IvrMenu();
            $ivrmenu->uniqid           = strtoupper('IVR-' . md5($ivrmenu->id . time()));
            $ivrmenu->number_of_repeat = 3;
            $ivrmenu->extension
                                       = Extensions::getNextFreeApplicationNumber();
            $ivrmenu->timeout          = 7;
        } else {
            $extensionListForFilter[] = $ivrmenu->timeout_extension;

            // Retrieve IVR menu actions related to the IVR menu
            $parameters = [
                'conditions' => 'ivr_menu_id=:menu:',
                'bind'       => [
                    'menu' => $ivrmenu->uniqid,
                ],
            ];
            $actions    = IvrMenuActions::find($parameters);
            foreach ($actions as $action) {
                $represent = $action->Extensions===null?"ERROR":$action->Extensions->getRepresent();
                // Build IVR menu actions array
                $ivrActionsList[]         = [
                    'id'                 => $action->id,
                    'extension'          => $action->extension,
                    'extensionRepresent' => str_replace(
                        '"',
                        '\\"',
                        $represent
                    ),
                    'digits'             => $action->digits,
                ];
                $extensionListForFilter[] = $action->extension;
            }
        }
        usort($ivrActionsList, [__CLASS__, 'sortArrayByDigits']);

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

        // Retrieve custom sound files for IVR
        $soundFiles = SoundFiles::find('category="custom"');
        foreach ($soundFiles as $soundFile) {
            $soundfilesList[$soundFile->id] = $soundFile->getRepresent();
        }

        // Construct the form for modifying the IVR menu
        $form                   = new IvrMenuEditForm(
            $ivrmenu, [
            'extensions' => $extensionList,
            'soundfiles' => $soundfilesList,
        ]
        );

        // Assign data to the view for rendering
        $this->view->form       = $form;
        $this->view->ivractions = $ivrActionsList;
        $this->view->represent  = $ivrmenu->getRepresent();
        $this->view->extension  = $ivrmenu->extension;

    }

    /**
     * Sorts array by digits field
     *
     * @param $a
     * @param $b
     *
     * @return int|null
     */
    public function sortArrayByDigits($a, $b): ?int
    {
        $a = (int)$a['digits'];
        $b = (int)$b['digits'];
        if ($a === $b) {
            return 0;
        } else {
            return ($a < $b) ? -1 : 1;
        }
    }

    /**
     * Saves the IVR menu
     */
    public function saveAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }

        $this->db->begin();

        $data          = $this->request->getPost();
        $ivrMenuRecord = IvrMenu::findFirstByUniqid($data['uniqid']);
        if ($ivrMenuRecord === null) {
            $ivrMenuRecord = new IvrMenu();
            $extension                    = new Extensions();
            $extension->type              = Extensions::TYPE_IVR_MENU;
            $extension->number            = $data["extension"];
            $extension->callerid          = $this->sanitizeCallerId($data["name"]);
            $extension->userid            = null;
            $extension->show_in_phonebook = 1;
            $extension->public_access     = 1;
        } else {
            $extension = $ivrMenuRecord->Extensions;
        }

        // Update IVR menu parameters
        if ( ! $this->updateExtension($extension, $data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // Update IVR menu actions
        if ( ! $this->updateIVRMenu($ivrMenuRecord, $data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // Update IVR menu actions
        if ( ! $this->updateIVRMenuActions($data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        $this->view->success = true;
        $this->db->commit();

        // If it was the creation of a new IVR menu, reload the page with the specified ID
        if (empty($data['id'])) {
            $this->view->reload = "ivr-menu/modify/{$data['uniqid']}";
        }
    }

    /**
     * Update parameters of an internal extension.
     *
     * @param \MikoPBX\Common\Models\Extensions $extension The extension object to update.
     * @param array                             $data      An array of fields from the POST request.
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
     * Update parameters of an IVR menu.
     *
     * @param \MikoPBX\Common\Models\IvrMenu $ivrMenu The IVR menu object to update.
     * @param array                          $data    An array of fields from the POST request.
     *
     * @return bool The update result.
     */
    private function updateIVRMenu(IvrMenu $ivrMenu, array $data): bool
    {
        // Заполним параметры записи Ivr Menu
        foreach ($ivrMenu as $name => $value) {
            switch ($name) {
                case "extension":
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
     * Update parameters of IVR menu actions.
     *
     * @param array $data An array of fields from the POST request.
     *
     * @return bool The update result.
     */
    private function updateIVRMenuActions(array $data): bool
    {
        $existDigits = [];

        // Update or create IVRMenuActions
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
            if ($newRule === null) {
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

        // Delete unnecessary IVRMenuActions
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

}