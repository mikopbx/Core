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

use MikoPBX\AdminCabinet\Forms\DialplanApplicationEditForm;
use MikoPBX\Common\Models\{DialplanApplications, Extensions};


class DialplanApplicationsController extends BaseController
{

    /**
     * Builds list of dialplan applications
     */
    public function indexAction(): void
    {
        $apps = DialplanApplications::find();

        $this->view->apps = $apps;
    }

    /**
     * Creates DialplanApplications modify form
     *
     * @param string $uniqid Dialplan Application record ID
     */
    public function modifyAction(string $uniqid = ''): void
    {
        $app = DialplanApplications::findFirstByUniqid($uniqid);
        if ($app === null) {
            $app            = new DialplanApplications();
            $app->uniqid    = DialplanApplications::generateUniqueID('DIALPLAN-APP-');
            $app->type      = 'php';
            $app->extension = Extensions::getNextFreeApplicationNumber();
        }

        $form                         = new DialplanApplicationEditForm($app);
        $this->view->form             = $form;
        $this->view->represent        = $app->getRepresent();
        $this->view->extension        = $app->extension;
    }


    /**
     * Saves Dialplan Application record settings
     */
    public function saveAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }

        $this->db->begin();

        $data      = $this->request->getPost();
        $appRecord = DialplanApplications::findFirstByUniqid($data['uniqid']);
        if ($appRecord === null) {
            $appRecord = new DialplanApplications();

            $extension                    = new Extensions();
            $extension->type              = Extensions::TYPE_DIALPLAN_APPLICATION;
            $extension->number            = $data['extension'];
            $extension->callerid          = $this->sanitizeCallerId($data['name']);
            $extension->userid            = null;
            $extension->show_in_phonebook = '1';
            $extension->public_access     = '0';
        } else {
            $extension = $appRecord->Extensions;
        }

        // Заполним параметры внутреннего номера
        if ( ! $this->updateExtension($extension, $data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // Заполним параметры пользователя
        if ( ! $this->updateDialplanApplication($appRecord, $data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
        $this->db->commit();

        // Если это было создание карточки то надо перегрузить страницу с указанием ID
        if (empty($data['id'])) {
            $this->view->reload = "dialplan-applications/modify/{$data['uniqid']}";
        }
    }

    /**
     * Updates Extensions by POST data
     *
     * @param \MikoPBX\Common\Models\Extensions $extension
     * @param array                             $data POST data
     *
     * @return bool update result
     */
    private function updateExtension(Extensions $extension, array $data): bool
    {
        $extension->number   = $data['extension'];
        $extension->callerid = $this->sanitizeCallerId($data['name']);
        $extension->show_in_phonebook = '1';
        if ($extension->save() === false) {
            $errors = $extension->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;
    }

    /**
     * Updates DialplanApplication by POST data
     *
     * @param \MikoPBX\Common\Models\DialplanApplications $application
     * @param array                                       $data POST data
     *
     * @return bool update result
     */
    private function updateDialplanApplication(DialplanApplications $application, array $data): bool
    {
        // Заполним параметры записи
        foreach ($application as $name => $value) {
            switch ($name) {
                case 'extension':
                case 'name':
                    $application->$name = $data[$name];
                    break;
                case 'applicationlogic':
                    $application->setApplicationlogic($data[$name]);
                    break;
                default:
                    if (array_key_exists($name, $data)) {
                        $application->$name = $data[$name];
                    }
            }
        }

        if ($application->save() === false) {
            $errors = $application->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;
    }

}