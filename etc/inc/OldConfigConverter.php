<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2018
 */

/**
$cntr = new OldConfigConverter('/root/config.xml');
$cntr->parse();
$cntr->make_config();
 */

require_once 'simple_html_dom.php';
class OldConfigConverter{
    private $res_html;
    private $data;
    private $tmp_data;

    /**
     * OldConfigConverter constructor.
     * @param $filename
     */
    function __construct($filename) {
        $text_xml       = file_get_contents($filename);
        $this->res_html = str_get_html( $text_xml );
        $this->data = [
            'm_Users'           => [],
            'm_Sip'             => [],
            'm_Extensions'      => [],
            'm_ExternalPhones'  => [],
            'm_ExtensionForwardingRights'  => [],
            'extensions'        => [],
            'providers_sip'     => [],
            'providers_iax'     => [],
            'asterisk-managers' => [],
            'net_filters'       => [],
            'smart_ivr'         => [],
            'saas_key'          => '',
            'call-queues'       => [],
            'ivr-menu'          => [],
        ];
        $this->tmp_data = [];
    }

    /**
     * Старт конвертации конфигурации.
     * @return array
     */
    public function parse(){
        $this->parse_sip_phones();
        $this->parse_external_phone();
        $this->parse_manager();
        $this->parse_sip_providers();
        $this->parse_iax_providers();
        $this->parse_smart_ivr();
        $this->parse_saas_key();
        $this->parse_callflow();
        return $this->data;
    }

    /**
     * Инициализация данных текущего узла.
     */
    private function init_data($children){
        $this->tmp_data = [];
        foreach ($children as $child){
            if(count($child->nodes)>0){
                if('read-permission' == $child->tag){
                    $this->tmp_data[$child->tag][] = $child->nodes[0]->__toString();
                }elseif('write-permission' == $child->tag){
                    $this->tmp_data[$child->tag][] = $child->nodes[0]->__toString();
                }else{
                    $this->tmp_data[$child->tag] = $child->nodes[0]->__toString();
                }
            }
        }
    }

    /**
     * Получить значение свойства узла.
     * @param $name
     * @return mixed|null
     */
    private function get($name){
        return isset($this->tmp_data[$name])?$this->tmp_data[$name]:null;
    }

