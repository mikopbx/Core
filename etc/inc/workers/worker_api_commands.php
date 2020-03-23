<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace Workers;

use Backup;
use Config;
use Exception;
use Firewall;
use Nats\Connection;
use Notifications;
use p_IAX;
use p_OtherConfigs;
use p_SIP;
use PDOException;
use Storage;
use System;
use Util;
use Modules\PbxExtensionFailure;

require_once 'globals.php';
require_once 'Nats/autoloader.php';

class ApiCommands{
    private $g;
    /** @var \Nats\Message $message */
    private $message;

    private $need_restart;

    /**
     * ApiCommands constructor.
     * @param $g
     */
    function __construct(&$g){
        $this->g = $g;
        $this->need_restart = false;
        register_shutdown_function([$this, 'ShutdownHandler']);
    }

    /**
     * Обработка фатальных ошибок PHP.
     */
    public function ShutdownHandler(){
        if (@is_array($e = @error_get_last())) {
            $this->need_restart = true;
            $response = [
                'result' => 'FATAL_ERROR',
                'data'   => error_get_last()
            ];
            $this->message->reply( json_encode($response, JSON_PRETTY_PRINT) );
        }
        if(!$this->need_restart){
            return;
        }
    }

    public function check_need_restart($msg){
        if($this->need_restart){
             $command = "/usr/bin/php -f {$GLOBALS['_SERVER']['PHP_SELF']}";
             Util::mwexec_bg($command);
             exit(0);
        }
    }

    /**
     * @throws \Exception
     */
    public function start(){
        $this->check_connect_db();

        $client = new Connection();
        while (true) {
            if(! $client->isConnected() === true){
                $client->reconnect();
                $client->subscribe('pbx',                       [$this, 'pbx_cb']);
                $client->subscribe('sip',                       [$this, 'sip_cb']);
                $client->subscribe('iax',                       [$this, 'iax_cb']);
                $client->subscribe('system',                    [$this, 'system_cb']);
                $client->subscribe('backup',                    [$this, 'backup_cb']);
                $client->subscribe('storage',                   [$this, 'storage_cb']);
                $client->subscribe('modules',                   [$this, 'modules_cb']);
                $client->subscribe('ping_worker_api_commands',  [$this, 'ping_cb']);

                $client->setAfterPublishAction([$this, 'check_need_restart']);
            }
            $client->wait();
        }
    }

    private function check_connect_db(){
        try{
            $config = new Config();
            $config->get_general_settings('PBXVersion');
        }catch (PDOException $e){
            if( $e->errorInfo[1]==17 ){
                // Обновляем схему базы данных.
                init_db($this->g['m_di'], $this->g['phalcon_settings']);
                Util::sys_log_msg('worker_api_commands', 'Reinit DB.');
            }
        }
    }

    /**
     * Обработка пинга демона.
     * @param \Nats\Message $message
     */
    public function ping_cb($message) {
        $this->message = $message;
        $message->reply(json_encode($message.':pong'));
    }

    /**
     * Обработка команд SIP.
     * @param \Nats\Message $message
     */
    public function sip_cb($message){
        $this->check_connect_db();

        $this->message = $message;
        $request = json_decode($message->body,true);
        $action  = $request['action'];
        $data    = $request['data'];

        $result = array(
            'result'  => 'ERROR'
        );
        if('get_peers_statuses' === $action){
            $result = p_SIP::get_peers_statuses();
        }else if('get_sip_peer' === $action){
            $result = p_SIP::get_peer_status($data['peer']);
        }else if('get_registry' === $action){
            $result = p_SIP::get_registry();
        }else{
            $result['data'] = 'API action not found;';
        }
        $result['function'] = $action;
        $message->reply( json_encode($result, JSON_PRETTY_PRINT) );
    }

    /**
     * Обработка команду IAX.
     * @param \Nats\Message $message
     */
    public function iax_cb($message){
        $this->check_connect_db();

        $this->message = $message;
        $request = json_decode($message->body,true);
        $action  = $request['action'];
        // $data    = $request['data'];
        $result = array(
            'result'  => 'ERROR'
        );
        if('get_registry' === $action){
            $result = p_IAX::get_registry();
        }else{
            $result['data'] = 'API action not found;';
        }
        $result['function'] = $action;
        $message->reply( json_encode($result, JSON_PRETTY_PRINT) );
    }

