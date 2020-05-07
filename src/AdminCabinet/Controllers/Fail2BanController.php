<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */
namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\Fail2BanEditForm;
use MikoPBX\Common\Models\{Fail2BanRules, PbxSettings};

class Fail2BanController extends BaseController
{

    /**
     * Построение списка внутренних номеров и сотрудников
     */
    public function indexAction()
    {
        $rules = Fail2BanRules::findFirst();
        if ($rules===null) {
            $rules = new Fail2BanRules();
        }
        $fail2BanEnabled = PbxSettings::getValueByKey('PBXFail2BanEnabled');

        $this->view->form       = new Fail2BanEditForm($rules,
            ['PBXFail2BanEnabled' => $fail2BanEnabled]);
        $this->view->submitMode = null;
    }

    /**
     * Сохранение настроек системы
     */
    public function saveAction()
    {
        if ( ! $this->request->isPost()) {
            return;
        }
        $data   = $this->request->getPost();
        $record = Fail2BanRules::findFirst();

        if ($record===null) {
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