    /**
     * Конвертация настроек sip.conf (пользовательские учетки).
     */
    private function parse_sip_phones(){
        foreach($this->res_html->find('sip phone') as $e) {
            $this->init_data($e->children);
            if($this->get('uniqid') == null){
                continue;
            }

            $this->data['m_ExtensionForwardingRights'][] = [
                'extension'                  => $this->get('extension'),
                'ringlength'                 => $this->get('ringlength'),
                'forwarding'                 => null,
                'forwardingonbusy'           => null,
                'forwardingonunavailable'    => null,
                'id_forwarding'              => $this->get('forwarding_external'),
                'id_forwardingonbusy'        => $this->get('forwarding_on_busy_external'),
                'id_forwardingonunavailable' => $this->get('forwarding_on_unavailable_external'),
            ];

            $this->data['m_Users'][] = [
                'id'        => $this->get('extension'),
                'email'     => $this->get('emailcallrecordaddress'),
                'username'  => $this->get('callerid'),
                'role'      => 'user',
                'language'  => $this->get('language'),
            ];
            $this->data['m_Sip'][] = [
                'disabled'      => false,
                'extension'     => $this->get('extension'),
                'type'          => 'peer',
                'host'          => null,
                'port'          => null,
                'username'      => null,
                'secret'        => $this->get('secret'),
                'defaultuser'   => null,
                'fromuser'      => null,
                'fromdomain'    => null,
                'uniqid'        => $this->get('uniqid'),
                'nat'           => 'force_rport,comedia',
                'dtmfmode'      => $this->get('dtmfmode'),

            ];
            $this->data['m_Extensions'][] = [
                'number'     => $this->get('extension'),
                'type'       => 'SIP',
                'callerid'   => $this->get('callerid'),
                'userid'     => $this->get('extension'),
                'is_general_user_number'     => 1,
            ];

            $rules = 'rule_SIP,local_network';
            $networkfilter = $this->add_net_filter($this->get('permitip'), $this->get('permitnetmask'), $rules);

            $secret = substr($this->get('secret'),0, stripos($this->get('secret'), '</secret>'));
            $secret = (trim($secret) == '')?$this->get('secret'):$secret;

            if($this->get('language') != 'ru-ru' && $this->get('language') != 'en-en') {
                $language = 'ru-ru';
            }else{
                $language = $this->get('language');
            }
            $exten_db = Models\Extensions::findFirst("number='{$this->get('extension')}'");
            $id      = ($exten_db == null)?null:$exten_db->id;
            $user_id = ($exten_db == null)?null:$exten_db->userid;

            $this->data['extensions'][$this->get('extension')] = [
                'id'                => $id,
                'user_id'           => $user_id,
                'fwd_ringlength'    => $this->get('ringlength'),
                'user_username'     => $this->get('callerid'),
                'number'            => $this->get('extension'),
                'user_email'        => $this->get('emailcallrecordaddress'),
                'user_language'     => $language,
                'sip_secret'        => $secret,
                'sip_uniqid'        => $this->get('uniqid'),
                'sip_dtmfmode'      => $this->get('dtmfmode'),
                'sip_type'          => 'peer',
                'is_general_user_number' => 1,
                'sip_busylevel'     => 1,
                'sip_disabled'      => 0,
                'user_role'         => 'user',
                'user_avatar'       => '',
                'sip_networkfilterid' => 'none',
                'file-select'       => '',
                'nat' => 'force_rport,comedia',
                'qualify' => 'on',
                'qualifyfreq' => '60',
                'codec_alaw' => 'on',
                'codec_ulaw' => 'on',
                'codec_g726' => 'false',
                'codec_gsm' => 'false',
                'codec_adpcm' => 'false',
                'codec_g722' => 'false',
                'codec_h263' => 'false',
                'codec_h264' => 'false',
                'sip_manualattributes' => '',
                'mobile_number' => '',
                'mobile_dialstring' => '',
                'mobile_uniqid' => null,
                'fwd_forwarding' => '',
                'fwd_forwardingonbusy' => '',
                'fwd_forwardingonunavailable' => '',
                'tmp_pbx_networkfilter' => $networkfilter
            ];

        }
    }

    /**
     * Конвертация настроек sip.conf (учетки провайдеров).
     */
    private function parse_sip_providers(){
        foreach($this->res_html->find('sip provider') as $e) {
            $this->init_data($e->children);
            if ($this->get('uniqid') == null) {
                continue;
            }
            $this->data['providers_sip'][] = [
                'id'                => null,
                'uniqid'            => $this->get('uniqid'),
                'secret'            => $this->get('secret'),
                'dtmfmode'          => $this->get('dtmfmode'),
                'type'              => 'friend',
                'port'              => $this->get('port'),
                'username'          => $this->get('username'),
                'host'              => $this->get('host'),
                'description'       => $this->get('name'),
                'providerType'      => 'SIP',
                'receive_calls_without_auth' => 0,
                'disabled'          => 1,
                'networkfilterid'   => 'none',
                'file-select'       => '',
                'nat'               => 'force_rport,comedia',
                'qualify'           => 'on',
                'qualifyfreq'       => '60',
                'codec_alaw'        => 'on',
                'codec_ulaw'        => 'on',
                'codec_g726'        => 'false',
                'codec_gsm'         => 'false',
                'codec_adpcm'       => 'false',
                'codec_g722'        => 'false',
                'codec_h263'        => 'false',
                'codec_h264'        => 'false',
                'disablefromuser'   => ($this->get('disablefromuser') == 'yes')?1:0,
                'fromdomain'        => $this->get('fromdomain'),
                'defaultuser'       => $this->get('authuser'),
                'fromuser'          => $this->get('fromuser'),
                'manualattributes'  => base64_decode($this->get('manualattributes')),
                'noregister'        => ($this->get('noregister') == 'yes')?1:0,
           ];

        }
    }

