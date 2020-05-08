<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\Workers;

use Exception;
use MikoPBX\Common\Models\BackupRules;
use MikoPBX\Core\Backup\Backup;
use MikoPBX\Core\System\{Storage, Util};

class WorkerBackup extends WorkerBase
{
    public function start($argv): void
    {
        if (count($argv) < 3) {
            exit;
        }

        $id      = trim($argv[1]);
        $command = trim($argv[2]);
        if (empty($id)) {
            exit;
        }

        if ('none' !== $id) {
            $b = new Backup($id);
            $b->createArhive();
        } elseif (count($argv) === 4) {
            $PID = Util::getPidOfProcess("{$argv[1]} {$argv[2]} {$argv[3]}", '' . getmypid() . ' ');
            if (empty($PID)) {
                // Другого процесса с аналогичными установками не запущено.
                /** @var \MikoPBX\Common\Models\BackupRules $res */
                $res = BackupRules::findFirst("id='{$argv[3]}'");
                if ($res && Util::isJson($res->what_backup)) {
                    $backup_dir   = '/storage/' . $res->ftp_host . '.' . $res->ftp_port;
                    $disk_mounted = Storage::isStorageDiskMounted("$backup_dir ");
                    if ( ! $disk_mounted) {
                        if ($res->ftp_sftp_mode === '1') {
                            $disk_mounted = Storage::mountSftpDisk(
                                $res->ftp_host,
                                $res->ftp_port,
                                $res->ftp_username,
                                $res->ftp_secret,
                                $res->ftp_path,
                                $backup_dir
                            );
                        } else {
                            $disk_mounted = Storage::mountFtp(
                                $res->ftp_host,
                                $res->ftp_port,
                                $res->ftp_username,
                                $res->ftp_secret,
                                $res->ftp_path,
                                $backup_dir
                            );
                        }
                    }
                    if ( ! $disk_mounted) {
                        Util::sysLogMsg('Backup', 'Failed to mount backup disk...');
                        exit;
                    }

                    // Удаляем старые резервные копии, если необходимо.
                    if ($res->keep_older_versions > 0) {
                        $out = [];
                        Util::mwExec("find {$backup_dir} -mindepth 1 -type d  | sort", $out);
                        if (count($out) >= $res->keep_older_versions) {
                            $count_dir = count($out) - $res->keep_older_versions;
                            for ($count_dir; $count_dir >= 0; $count_dir--) {
                                Util::mwExec("rm -rf {$out[$count_dir]}");
                            }
                        }
                    }

                    // Запускаем резервное копирование.
                    $id                = 'backup_' . time();
                    $options           = json_decode($res->what_backup, true);
                    $options['backup'] = $backup_dir;
                    if ($res->ftp_sftp_mode !== '1') {
                        $options['type'] = 'zip';
                    }
                    $b = new Backup($id, $options);
                    $b->createArhive();
                }
            }
        }
    }

}

// Start worker process
$workerClassname = WorkerBackup::class;
if (isset($argv) && count($argv) > 1) {
    cli_set_process_title($workerClassname);
    try {
        $worker = new $workerClassname();
        $worker->start($argv);
    } catch (Exception $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
    }
}


