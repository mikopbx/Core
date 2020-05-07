<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */
namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\BackupAutomaticForm;
use MikoPBX\AdminCabinet\Forms\BackupCreateForm;
use MikoPBX\AdminCabinet\Forms\BackupRestoreForm;
use MikoPBX\Common\Models\BackupRules;


class BackupController extends BaseController
{

    private $whatBackupTpl;

    /**
     * Инициализация базового класса
     */
    public function initialize(): void
    {
        $this->whatBackupTpl = [
            'backup-config'      => '1',
            'backup-cdr'         => '1',
            'backup-records'     => '1',
            'backup-sound-files' => '1',
        ];
        parent::initialize();
    }

    /**
     * Список доступных для скачивания бекапов
     *
     */
    public function indexAction(): void
    {
        // Очистим кеш хранилища для получения актульной информации о свободном месте
        $this->session->remove('checkStorage');
    }

    /**
     * Форма мгновенного создания бекапа
     *
     */
    public function createAction(): void
    {
        $whatBackup             = $this->whatBackupTpl;
        $this->view->form       = new BackupCreateForm(null, $whatBackup);
        $this->view->whatBackup = $whatBackup;
        $this->view->submitMode = null;
    }

    /**
     * Форма восстановления из бекапа
     *
     */
    public function restoreAction(): void
    {
        $this->view->form       = new BackupRestoreForm();
        $this->view->submitMode = null;
    }

    /**
     * Форма настройки автоматического бекапа
     *
     */
    public function automaticAction(): void
    {
        $entity = BackupRules::findFirst();
        if ($entity === false) {
            $entity                      = new BackupRules();
            $entity->what_backup         = json_encode($this->whatBackupTpl);
            $entity->at_time             = '0:00';
            $entity->keep_older_versions = 3;
        }

        $weekDays = ['0' => $this->translation->_('bkp_EveryDay')];
        for ($i = '1'; $i <= 7; $i++) {
            $weekDays[$i] = $this->translation->_(date('D',
                strtotime("Sunday +{$i} days")));
        }
        $this->view->form = new BackupAutomaticForm($entity,
            ['week-days' => $weekDays]);
        $whatBackup       = json_decode($entity->what_backup, true);
        foreach ($this->whatBackupTpl as $key => $value) {
            if ( ! array_key_exists($key, $whatBackup)) {
                $whatBackup[$key] = $value;
            }
        }
        $this->view->formbackup = new BackupCreateForm(null, $whatBackup);
        $this->view->whatBackup = $whatBackup;
        $this->view->submitMode = null;
    }

    /**
     * Удаление файла бекпапа
     *
     */
    public function deleteAction(): void
    {

    }

    /**
     * Скачивание бекапа через браузер
     *
     */
    public function downloadAction(): void
    {

    }

    /**
     * Сохранение настроек автоматического резервного копирования
     *
     */
    public function saveAction(): void
    {
        if ( ! $this->request->isPost()) {
            $this->forward('backup/automatic');
        }

        $data = $this->request->getPost();
        $rule = BackupRules::findFirst();
        if ( ! $rule) {
            $rule = new BackupRules();
        }
        // Пройдемся по полям базы данных
        foreach ($rule as $name => $value) {
            switch ($name) {
                case 'id':
                case 'what_backup':
                    break;
                case 'enabled':
                case 'ftp_sftp_mode':
                    if (array_key_exists($name, $data)) {
                        $rule->$name = ($data[$name] === 'on') ? 1 : 0;
                    } else {
                        $rule->$name = 0;
                    }
                    break;
                default:
                    $rule->$name = $data[$name];
            }
        }
        // Пройдемся по чекбоксам того что нужно сохранять и сформируем JSON
        $what_backup = [];
        foreach ($data as $name => $value) {
            if (strpos($name, 'backup-') === 0) {
                $what_backup[$name] = ($data[$name] == 'on') ? '1' : '0';
            }
        }
        $rule->what_backup = json_encode($what_backup);
        if ( ! $rule->save()) {
            $errors = $rule->getMessages();
            $this->flash->error(implode('<br>', $errors));
        }
    }
}