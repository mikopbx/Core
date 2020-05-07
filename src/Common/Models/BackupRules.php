<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

//CREATE TABLE m_BackupRules (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     enabled  INTEGER,
//     every  INTEGER,
//     at_time    TEXT,
//     keep_older_versions INTEGER,
//     ftp_host  TEXT,
//     ftp_port  INTEGER,
//     ftp_username  TEXT,
//     ftp_secret  TEXT,
//     ftp_path  TEXT,
//     ftp_sftp_mode  INTEGER,
//     what_backup   TEXT
// );


namespace MikoPBX\Common\Models;

class BackupRules extends ModelsBase
{

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Еслии 1 то правило активное и можно делать бекпы по расписанию
     *
     * @Column(type="integer", nullable=true)
     */
    public $enabled;

    /**
     * Если 0 то ежедневно, иначе по номеру дня недели с 1 до 7
     *
     * @Column(type="integer", nullable=true)
     */
    public $every;

    /**
     * Время создания бекапа
     *
     * @Column(type="string", nullable=true)
     */
    public $at_time;

    /**
     * Количество хранимых версий
     *
     * @Column(type="integer", nullable=true)
     */
    public $keep_older_versions;

    /**
     * Адрес ftp/sftp сервера для хранения бекапа
     *
     * @Column(type="string", nullable=true)
     */
    public $ftp_host;

    /**
     * Порт ftp/sftp сервера 21 или 22
     *
     * @Column(type="integer", nullable=true)
     */
    public $ftp_port;

    /**
     * Логин ftp/sftp
     *
     * @Column(type="string", nullable=true)
     */
    public $ftp_username;

    /**
     * Пароль ftp/sftp
     *
     * @Column(type="string", nullable=true)
     */
    public $ftp_secret;

    /**
     * Путь ftp/sftp
     *
     * @Column(type="string", nullable=true)
     */
    public $ftp_path;

    /**
     * Если 1 то SFTP если 0 то FTP
     *
     * @Column(type="integer", nullable=true)
     */
    public $ftp_sftp_mode;

    /**
     * JSON структура с информацией о том что надо сохранять
     *
     * @Column(type="string", nullable=true)
     */
    public $what_backup;

    public function initialize(): void
    {
        $this->setSource('m_BackupRules');
        parent::initialize();
    }

}