    /**
     * Конвертация настроек sip.conf (учетки провайдеров).
     */
    private function parse_iax_providers(){
        foreach($this->res_html->find('iax provider') as $e) {
            $this->init_data($e->children);
            if ($this->get('uniqid') == null) {
                continue;
            }

            $this->data['providers_iax'][] = [
                'id'                => null,
                'uniqid'            => $this->get('uniqid'),
                'secret'            => $this->get('secret'),
                'type'              => null,
                'username'          => $this->get('username'),
                'host'              => $this->get('host'),
                'description'       => $this->get('name'),
                'providerType'      => 'IAX',
                'disabled'          => 1,
                'networkfilterid'   => 'none',
                'qualify'           => 'on',
                'codec_alaw'        => 'on',
                'codec_ulaw'        => 'on',
                'codec_g726'        => 'false',
                'codec_gsm'         => 'false',
                'codec_adpcm'       => 'false',
                'codec_g722'        => 'false',
                'codec_h263'        => 'false',
                'codec_h264'        => 'false',
                'manualattributes'  => base64_decode($this->get('manualattributes')),
                'noregister'        => ($this->get('noregister') == 'yes')?'on':'false',
           ];
        }
    }

    /**
     * Конвертация настроек внешних телефонов.
     */
    private function parse_external_phone(){
        foreach($this->res_html->find('external phone') as $e) {
            $this->init_data($e->children);

            $userid     = null;
            $user_num   = null;
            $fwd_forwarding = null; $fwd_forwardingonbusy = null; $fwd_forwardingonunavailable = null;
            foreach ($this->data['m_ExtensionForwardingRights'] as &$forwarding){
                if($forwarding['id_forwarding'] == $this->get('uniqid')){
                    $userid                   = $forwarding['id_forwarding'];
                    $user_num                 = $forwarding['extension'];
                    $forwarding['forwarding'] = $this->get('extension');
                    $fwd_forwarding = $this->get('extension');
                    if($forwarding['id_forwardingonbusy'] == $this->get('uniqid')){
                        $forwarding['forwardingonbusy'] = $this->get('extension');
                        $fwd_forwardingonbusy = $this->get('extension');
                    }
                    if($forwarding['id_forwardingonunavailable'] == $this->get('uniqid')){
                        $forwarding['forwardingonunavailable'] = $this->get('extension');
                        $fwd_forwardingonunavailable = $this->get('extension');
                    }
                    break;
                }
            }
            if($userid == null) continue;

            $exten_db = Models\ExternalPhones::findFirst("extension='{$this->get('extension')}'");
            $mobile_uniqid      = ($exten_db == null)?$this->get('uniqid'):$exten_db->uniqid;

            $extension = &$this->data['extensions'][$user_num];
            $extension['mobile_number']                 = $this->get('extension');
            $extension['mobile_dialstring']             = $this->get('extension');
            $extension['mobile_uniqid']                 = $mobile_uniqid;
            $extension['fwd_forwarding']                = $fwd_forwarding;
            $extension['fwd_forwardingonbusy']          = $fwd_forwardingonbusy;
            $extension['fwd_forwardingonunavailable']   = $fwd_forwardingonunavailable;

            $this->data['m_Extensions'][] = [
                'number'     => $this->get('extension'),
                'type'       => 'EXTERNAL',
                'callerid'   => $this->get('callerid'),
                'userid'     => $userid,
                'is_general_user_number' => 1,
            ];

            $this->data['m_ExternalPhones'][] = [
                'extension'     => $this->get('extension'),
                'dialstring'    => $this->get('extension'),
                'uniqid'        => $mobile_uniqid,
                'disabled'      => 0,
            ];
        }
    }

    /**
     * Получаем настройки SMART IVR.
     */
    private function parse_smart_ivr(){
        foreach($this->res_html->find('miko_1c smartivr') as $e) {
            $this->init_data($e->children);
            $exten = '000063';
            foreach ($this->data['extensions'] as $key => $value){
                $exten = $key;
                break;
            }

            $this->data['smart_ivr'] = [
                'server1chost'      => $this->get('server'),
                'server1cport'      => $this->get('port'),
                'database'          => $this->get('db_name'),
                'login'             => $this->get('user_1c'),
                'secret'            => $this->get('pass'),
                'failoverextension' => "$exten",
            ];

            break;
        }

    }