    /**
     * Обработка системных команд.
     * @param \Nats\Message $message
     */
    public function system_cb($message){
        $this->check_connect_db();

        $this->message = $message;
        $request = json_decode($message->body,true);
        $action  = $request['action'];
        $data    = $request['data'];

        $result = array(
            'result'  => 'ERROR'
        );

        if('reboot' === $action){
            $result['result'] = 'Success';
            $message->reply( json_encode($result) );
            System::reboot_sync(false);
        }else if('merge_uploaded_file' === $action){
            $result = [
                'result' => 'Success'
            ];
            Util::mwexec_bg("php -f /etc/inc/workers/merge_uploded_file.php '{$data['settings_file']}'");
        } elseif ('restart_module_dependent_workers' === $action){
            $result['result'] = 'Success';
            $this->need_restart = true;
            Util::restart_module_dependent_workers();
        }else if('shutdown' === $action){
            $result['result'] = 'Success';
            $message->reply( json_encode($result) );
            System::shutdown();
        }else if('network_reload' === $action){
            $result = [
                'result' => 'Success',
                'data'   => 'method is deprecated '
            ];
        }else if('set_date' === $action){
            $result = System::set_date($data['date']);
        }else if('get_info' === $action){
            $result = System::get_info();
        }else if('send_mail' === $action){
            if(isset($data['email']) && isset($data['subject']) && isset($data['body']) ){
                if(isset($data['encode']) && $data['encode'] === 'base64'){
                    $data['subject'] = base64_decode($data['subject']);
                    $data['body']    = base64_decode($data['body']);
                }
                $result = Notifications::send_mail($data['email'], $data['subject'], $data['body']);
            }else{
                $result['message'] = 'Not all query parameters are populated.';
            }

        }else if('file_read_content' === $action){
            $result = Util::file_read_content($data['filename'], $data['needOriginal']);
        }else if('get_external_ip_info' === $action){
            $result = System::get_external_ip_info();
        }else if('reload_cron' === $action){
            $result = [
                'result' => 'Success',
                'data'   => 'method is deprecated '
            ];
        }else if('reload_ssh' === $action){
            $result = [
                'result' => 'Success',
                'data'   => 'method is deprecated '
            ];
        }else if('reload_msmtp' === $action){
            $notifications = new Notifications();
            $result = $notifications->configure();

            $OtherConfigs = new p_OtherConfigs($GLOBALS['g']);
            $OtherConfigs->voicemail_generate();
            Util::mwexec("asterisk -rx 'voicemail reload'");
        }else if('unban_ip' === $action){
            $result = Firewall::fail2ban_unban_all($data['ip']);
        }else if('get_ban_ip' === $action){
            $result['result'] = 'Success';
            $result['data']   = Firewall::get_ban_ip();
        }else if('update_custom_files' === $action){
            $result = [
                'result' => 'Success',
                'data'   => 'method is deprecated '
            ];
        }else if('reload_nats' === $action){
            $result = [
                'result' => 'Success',
                'data'   => 'method is deprecated '
            ];
        }else if('start_log' === $action){
            $result['result'] = 'Success';
            Util::start_log();
        }else if('stop_log' === $action){
            $result['result']   = 'Success';
            $result['filename'] = Util::stop_log();
        }else if('reload_nginx' === $action){
            $result = [
                'result' => 'Success',
                'data'   => 'method is deprecated '
            ];
        }else if('status_upgrade' === $action){
            $result = System::status_upgrade();
        }else if('upgrade_online' === $action){
            $result = System::upgrade_online($request['data']);
        }else if('upgrade' === $action){
            $result = System::upgrade_from_img();
        }else if('remove_audio_file' === $action){
            $result = Util::remove_audio_file($data['filename']);
        }else if('convert_audio_file' === $action){
            $result = Util::convert_audio_file($data['filename']);
        }else if('reload_firewall' === $action){
            $result = [
                'result' => 'Success',
                'data'   => 'method is deprecated '
            ];
        }else{
            $result['message'] = 'API action not found;';
        }

        $result['function'] = $action;
        $message->reply( json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) );

    }

    /**
     * Обработка команд управления PBX.
     * @param \Nats\Message $message
     */
    public function pbx_cb($message){
        $this->check_connect_db();

        $this->message = $message;
        $action = $message->body;
        $result = array(
            'result'  => 'ERROR'
        );

        if('reload_all_modules' === $action){
            $result = [
                'result' => 'Success',
                'data'   => 'method is deprecated '
            ];
        }else if('reload_dialplan' === $action){
            $result = [
                'result' => 'Success',
                'data'   => 'method is deprecated '
            ];
        }else if('reload_sip' === $action) {
            $result = [
                'result' => 'Success',
                'data'   => 'method is deprecated '
            ];
        }else if('reload_queues' === $action){
            $result = [
                'result' => 'Success',
                'data'   => 'method is deprecated '
            ];
        }else if('reload_features' === $action){
            $result = [
                'result' => 'Success',
                'data'   => 'method is deprecated '
            ];
        }else if('reload_manager' === $action){
            $result = [
                'result' => 'Success',
                'data'   => 'method is deprecated '
            ];
        }else if('reload_iax' === $action){
            $result = [
                'result' => 'Success',
                'data'   => 'method is deprecated '
            ];
        }else if('check_licence' === $action){
            $License = '\\Mikopbx\\License';
            $lic     = new $License();
            $result  = $lic->check_licence();
            $result['result'] = ($result['result'] != true)?'ERROR':'Success';
        }else{
            $result['message'] = 'API action not found;';
        }

        $result['function'] = $action;
        $message->reply( json_encode($result, JSON_PRETTY_PRINT) );
    }

    /**
     * Операции резервного копирования / восстановления системы.
     * @param Nats\Message $message
     */
    public function backup_cb($message) : void {
        clearstatcache();
        $this->check_connect_db();

        $this->message = $message;
        $request = json_decode($message->body,true);
        $action  = $request['action'];
        $data    = $request['data'];

        $result = [
            'result'  => 'ERROR'
        ];
        if('list' === $action){
            $result = Backup::list_backups();
        }else if('start_scheduled' === $action){
            $result = Backup::start_scheduled();
        }else if('start' === $action){
            $result = Backup::start($data);
        }else if('stop' === $action){
            $result = Backup::stop($data['id']);
        }else if('remove' === $action){
            $result = Backup::remove($data['id']);
        }else if('check_storage_ftp' === $action){
            $result = Backup::check_storage_ftp($data['id']);
        }else if('upload' === $action){
            $result = Backup::unpack_uploded_img_conf($data);
        }else if('convert_config' === $action){
            $result = System::convert_config($data['config_file']);
        }else if('get_estimated_size' === $action){
            $result = [
                'result' => 'Success',
                'data' => Backup::get_estimated_size()
            ];
        }else if('status_upload' === $action){
            if(isset($data['backup_id'])){
                $backup_dir   = Backup::get_backup_dir();
                $status_file = "{$backup_dir}/{$data['backup_id']}/upload_status";
            }else{
                $status_file = '';
            }

            $result = 'ERROR';
            if($status_file === ''){
                $status = 'ERROR_EMPTY_ID_BACKUP';
            }else if(file_exists($status_file)){
                $status = file_get_contents($status_file);
                $result = 'Success';
            }else{
                $status = 'ERROR_FILE_NOT_FOUND';
            }
            $result = [
                'result'        => $result,
                'status_upload' => $status
            ];
        }else if('merge_uploaded_file' === $action){
            $result = [
                'result' => 'Success'
            ];
            Util::mwexec_bg("php -f /etc/inc/workers/merge_uploded_file.php '{$data['settings_file']}'");
        }else if('recover' === $action){
            $options = $data['options'] ?? null;
            $result = Backup::start_recover($data['id'], $options);
        }

        $result['function'] = $action;
        $message->reply( json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) );
    }

    /**
     * Обработка команд управления модулями.
     * @param \Nats\Message $message
     * @return array
     */
    public function modules_cb($message) :array {
        clearstatcache();
        $this->check_connect_db();

        if( ! Storage::is_storage_disk_mounted() ){
            return ['result' => 'ERROR', 'message' => 'Storage is not mounted.'];
        }

        $this->message = $message;
        $request = json_decode($message->body,true);

        $action  = $request['action'];
        $module  = $request['module'];

        $result = [
            'result' => 'ERROR',
            'data'   =>  null
        ];

        // Предварительные действия по распаковке модуля.
        if('upload' === $action){
            $result['function'] = $action;
            $result['result']   = 'Success';
            $message->reply( json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) );

            $result = System::module_start_download($module, $request['data']['url'], $request['data']['md5']);
            return $result;
        }elseif('status' === $action){
            $result = System::module_download_status($module);
            $result['function'] = $action;
            $result['result']   = 'Success';
            $message->reply( json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) );
            return $result;
        }

        $path_class = $this->get_module_class($module, $action);
        if(FALSE === $path_class){
            $result['data'][]    = "Class '$module' does not exist...";
            $result['data'][]    = "Class '$path_class' does not exist...";
            $result['function'] = $action;
            $message->reply( json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) );
            return $result;
        }

        try{
            if('check' === $action){
                /** @var \ConfigClass $c */
                $c = new $path_class($this->g, true);
                $response = $c->test();
                if($response['result'] === true) {
                    $result['result'] = 'Success';
                }
                $result['data'] = $response;
            }elseif('reload' === $action){
                /** @var \ConfigClass $cl */
                $cl = new $path_class($this->g);
                $cl->reload_services();
                $cl->on_after_pbx_started();
                $result['result'] = 'Success';
            }elseif('custom_action' === $action){
                /** @var \ConfigClass $cl */
                $cl = new $path_class($this->g);
                $response = $cl->custom_action($request['data']);
                $result = $response;
            } elseif ('uninstall' === $action){
				if(class_exists($path_class) && method_exists($path_class, 'uninstallModule')){
					$setup      = new $path_class($module);
				} else {
					// Заглушка которая позволяет удалить модуль из базы данных, которого нет на диске
					$path_class = PbxExtensionFailure::class;
					$setup      = new $path_class($module);
				}
				$prams = json_decode($request['input'],TRUE);
				if (array_key_exists('keepSettings', $prams)){
					$keepSettings = $prams['keepSettings']==='true';
				} else {
					$keepSettings = false;
				}
                if($setup->uninstallModule($keepSettings)){
                    $result['result'] = 'Success';
                } else {
                    $result['result'] = 'Error';
                    $result['data']   = implode('<br>', $setup->getMessages());
                }

                $this->need_restart = true;
                Util::restart_module_dependent_workers();
            }else{
                $cl     = new $path_class($this->g);
                $result = @$cl->$action($request);
            }
        } catch (Exception $e){
			$errorLogger = $this->g['error_logger'];
			$errorLogger->captureException($e);
            $result['data'] = $e->getMessage();
        }

        $result['function'] = $action;
        $message->reply( json_encode($result, JSON_PRETTY_PRINT) );

        return $result;
    }

    /**
     * @param $module
     * @param $action
     * @return bool|string
     */
    private function get_module_class($module, $action){

        $class_name =  str_replace('Module', '', $module);
        $path_class = "\\Modules\\{$module}\\Lib\\{$class_name}";

        if( in_array($action, ['check', 'reload', 'custom_action']) ){
            if(!class_exists($path_class)){
                $path_class = false;
            }
		}elseif( $action === 'uninstall' ){ // Этот метод существует всегда
			$path_class = "\\Modules\\{$module}\\setup\\PbxExtensionSetup";
        }elseif( ! method_exists($path_class, $action) ){
            $path_class = "\\Modules\\{$module}\\setup\\PbxExtensionSetup";
            if(!class_exists("$path_class")){
                $path_class = false;
            }
        }
        return $path_class;
    }

    /**
     * Обработка команд управления дисками.
     * @param Nats\Message $message
     */
    public function storage_cb($message):void {
        $this->check_connect_db();

        $this->message = $message;
        $request = json_decode($message->body,true);
        $action  = $request['action'];
        $data    = $request['data'];

        $result = [
            'result' => 'ERROR',
            'data'   => null
        ];

        if('list' === $action){
            $st  = new Storage();
            $result['result']   = 'Success';
            $result['data']     = $st->get_all_hdd();
        }elseif ('mount' === $action){
            $res = Storage::mount_disk($data['dev'], $data['format'], $data['dir']);
            $result['result']   = ($res === true)?'Success':'ERROR';
        }elseif ('umount' === $action){
            $res = Storage::umount_disk($data['dir']);
            $result['result']   = ($res === true)?'Success':'ERROR';
        }elseif ('mkfs' === $action){
            $res = Storage::mkfs_disk($data['dev']);
            $result['result'] = ($res === true)?'Success':'ERROR';
            $result['data']   = 'inprogress';
        }elseif ('status_mkfs' === $action){
            $result['result'] = 'Success';
            $result['data']   = Storage::status_mkfs($data['dev']);
        }
        $result['function'] = $action;
        $message->reply( json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) );
    }

}

$argv[0]= 'worker_api_commands';
while (true) {
    try{
        $worker = new ApiCommands($g);
        $worker->start();
    }catch (Exception $e){
		$errorLogger = $g['error_logger'];
		$errorLogger->captureException($e);
        Util::sys_log_msg($argv[0], ''.$e->getMessage());
        sleep(1);
    }
}
