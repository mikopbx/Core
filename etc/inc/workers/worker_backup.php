<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2019
 */

require_once 'globals.php';

if(count($argv)<3) {
    exit;
}

$id      = trim($argv[1]);
$command = trim($argv[2]);
if(empty($id)){
    exit;
}

if('none' !== $id ){
    $b = new Backup($id);
    $b->create_arhive();
}elseif(count($argv)===4){
    $PID = Util::get_pid_process("{$argv[1]} {$argv[2]} {$argv[3]}", ''.getmypid().' ');
    if(empty($PID)){
        // Другого процесса с аналогичными установками не запущено.
        /** @var Models\BackupRules $res */
        $res = Models\BackupRules::findFirst("id='{$argv[3]}'");
        if($res && Util::is_json($res->what_backup)){
            $backup_dir = '/storage/'.$res->ftp_host.'.'.$res->ftp_port;
            $disk_mounted = Storage::is_storage_disk_mounted("$backup_dir ");
            if(!$disk_mounted){
                if($res->ftp_sftp_mode === '1'){
                    $disk_mounted = Storage::mount_sftp_disk($res->ftp_host, $res->ftp_port, $res->ftp_username, $res->ftp_secret, $res->ftp_path, $backup_dir);
                }else{
                    $disk_mounted = Storage::mount_ftp($res->ftp_host, $res->ftp_port, $res->ftp_username, $res->ftp_secret, $res->ftp_path, $backup_dir);
                }
            }
            if(!$disk_mounted){
                Util::sys_log_msg('Backup', 'Failed to mount backup disk...');
                exit;
            }

            // Удаляем старые резервные копии, если необходимо.
            if($res->keep_older_versions > 0){
                $out = [];
                Util::mwexec("find {$backup_dir} -mindepth 1 -type d  | sort", $out);
                if(count($out)>=$res->keep_older_versions){
                    $count_dir = count($out) - $res->keep_older_versions;
                    for ($count_dir; $count_dir>=0; $count_dir--){
                        Util::mwexec("rm -rf {$out[$count_dir]}");
                    }
                }
            }

            // Запускаем резервное копирование.
            $id      = 'backup_'.time();
            $options = json_decode($res->what_backup, true);
            $options['backup'] = $backup_dir;
            if($res->ftp_sftp_mode !== '1') {
                $options['type'] = 'zip';
            }
            $b = new Backup($id, $options);
            $b->create_arhive();
        }
    }
}