    /**
     * Получаем ключ лицензии.
     */
    private function parse_saas_key(){
        foreach($this->res_html->find('saaskey') as $e) {
            $this->data['saas_key'] = $e->text();
        }
    }

    /**
     * Разбор маршрутов вызовов.
     */
    private function parse_callflow(){
        foreach($this->res_html->find('cfe callflow') as $e) {
            $this->init_data($e->children);
            if($this->get('data') == null){
                continue;
            }
            $data = json_decode(base64_decode($this->get('data')), true);
            $this->parse_queues($data);
            $this->parse_ivr($data);
        }
    }

    /**
     * Конвертация очередей.
     * @param $data
     */
    private function parse_queues($data){
        $queues      = [];
        $tmp_queues  = [];
        $tmp_members = [];
        foreach ($data['containers'] as $key => $value){
            if('Queue' == $value['title']){
                $tmp_queues[$key] = $value;
            }elseif('QueueMember' == $value['title']){
                $tmp_members[$key] = $value;
            }
        }

        foreach ($data['wires'] as $value){
            $src = $value['src']['moduleId'];
            $tgt = $value['tgt']['moduleId'];

            if(!isset($tmp_queues[$src]) || !isset($tmp_members[$tgt])){
                continue;
            }
            if(!isset($queues[$src]['description'])){
                $queues[$src]['members'] = [];
                $queues[$src]['name'] = $this->get('name');
                $queues[$src]['recive_calls_while_on_a_call'] = ($tmp_queues[$src]["dataContainer"]["checkbox3"] == "y")?'false':'on';
                $queues[$src]['strategy'] = $tmp_queues[$src]["dataContainer"]["list2"];
                $queues[$src]['caller_hear'] = "moh";
                $queues[$src]['description'] = "from old config Askozia";
                $queues[$src]['announce_hold_time'] = ($tmp_queues[$src]["dataContainer"]["checkbox6"] == "y")?'on':'false';
                $queues[$src]['announce_position']  = ($tmp_queues[$src]["dataContainer"]["checkbox7"] == "y")?'on':'false';

                $queues[$src]['periodic_announce_frequency'] = ($tmp_queues[$src]["dataContainer"]["number5"] == "0")?'30':$tmp_queues[$src]["dataContainer"]["number5"];
                $queues[$src]['periodic_announce_sound_id']  = '';
                $queues[$src]['timeout_to_redirect_to_extension']   = '';
                $queues[$src]['timeout_extension']                  = '';
                $queues[$src]['redirect_to_extension_if_empty']     = '';
                $queues[$src]['id']                                 = null;
                $queues[$src]['seconds_for_wrapup'] = $tmp_queues[$src]["dataContainer"]["number3"];
                $queues[$src]['seconds_to_ring_each_member'] = $tmp_queues[$src]["dataContainer"]["number4"];
            }

            $id_user = $tmp_members[$tgt]['dataContainer']['list1'];
            foreach ($this->data['extensions'] as $exten){
                if($exten['sip_uniqid'] == $id_user){
                    $queues[$src]['members'][] = [
                        'number' => $exten['number'],
                        'priority' => count($queues[$src]['members']),
                    ];
                    break;
                }
            }

            foreach ($this->data['m_ExternalPhones'] as $exten){
                if($exten['uniqid'] == $id_user){
                    $queues[$src]['members'][] = [
                        'number' => $exten['extension'],
                        'priority' => count($queues[$src]['members']),
                    ];
                    break;
                }
            }

        }

        foreach ($queues as $key => $q){
            $q['members'] = json_encode($q['members'], JSON_UNESCAPED_SLASHES);
            if(count($queues) == 1){
                $q['extension'] = $this->get('number');
            }else{
                $q['extension'] = '100'.$key.'0'.$this->get('number');
            }
            $q['uniqid'] = "QUEUE-".md5($q['extension']);
            $this->data['call-queues'][] = $q;
        }

    }

