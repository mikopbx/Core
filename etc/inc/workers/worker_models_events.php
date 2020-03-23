<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

require_once 'globals.php';
ini_set('error_reporting', E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

class worker_models_events {
    private $last_change;
    private $modified_tables;
    private $pbx;
    private $timeout = 3;
    private $arrObject;

    private const R_MANAGERS = 'reload_manager';
    private const R_QUEUES   = 'reload_queues';
    private const R_DIALPLAN = 'reload_dialplan';
    private const R_CUSTOM_F = 'update_custom_files';
    private const R_FIREWALL = 'reload_firewall';
    private const R_NETWORK  = 'network_reload';
    private const R_IAX      = 'reload_iax';
    private const R_SIP      = 'reload_sip';
    private const R_FEATURES = 'reload_features';
    private const R_CRON     = 'reload_cron';
    private const R_NGINX    = 'reload_nginx';
    private const R_SSH      = 'reload_ssh';
    private const R_LICENSE  = 'reload_license';
    private const R_NATS     = 'reload_nats';

    private $PRIORITY_R;

    public function __construct(){
        $this->arrObject = PBX::init_modules($GLOBALS['g']);

        $this->PRIORITY_R = [
            self::R_NETWORK,
            self::R_FIREWALL,
            self::R_SSH,
            self::R_LICENSE,
            self::R_NATS,
            self::R_NGINX,
            self::R_CRON,
            self::R_FEATURES,
            self::R_SIP,
            self::R_IAX,
            self::R_DIALPLAN,
            self::R_QUEUES,
            self::R_MANAGERS,
            self::R_CUSTOM_F,
        ];

        $client = new BeanstalkClient('models_events', $this->timeout);
        $this->modified_tables = [];
        $this->pbx = new Models\PbxSettings();

        $client->subscribe('models_events', [$this, 'models_events']);
        $client->setTimeoutHendler([$this, 'TimeoutHendler']);
        $client->wait();

    }

    public function reload_nats():array{
        $system = new System();
        return $system->gnats_start();
    }

    /**
     * @return array
     */
    public function reload_dialplan():array {
        $pbx = new PBX();
        return $pbx->dialplan_reload();
    }

    public function reload_manager():array {
        return PBX::manager_reload();
    }

    public function reload_queues():array {
        return p_Queue::queue_reload();
    }

    public function update_custom_files():array {
        return System::update_custom_files();
    }

    public function reload_firewall():array {
        return Firewall::reload_firewall();
    }

    public function network_reload():array {
        System::network_reload();
        return ['result'  => 'Success'];
    }

    public function reload_iax():array {
        return p_IAX::iax_reload();

    }

    public function reload_sip():array {
        return p_SIP::sip_reload();
    }

    public function reload_features():array {
        return PBX::features_reload();
    }

    public function reload_cron():array {
        return System::invoke_actions(['cron' => 0]);
    }

    public function reload_nginx():array {
        $sys = new System();
        $sys->nginx_start();
        return ['result'  => 'Success'];
    }

    public function reload_ssh():array {
        $system = new System();
        return $system->sshd_configure();
    }


    /**
     * @param BeanstalkClient $message
     */
    public function models_events($message){

        $q = $message->getBody();
        $message->reply(true);
        $this->fill_modified_tables($q);
        $this->start_reload();

        foreach ($this->arrObject as $appClass) {
            $appClass->models_event_change_data($q);
        }
    }

    private function start_reload():array {
        if(count($this->modified_tables)===0){
            return [];
        }
        $delta = time() - $this->last_change;
        if( $delta < $this->timeout){
            return [];
        }

        $results = [];
        foreach ($this->PRIORITY_R as $method_name){
            $action = $this->modified_tables[$method_name]??NULL;
            if($action === NULL){
                continue;
            }
            if( method_exists($this, $method_name) ){
                $results[$method_name] = $this->$method_name();
            }
        }

        foreach ($this->arrObject as $appClass) {
            $appClass->models_event_need_reload($this->modified_tables);
        }
        $this->modified_tables = [];

        return $results;
    }

    private function fill_modified_tables($data){
        $count_changes = count($this->modified_tables);

        $called_class    = $data['model']??'';
        switch ($called_class) {
            case 'Models'.'\AsteriskManagerUsers':
                $this->modified_tables[self::R_MANAGERS] = true;
                break;
            case 'Models\CallQueueMembers':
                $this->modified_tables[self::R_QUEUES] = true;
                break;
            case 'Models\CallQueues':
                $this->modified_tables[self::R_QUEUES]    = true;
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case 'Models\ConferenceRooms':
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case 'Models\CustomFiles':
                $this->modified_tables[self::R_CUSTOM_F] = true;
                break;
            case 'Models\DialplanApplications':
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case 'Models\ExtensionForwardingRights':
                $this->modified_tables[self::R_SIP]      = true;
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case 'Models\Extensions':
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case 'Models\ExternalPhones':
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case 'Models\Fail2BanRules':
                $this->modified_tables[self::R_FIREWALL] = true;
                break;
            case 'Models\FirewallRules':
                $this->modified_tables[self::R_FIREWALL] = true;
                break;
            case 'Models\Iax':
                $this->modified_tables[self::R_IAX]      = true;
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case 'Models\IaxCodecs':
                $this->modified_tables[self::R_IAX] = true;
                break;
            case 'Models\IncomingRoutingTable':
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case 'Models\IvrMenu':
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case 'Models\IvrMenuActions':
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case 'Models\LanInterfaces':
                $this->modified_tables[self::R_NETWORK] = true;
                $this->modified_tables[self::R_IAX]     = true;
                $this->modified_tables[self::R_SIP]     = true;
                break;
            case 'Models\NetworkFilters':
                $this->modified_tables[self::R_FIREWALL] = true;
                $this->modified_tables[self::R_SIP]      = true;
                $this->modified_tables[self::R_MANAGERS] = true;
                break;
            case 'Models\OutgoingRoutingTable':
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case 'Models\OutWorkTimes':
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case 'Models\PbxSettings':
                $this->pbx->key = $data['recordId']??'';
                if ($this->pbx->itHasFeaturesSettingsChanges()) {
                    $this->modified_tables[self::R_FEATURES] = true;
                }
                if ($this->pbx->itHasAMIParametersChanges()) {
                    $this->modified_tables[self::R_MANAGERS] = true;
                }
                if ($this->pbx->itHasIaxParametersChanges()) {
                    $this->modified_tables[self::R_IAX] = true;
                }
                if ($this->pbx->itHasSipParametersChanges()) {
                    $this->modified_tables[self::R_SIP] = true;
                }
                if ($this->pbx->itHasSSHParametersChanges()) {
                    $this->modified_tables[self::R_SSH] = true;
                }
                if ($this->pbx->itHasFirewallParametersChanges()) {
                    $this->modified_tables[self::R_FIREWALL] = true;
                }
                if ($this->pbx->itHasWebParametersChanges()) {
                    $this->modified_tables[self::R_NGINX] = true;
                }
                if ($this->pbx->itHasCronParametersChanges()) {
                    $this->modified_tables[self::R_CRON] = true;
                }
                if ($this->pbx->itHasDialplanParametersChanges()) {
                    $this->modified_tables[self::R_DIALPLAN] = true;
                }
                if('PBXInternalExtensionLength' === $this->pbx->key){
                    $this->modified_tables[self::R_DIALPLAN] = true;
                    $this->modified_tables[self::R_SIP] = true;
                }
                if('PBXLicense' === $this->pbx->key){
                    $this->modified_tables[self::R_LICENSE] = true;
                    $this->modified_tables[self::R_NATS] = true;
                }
                break;
            case 'Models\Sip':
                $this->modified_tables[self::R_SIP]      = true;
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case 'Models\SipCodecs':
                $this->modified_tables[self::R_SIP] = true;
                break;
            case 'Models\SoundFiles':
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case 'Models\BackupRules':
                $this->modified_tables[self::R_CRON] = true;
                break;
            case 'Models\PbxExtensionModules':
                $this->modified_tables[self::R_CRON] = true;
                break;
            default:
        }

        if($count_changes === 0 && count($this->modified_tables)>0){
            // Начинаем отсчет времени при получении первой задачи.
            $this->last_change = time();
        }
    }

    function TimeoutHendler(){
        // Обязательная обработка.
        $this->last_change = time() - $this->timeout;
        $this->start_reload();
    }

}

$worker_proc_name = 'worker_models_events';
/**
 * Основной цикл демона.
 */
while (true) {
    cli_set_process_title($worker_proc_name);
    try{
        $me = new worker_models_events();
    }catch (Exception $e){
        $errorLogger = $g['error_logger'];
        $errorLogger->captureException($e);
        sleep(1);
    }
}
