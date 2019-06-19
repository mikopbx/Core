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


namespace Models;

class BackupRules extends ModelsBase {

	/**
	 * @var integer
	 */
	public $id;

	/**
	 * Еслии 1 то правило активное и можно делать бекпы по расписанию
	 *
	 * @var integer
	 */
	public $enabled;

	/**
	 * Если 0 то ежедневно, иначе по номеру дня недели с 1 до 7
	 *
	 * @var integer
	 */
	public $every;

	/**
	 * Время создания бекапа
	 *
	 * @var string
	 */
	public $at_time;

	/**
	 * Количество хранимых версий
	 *
	 * @var integer
	 */
	public $keep_older_versions;

	/**
	 * Адрес ftp/sftp сервера для хранения бекапа
	 *
	 * @var string
	 */
	public $ftp_host;

	/**
	 * Порт ftp/sftp сервера 21 или 22
	 *
	 * @var integer
	 */
	public $ftp_port;

	/**
	 * Логин ftp/sftp
	 *
	 * @var string
	 */
	public $ftp_username;

	/**
	 * Пароль ftp/sftp
	 *
	 * @var string
	 */
	public $ftp_secret;

	/**
	 * Путь ftp/sftp
	 *
	 * @var string
	 */
	public $ftp_path;

	/**
	 * Если 1 то SFTP если 0 то FTP
	 *
	 * @var integer
	 */
	public $ftp_sftp_mode;

	/**
	 * JSON структура с информацией о том что надо сохранять
	 *
	 * @var string
	 */
	public $what_backup;

	public function getSource() {
		return 'm_BackupRules';
	}

	public function initialize() {
		parent::initialize();
	}
}