    private function parse_ivr($data){
        $tmp_ivrs  = [];
        $tmp_modules = [];

        /*
         /admin-cabinet/ivr-menu/save
         */
        foreach ($data['containers'] as $key => $value){
            if('Background' == $value['title']){
                $tmp_ivrs[$key] = $value;
            }else{
                $tmp_modules[$key] = $value;
            }
        }

        $arr_digits = [
            'Press1'=>'1',
            'Press2'=>'2',
            'Press4'=>'3',
            'Press4'=>'4',
            'Press5'=>'5',
            'Press6'=>'6',
            'Press7'=>'7',
            'Press8'=>'8',
            'Press9'=>'9',
        ];
        foreach ($tmp_ivrs as $key => $ivr){
            $m_ivr = [
                'id'            => null,
                'name'          => $this->get('name'), // TODO,
                'extension'     => ''.$this->get('number').$key, // TODO,
                'description'   => 'IVR from OLD config '. $this->get('number'), // TODO,
                'actions'       => [],
                'timeout_extension' => '',
                'uniqid'            => 'IVR-'.md5($key.time()),
                'allow_enter_any_internal_extension' => 'false',
                'audio_message_id' => '0',
            ];
            // $key - это id модуля IVR.
            foreach ($data['wires'] as $value){
                unset($digits);
                unset($timeout_extension);
                // Найдем связи модуля IVR.
                if($value['src']['moduleId'] != $key){
                    continue;
                }
                // $tgt - id модуля назначения.
                $tgt = $value['tgt']['moduleId'];
                if(!isset($tmp_modules[$tgt])){
                    continue;
                }
                $m = $tmp_modules[$tgt];
                if(isset($arr_digits[$m['title']])){
                    $digits = $arr_digits[$m['title']];
                }elseif ($m['title'] == 'ExtensionT'){
                    $timeout_extension = 't';
                }else{
                    continue;
                }
                $exten = '';
                $id = $tgt;$ch=0;
                while ($ch <20){
                    if($exten != '') break;
                    $ch++;
                    foreach ($data['wires'] as $wires){
                        if($exten != '') break;
                        if($wires['src']['moduleId'] != $id){
                            continue;
                        }
                        $tgt_m = $wires['tgt']['moduleId'];
                        if(!isset($tmp_modules[$tgt_m])){
                            continue;
                        }
                        $res_m = $tmp_modules[$tgt_m];
                        if('Phone' == $res_m['title']){
                            $phone_id = $res_m['dataContainer']['list1'];
                            foreach ($this->data['extensions'] as $extension_m){
                                if($extension_m['sip_uniqid'] == $phone_id){
                                    $exten = $extension_m['number'];
                                    break;
                                }
                            }
                        }elseif('DialNumber' == $res_m['title']){
                            foreach ($this->data['extensions'] as $extension_m){
                                if($extension_m['number'] == $res_m['dataContainer']['number1']){
                                    $exten = $extension_m['number'];
                                    break;
                                }
                            }
                            foreach ($this->data['call-queues'] as $extension_m){
                                if($extension_m['name'] == $res_m['dataContainer']['number1']){
                                    $exten = $extension_m['extension'];
                                    break;
                                }
                            }

                        }else{
                            $id = $tgt_m;
                        }
                    }
                }

                if(!empty($digits) && !empty($exten)){
                    $m_ivr['actions'][] = [
                        'digits'    => $digits,
                        'extension' => $exten,
                    ];
                }elseif(!empty($exten) && !empty($timeout_extension)){
                    $m_ivr['timeout_extension'] = $exten;
                }
            }
            $m_ivr['actions'] = json_encode($m_ivr['actions'], JSON_UNESCAPED_SLASHES);
            $this->data['ivr-menu'][] = $m_ivr;
        } // foreach ($tmp_ivrs as $key => $ivr)

    }

