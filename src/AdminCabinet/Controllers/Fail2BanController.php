<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Common\Models\{Fail2BanRules, PbxSettings};

class Fail2BanController extends BaseController
{

    /**
     * Построение списка внутренних номеров и сотрудников
     */
    public function indexAction(): void
    {
        $rules = Fail2BanRules::findFirst();
        if ($rules === null) {
            $rules = new Fail2BanRules();
        }
        $fail2BanEnabled = PbxSettings::getValueByKey('PBXFail2BanEnabled');

        $this->view->form       = new Fail2BanEditForm(
            $rules,
            ['PBXFail2BanEnabled' => $fail2BanEnabled]
        );
        $this->view->submitMode = null;
    }

    /**
     * Сохранение настроек системы
     */
    public function saveAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }
        $data   = $this->request->getPost();
        $record = Fail2BanRules::findFirst();

        if ($record === null) {
            $record = new Fail2BanRules();
        }
        $this->db->begin();
        foreach ($record as $key => $value) {
            switch ($key) {
                case "id":
                    break;
                default:
                    if ( ! array_key_exists($key, $data)) {
                        $record->$key = '';
                        continue 2;
                    }
                    $record->$key = $data[$key];
            }
            if ($record->save() === false) {
                $errors = $record->getMessages();
                $this->flash->warning(implode('<br>', $errors));
                $this->view->success = false;
                $this->db->rollback();

                return;
            }
        }
        // $fail2BanEnabled = PbxSettings::findFirstByKey( 'PBXFail2BanEnabled' );
        // if ( ! $fail2BanEnabled ) {
        // 	$fail2BanEnabled      = new PbxSettings();
        // 	$fail2BanEnabled->key = 'PBXFail2BanEnabled';
        // }
        // $fail2BanEnabled->value = ( $data['PBXFail2BanEnabled'] == 'on' ) ? "1"
        // 	: "0";
        // if ( $fail2BanEnabled->save() === FALSE ) {
        // 	$errors = $fail2BanEnabled->getMessages();
        // 	$this->flash->warning( implode( '<br>', $errors ) );
        // 	$this->view->success = FALSE;
        // 	$this->db->rollback();
        //
        // 	return;
        // }

        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = false;
        $this->db->commit();
    }

}