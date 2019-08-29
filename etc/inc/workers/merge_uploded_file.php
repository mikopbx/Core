<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2019
 */

require_once 'Nats/autoloader.php';
require_once 'globals.php';

if(count($argv)<=1){
    // Не переданы аргументы.
    exit(2);
}
$settings_file  = trim($argv[1]);
if(!file_exists($settings_file)){
    // Не найлен файл с настройками.
    exit(3);
}
$file_data = json_decode(file_get_contents($settings_file), true);
if(!isset($file_data['action'])){
    // Не корректный формат файла с настройками.
    exit(4);
}

if('upload_backup' === $file_data['action']){
    $settings = $file_data['data'];
    $res_file = "{$settings['backupdir']}/{$settings['dir_name']}/resultfile.{$settings['extension']}";

    if(!file_exists($res_file) && file_exists($settings['temp_dir'])){
        Util::mergeFilesInDirectory($settings['temp_dir'], $settings['resumableFilename'], $settings['resumableTotalChunks'], $res_file);
    }
    $request = [
        'data'   => [
            'res_file'  => $res_file,
            'mnt_point' => $settings['mnt_point'],
            'backupdir' => $settings['backupdir'],
            'dir_name'  => $settings['dir_name'],
            'extension' => $settings['extension']
        ],
        'action' => 'upload' // Операция.
    ];

    try{
        $client = new Nats\Connection();
        $client->connect(10);
        $cb = function (Nats\Message $message) use ($settings){
            $result_data = json_decode($message->getBody(), true);
            if($result_data['result'] === 'Success'){
                $status = 'COMPLETE';
            }else{
                $status = 'ERROR';
            }
            file_put_contents("{$settings['backupdir']}/{$settings['dir_name']}/upload_status", $status);
        };
        $client->request('backup', json_encode($request), $cb);
    }catch (Exception $e){

    }
}elseif ($file_data['action'] === 'convert_config'){
    $settings = $file_data['data'];
    $res_file = "{$settings['backupdir']}/{$settings['dir_name']}/resultfile.{$settings['extension']}";

    if(!file_exists($res_file) && file_exists($settings['temp_dir'])){
        Util::mergeFilesInDirectory($settings['temp_dir'], $settings['resumableFilename'], $settings['resumableTotalChunks'], $res_file);
    }

    $res = file_exists($res_file);
    if ($res !== true) {
        file_put_contents("{$settings['backupdir']}/{$settings['dir_name']}/upload_status", 'ERROR');
        exit(1);
    }
    $request = array(
        'data'   => ['config_file' => $res_file],
        'action' => 'convert_config' // Операция.
    );
    try{
        $client = new Nats\Connection();
        $client->connect(10);
        $cb = function (Nats\Message $message) use ($settings){
            $status = 'COMPLETE';
            file_put_contents("{$settings['backupdir']}/{$settings['dir_name']}/upload_status", $status);
            exit(0);
        };
        $client->request('backup', json_encode($request), $cb);
    }catch (Exception $e){

    }
    file_put_contents("{$settings['backupdir']}/{$settings['dir_name']}/upload_status", 'ERROR');
}