    /**
     * Конвертация настроек manager.conf.
     */
    private function parse_manager(){
        foreach($this->res_html->find('services manager manager-user') as $e) {
            $this->init_data($e->children);
            if($this->get('username') != null) {
                $rules = 'rule_AMI';
                $networkfilter = $this->add_net_filter($this->get('permitip'), $this->get('permitnetmask'), $rules);

                $manager = [
                    'id' => null,
                    'username' => $this->get('username'),
                    'secret' => $this->get('secret'),
                    'networkfilterid' =>'none',
                    'description' => 'from old congig Askozia'
                ];
                $keys  = array( 'call', 'cdr', 'originate', 'reporting',
                    'agent', 'config', 'dialplan', 'dtmf',
                    'log', 'system', 'verbose', 'user');

                foreach ($keys as $key){
                    $manager["{$key}_main"]  = 'false';
                    $manager["{$key}_read"]  = 'false';
                    $manager["{$key}_write"] = 'false';
                }

                $read_permission = ($this->get('read-permission') == null)?[]:$this->get('read-permission');
                foreach ($read_permission as $key){
                    $manager["{$key}_read"]  = 'on';
                }
                $read_permission = ($this->get('write-permission') == null)?[]:$this->get('read-permission');
                foreach ($read_permission as $key){
                    $manager["{$key}_write"]  = 'on';
                }
                foreach ($keys as $key){
                    if( $manager["{$key}_read"] == 'on' && $manager["{$key}_write"] == 'on' ){
                        $manager["{$key}_main"] = 'on';
                    }
                }

                $this->data['asterisk-managers'][] = $manager;

            }
        }
    }

    /**
     * Добавляем в массив новый сетевой фильтр.
     * @param        $permitip
     * @param        $permitnetmask
     * @param string $rules
     * @return string
     */
    private function add_net_filter($permitip, $permitnetmask, $rules = ''){
        $networkfilter       = '';
        if(Verify::is_ipaddress($permitip) && Verify::is_ipaddress($permitnetmask)){
            $net    = new Network();
            $subnet = $net->net_mask_to_cidr($permitnetmask);
            $networkfilter = "{$permitip}/{$subnet}";

            if(isset($this->data['net_filters'][$networkfilter])){
                $filter = & $this->data['net_filters'][$networkfilter];
            }else{
                $filter = [
                    'id'            => null,
                    'description'   => 'network from old config',
                    'network'       => $permitip,
                    'subnet'        => $subnet,
                    'rule_SIP'      => 'false',
                    'rule_WEB'      => 'false',
                    'rule_AMI'      => 'false',
                    'rule_CTI'      => 'false',
                    'rule_ICMP'     => 'false',
                    'local_network' => 'false',
                    'newer_block_ip'=> 'false',
                ];
            }

            $arr_rules = explode(',', $rules);
            foreach ($arr_rules as $rule_name){
                $filter[$rule_name] = 'on';
            }
            if($subnet == 32){
                $filter['local_network'] = 'false';
            }
            $this->data['net_filters'][$networkfilter] = $filter;
        }
        return $networkfilter;
    }

    /**
     * Создает конфигурацию в новом формате.
     */
    public function make_config(){
        $w_api = new WebAPIClient();
        $res = $w_api->login();
        if(!$res){
            return false;
        }

        foreach ($this->data['net_filters'] as $key => $value){
            $filter = Models\NetworkFilters::findFirst("permit='{$key}'");
            if($filter == null){
                $w_api->add_net_filter($value);
            }
        }

        foreach ($this->data['extensions'] as $key => $value){
            if(!empty($value['tmp_pbx_networkfilter'])){
                $filter = Models\NetworkFilters::findFirst("permit='{$value['tmp_pbx_networkfilter']}'");
                if($filter != null){
                    $value['sip_networkfilterid'] = $filter->id;
                }
            }
            $w_api->add_extension($value);
        }

        foreach ($this->data['asterisk-managers'] as $key => $value){
            $w_api->add_manager($value);
        }

        foreach ($this->data['providers_sip'] as $key => $value){
            $w_api->add_provider_sip($value);
        }

        foreach ($this->data['providers_iax'] as $key => $value){
            $w_api->add_provider_iax($value);
        }

        if(count($this->data['smart_ivr'])>0){
            $w_api->add_smart_ivr($this->data['smart_ivr']);
        }

        if($this->data['saas_key'] != ''){
            $config = new Config();
            $config->set_general_settings('PBXLicense', $this->data['saas_key']);
        }

        foreach ($this->data['call-queues'] as $key => $value){
            $w_api->add_queue($value);
        }
        foreach ($this->data['ivr-menu'] as $key => $value){
            $w_api->add_ivr_menu($value);
        }
    }

}