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

use MikoPBX\AdminCabinet\Forms\ExtensionEditForm;
use MikoPBX\Common\Models\{
    Extensions,
    Sip,
    Users
};

use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;
use function MikoPBX\Common\Config\appPath;

class ExtensionsController extends BaseController
{

    /**
     * Build the list of internal numbers and employees.
     */
    public function indexAction(): void
    {
        $extensionTable = []; // Initialize an empty array to store extension data

        $parameters = [
            'models' => [
                'Extensions' => Extensions::class,
            ],
            'conditions' => 'Extensions.is_general_user_number = "1"',
            'columns' => [
                'id' => 'Extensions.id',
                'username' => 'Users.username',
                'number' => 'Extensions.number',
                'userid' => 'Extensions.userid',
                'disabled' => 'Sip.disabled',
                'secret' => 'Sip.secret',
                'email' => 'Users.email',
                'type' => 'Extensions.type',
                'avatar' => 'Users.avatar',

            ],
            'order' => 'number',
            'joins' => [
                'Sip' => [
                    0 => Sip::class,
                    1 => 'Sip.extension=Extensions.number',
                    2 => 'Sip',
                    3 => 'LEFT',
                ],
                'Users' => [
                    0 => Users::class,
                    1 => 'Users.id = Extensions.userid',
                    2 => 'Users',
                    3 => 'INNER',
                ],
            ],
        ];
        $query = $this->di->get('modelsManager')->createBuilder($parameters)->getQuery();
        $extensions = $query->execute(); // Execute the query and retrieve the extensions data

        foreach ($extensions as $extension) {
            switch ($extension->type) {
                case Extensions::TYPE_SIP:
                    // Process SIP extensions
                    $extensionTable[$extension->userid]['userid'] = $extension->userid;
                    $extensionTable[$extension->userid]['number'] = $extension->number;
                    $extensionTable[$extension->userid]['status'] = ($extension->disabled === '1') ? 'disabled' : '';
                    $extensionTable[$extension->userid]['id'] = $extension->id;
                    $extensionTable[$extension->userid]['username'] = $extension->username;
                    $extensionTable[$extension->userid]['email'] = $extension->email;
                    $extensionTable[$extension->userid]['secret'] = $extension->secret;

                    if (!array_key_exists('mobile', $extensionTable[$extension->userid])) {
                        $extensionTable[$extension->userid]['mobile'] = '';
                    }
                    if ($extension->avatar) {
                        $filename = md5($extension->avatar);
                        $imgCacheDir = appPath('sites/admin-cabinet/assets/img/cache');
                        $imgFile = "{$imgCacheDir}/$filename.jpg";
                        if (!file_exists($imgFile)) {
                            $this->base64ToJpegFile($extension->avatar, $imgFile);
                        }

                        $extensionTable[$extension->userid]['avatar'] = "{$this->url->get()}assets/img/cache/{$filename}.jpg";
                    } else {
                        $extensionTable[$extension->userid]['avatar'] = "{$this->url->get()}assets/img/unknownPerson.jpg";
                    }

                    break;
                case Extensions::TYPE_EXTERNAL:
                    // Process external extensions
                    $extensionTable[$extension->userid]['mobile'] = $extension->number;
                    break;
                default:
                    // Handle other extension types
            }
        }
        $this->view->extensions = $extensionTable; // Pass the extension data to the view
    }

    /**
     * Modify extension settings.
     *
     * @param string $id The ID of the extension being modified.
     *
     * @return void
     */
    public function modifyAction(string $id = ''): void
    {
        $restAnswer = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
            '/pbxcore/api/extensions/getRecord',
            PBXCoreRESTClientProvider::HTTP_METHOD_GET,
            ['id' => $id]
        ]);
        if ($restAnswer->success) {
            $getRecordStructure = (object)$restAnswer->data;
        } else {
            $this->flash->error(implode (', ', $restAnswer->messages));
            $this->dispatcher->forward([
                'controller' => 'extensions',
                'action' => 'index'
            ]);
            return;
        }

        // Create the form for editing the extension
        $form = new ExtensionEditForm($getRecordStructure);

        // Pass the form and extension details to the view
        $this->view->form = $form;
        $extension = Extensions::findFirstById($getRecordStructure->id)?? new Extensions();
        $this->view->represent = $extension->getRepresent();
        $this->view->avatar = $getRecordStructure->user_avatar;
    }

}