<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2019
 */

require_once 'globals.php';

class p_SIP extends ConfigClass {
    protected $data_peers;
    protected $data_providers;
    protected $data_rout;
    protected $description = 'sip.conf';

    /**
     * Получение настроек.
     */
    public function getSettings(){
        // Настройки для текущего класса.
        $this->data_peers     = $this->get_peers();
        $this->data_providers = $this->get_providers();
        $this->data_rout      = $this->get_out_routes();

    }

    /**
     * Генератор sip.conf
     * @param $general_settings
     * @return bool|void
     */
    protected function generateConfigProtected($general_settings){

        $conf = '';
        $conf.= $this->generate_general($general_settings);
        $conf.= $this->generate_providers($general_settings);
        $conf.= $this->generate_peers($general_settings);

        Util::file_write_content($this->astConfDir."/sip.conf", $conf);

        $db = new AstDB();
        foreach($this->data_peers as $peer){
            // Помещаем в AstDB сведения по маршуртизации.
            $ringlength = ($peer['ringlength'] == 0)?'':trim($peer['ringlength']);
            $db->database_put('FW_TIME',	"{$peer['extension']}", $ringlength);
            $db->database_put('FW', 		"{$peer['extension']}", trim($peer['forwarding']) );
            $db->database_put('FW_BUSY', "{$peer['extension']}", trim($peer['forwardingonbusy']) );
            $db->database_put('FW_UNAV', "{$peer['extension']}", trim($peer['forwardingonunavailable']) );
        }

        $this->generateSipNotify();
    }

    /**
     * Генератор файла sip_notify.conf.
     * Удаленное управление телефоном.
     */
    private function generateSipNotify(){
        // Ребут телефонов Yealink.
        // CLI> sip notify yealink-reboot autoprovision_user
        // autoprovision_user - id sip учетной записи.
        $conf = "";
        $conf.= "[yealink-reboot]\n".
                "Event=>check-sync\;reboot=true\n".
                "Content-Length=>0\n";
        $conf.= "\n";

        // Пример
        // CLI> sip notify yealink-action-ok autoprovision_user
        // http://support.yealink.com/faq/faqInfo?id=173
        $conf.= "[yealink-action-ok]\n".
                "Content-Type=>message/sipfrag\n".
                "Event=>ACTION-URI\n".
                "Content=>key=SPEAKER\n";

        Util::file_write_content($this->astConfDir."/sip_notify.conf", $conf);
    }

    /**
     * Генератора секции general sip.conf
     * @param $general_settings
     * @return string
     */
    private function generate_general($general_settings){

        $conf = "[general] \n".
            "context=public-direct-dial \n".
            "transport=udp \n".
            "allowoverlap=no \n".
            "udpbindaddr=0.0.0.0:{$general_settings['SIPPort']} \n".
            "srvlookup=yes \n".
            "useragent={$this->g['pt1c_pbx_name']} \n".
            "sdpsession={$this->g['pt1c_pbx_name']} \n".
            "relaxdtmf=yes \n".
            "alwaysauthreject=yes \n".
            "videosupport=yes \n".
            "minexpiry={$general_settings['SIPMinExpiry']} \n".
            "defaultexpiry={$general_settings['SIPDefaultExpiry']} \n".
            "maxexpiry={$general_settings['SIPMaxExpiry']} \n".
            "nat=force_rport,comedia; \n".
            "notifyhold=yes \n".
            "notifycid=ignore-context \n".
            "notifyringing=yes \n".
            "pedantic=yes \n".
            "callcounter=yes \n".
            "regcontext=sipregistrations \n".
            "regextenonqualify=yes \n".
            // SIP/SIMPLE
            "accept_outofcall_message=yes \n".
            "outofcall_message_context=messages \n".
            "subscribecontext=internal-hints \n".
            "auth_message_requests=yes \n".
            // Support for ITU-T T.140 realtime text.
            "textsupport=yes \n".
            "register_retry_403=yes\n\n";
        $network  = new Network();

        $topology = 'public'; $extipaddr = ''; $exthostname = '';
        $networks = $network->getGeneralNetSettings();
        $subnets = array();
        foreach ($networks as $if_data){
            $lan_config = $network->get_interface($if_data['interface']);
            if(NULL == $lan_config["ipaddr"] || NULL == $lan_config["subnet"]){
                continue;
            }
            $sub = new SubnetCalculator( $lan_config["ipaddr"], $lan_config["subnet"] );
            $net = $sub->getNetworkPortion() . "/" . $lan_config["subnet"];
            if($if_data["topology"] == 'private' && array_search($net,$subnets) === FALSE){
                $subnets[] = $net;
            }
            if(trim($if_data["internet"]) == 1){
                $topology    = trim($if_data["topology"]);
                $extipaddr   = trim($if_data["extipaddr"]);
                $exthostname = trim($if_data["exthostname"]);
            }
        }

        $networks = Models\NetworkFilters::find('local_network=1');
        foreach ($networks as $net){
            if(array_search($net->permit,$subnets) === FALSE){
                $subnets[] = $net->permit;
            }
        }

        foreach ($subnets as $net){
            $conf .= "localnet={$net}\n";
        }

        if($topology == 'private'){
            if(!empty($exthostname)){
                $conf .= "externhost={$exthostname}\n";
                $conf .= "externrefresh=10";
            }elseif(!empty($extipaddr)){
                $conf .= "externaddr={$extipaddr}";
            }
        }

        $conf.="\n\n";
        return $conf;
    }

    /**
     * Генератор секции провайдеров в sip.conf
     * @param $general_settings
     * @return string
     */
    private function generate_providers($general_settings){
        $conf = '';
        $reg_strings = '';
        $prov_config = '';

        foreach($this->data_providers as $provider){
            // Формируем строку регистрации.
            $manualregister = trim(str_replace(["register", "=>"],'', $provider['manualregister']));
            $port	   = (trim($provider['port']) =='')?'5060':"{$provider['port']}";
            if($provider['noregister'] != 1 && !empty($provider['manualregister'])){
                // Строка регистрация определена вручную.
                $reg_strings.= "register => {$manualregister} \n";
            }else if($provider['noregister'] != 1){
                // Строка регистрации генерируется автоматически.
                $sip_user  = '"'.$provider['username'].'"';
                $secret	   = (trim($provider['secret']) =='')?'':":\"{$provider['secret']}\"";
                $host	   = ''.$provider['host'].'';
                $extension = $sip_user;

                $reg_strings.= "register => {$sip_user}{$secret}@{$host}:{$port}/{$extension} \n";
            }

            // Формируем секцию / раздел sip.conf
            // Различные доп. атрибуты.
            $fromdomain  = (trim($provider['fromdomain']) =='')?"{$provider['host']}":"{$provider['fromdomain']}";
            $defaultuser = (trim($provider['defaultuser']) =='')?"{$provider['username']}":"{$provider['defaultuser']}";
            $qualify     = ($provider['qualify'] == 1 || $provider['qualify'] == 'yes')?'yes':'no';

            $from     = (trim($provider['fromuser']) =='')?"{$provider['username']}; username":"{$provider['fromuser']}; fromuser";
            $fromuser = ($provider['disablefromuser'] == 1)?'':"fromuser={$from}; \n";

            // Ручные настройки.
            $manualattributes = '';
            if(trim($provider['manualattributes']) != ''){
                $manualattributes = "; manual attributes \n".
                    base64_decode($provider['manualattributes']). " \n".
                    "; manual attributes\n";
            }
            $type = 'friend';
            if(1 == $provider['receive_calls_without_auth']){
                // Звонки без авторизации.
                $type               = 'peer';
                $defaultuser        = ';';
                $provider['secret'] = ';';
            }
            $lang = $general_settings['PBXLanguage'];

            $codecs = "";
            foreach ($provider['codecs'] as $codec){
                $codecs .= "allow={$codec} \n";
            }

            // Формирование секции.
            $prov_config.=  "[{$provider['uniqid']}] \n".
                "type={$type} \n".
                "context={$provider['uniqid']}-incoming \n".
                "host={$provider['host']} \n".
                "port={$port} \n".
                "language={$lang}\n".
                "nat={$provider['nat']} \n".
                "dtmfmode={$provider['dtmfmode']} \n".
                "qualifyfreq={$provider['qualifyfreq']} \n".
                "qualify={$qualify} \n".
                "directmedia=no \n".
                "secret={$provider['secret']} \n".
                "icesupport=yes \n".
                "insecure=port,invite \n".
                "disallow=all \n".
                "$codecs".
                "defaultuser=$defaultuser\n".
                "fromdomain=$fromdomain\n".
                "$fromuser".
                "$manualattributes".
                "\n";

        }

        $conf.= "$reg_strings \n";
        $conf.= $prov_config;

        return $conf;
    }

    /**
     * Генератор сеции пиров для sip.conf
     * @param $general_settings
     * @return string
     */
    public function generate_peers($general_settings){
        $lang = $general_settings['PBXLanguage'];
        $conf = '';
        foreach($this->data_peers as $peer){

            $language = str_replace('_', '-', strtolower($lang));
            $language 	  = (trim($language)=='')?'ru-ru':$language;

            $calleridname = (trim($peer['calleridname'])=='')?$peer['extension']:$peer['calleridname'];
            $deny         = (trim($peer['deny'])=='')?'':'deny='.$peer['deny']."\n";
            $busylevel    = (trim($peer['busylevel'])=='')?'':'busylevel='.$peer['busylevel']."\n";
            $permit       = (trim($peer['permit'])=='')?'':'permit='.$peer['permit']."\n";

            // Установим значением по умолчанию.
            $qualify      = 'yes'; // ($peer['qualify'] == 1 || $peer['qualify'] == 'yes')?'yes':'no';
            $qualifyfreq  = '60';  // $peer['qualifyfreq'];

            // Ручные настройки.
            $manualattributes = '';
            if(trim($peer['manualattributes']) != ''){
                $tmp_data = base64_decode($peer['manualattributes']);
                if(base64_encode($tmp_data) == $peer['manualattributes']){
                    $manualattributes = "; manual attributes \n{$tmp_data} \n; manual attributes\n";
                }else{
                    // TODO Данные НЕ закодированы в base64
                    $manualattributes = "; manual attributes \n{$peer['manualattributes']} \n; manual attributes\n";
                }
            }

            $codecs = "";
            foreach ($peer['codecs'] as $codec){
                $codecs .= "allow={$codec} \n";
            }

            // ---------------- //
            $conf.= "[{$peer['extension']}] \n".
                "type=friend \n".
                "context=all_peers \n".
                "host=dynamic \n".
                "language=$language \n".
                "nat=force_rport,comedia; \n".
                // "nat={$peer['nat']} \n".
                "dtmfmode={$peer['dtmfmode']} \n".
                "qualifyfreq={$qualifyfreq} \n".
                "qualify={$qualify} \n".
                "directmedia=no \n".
                "callerid={$calleridname} <{$peer['extension']}> \n".
                "secret={$peer['secret']} \n".
                "icesupport=yes \n".
                "disallow=all \n".
                "$codecs".
                "pickupgroup=1 \n".
                "callgroup=1 \n".
                "sendrpid=pai\n".
                // "mailbox={$peer['extension']}@voicemailcontext \n".
                "mailbox=admin@voicemailcontext \n".

                "$busylevel".
                "$deny".
                "$permit".
                "$manualattributes".
                "\n";
            // ---------------- //
        }

        $modules = \Models\PbxExtensionModules::find("disabled=0");
        foreach ($modules as $value) {
            $class_name = str_replace("Module", '', $value->uniqid);
            $path_class  = "\\Modules\\{$value->uniqid}\\Lib\\{$class_name}";
            if (class_exists($path_class)){
                /** @var \ConfigClass $Object */
                $Object = new $path_class($this->g);
                $conf  .= $Object->generate_peers($general_settings);
            }
        }

        return $conf;
    }

    /**
     * Получение данных по SIP провайдерам.
     * @return array
     */
    private function get_providers(){
        /** @var \Models\Sip $sip_peer */
        /** @var \Models\NetworkFilters $network_filter */
        // Получим настройки всех аккаунтов.
        $data = [];
        $db_data = \Models\Sip::find("type = 'friend' AND ( disabled <> '1')");
        foreach ($db_data as $sip_peer) {
            $arr_data = $sip_peer->toArray();
            $arr_data['receive_calls_without_auth'] = $sip_peer->receive_calls_without_auth;
            $network_filter = \Models\NetworkFilters::findFirst($sip_peer->networkfilterid);
            $arr_data['permit'] = ($network_filter==null)?'':$network_filter->permit;
            $arr_data['deny']   = ($network_filter==null)?'':$network_filter->deny;

            // Получим используемые кодеки.
            $arr_data['codecs'] = $this->get_codecs($sip_peer->uniqid);

            $data[] = $arr_data;
        }
        return $data;
    }

    /**
     * Получение данных по SIP пирам.
     * @return array
     */
    private function get_peers(){
        /** @var \Models\NetworkFilters $network_filter */
        /** @var \Models\Sip $sip_peer */
        /** @var \Models\Extensions $extension */
        /** @var \Models\Users $user */
        /** @var \Models\ExtensionForwardingRights $extensionForwarding */

        $data = array();
        $db_data = Models\Sip::find("type = 'peer' AND ( disabled <> '1')");
        foreach ($db_data as $sip_peer){
            $arr_data = $sip_peer->toArray();
            $network_filter = null;
            if( null != $sip_peer->networkfilterid ){
                $network_filter = Models\NetworkFilters::findFirst($sip_peer->networkfilterid);
            }
            $arr_data['permit'] = ($network_filter==null)?'':$network_filter->permit;
            $arr_data['deny']   = ($network_filter==null)?'':$network_filter->deny;

            // Получим используемые кодеки.
            $arr_data['codecs'] = $this->get_codecs($sip_peer->uniqid);

            // Имя сотрудника.
            $extension = \Models\Extensions::findFirst("number = '{$sip_peer->extension}'");
            if(null == $extension){
                $arr_data['publicaccess'] = false;
                $arr_data['language']     = '';
                $arr_data['calleridname'] = $sip_peer->extension;
            }else{
                $arr_data['publicaccess'] = $extension->public_access;
                $arr_data['calleridname'] = $extension->callerid;
                $user = \Models\Users::findFirst($extension->userid);
                if(null != $user){
                    $arr_data['language'] = $user->language;
                }
            }
            $extensionForwarding = \Models\ExtensionForwardingRights::findFirst("extension = '{$sip_peer->extension}'");
            if(null == $extensionForwarding){
                $arr_data['ringlength']              = '';
                $arr_data['forwarding']              = '';
                $arr_data['forwardingonbusy']        = '';
                $arr_data['forwardingonunavailable'] = '';
            }else{
                $arr_data['ringlength']              = $extensionForwarding->ringlength;
                $arr_data['forwarding']              = $extensionForwarding->forwarding;
                $arr_data['forwardingonbusy']        = $extensionForwarding->forwardingonbusy;
                $arr_data['forwardingonunavailable'] = $extensionForwarding->forwardingonunavailable;
            }
            $data[] = $arr_data;

        }
        return $data;
    }

    /**
     * Возвращает доступные пиру кодеки.
     * @param $uniqid
     * @return array
     */
    private function get_codecs($uniqid){
        $arr_codecs = [];
        $filter = [
            "sipuid=:id:",
            'bind'       => ['id' => $uniqid],
            'order' => 'priority',
        ];
        $codecs = Models\SipCodecs::find($filter);
        foreach ($codecs as $codec_data){
            $arr_codecs[] = $codec_data->codec;
        }

        return $arr_codecs;
    }

    /**
     * Генератор исходящих контекстов для пиров.
     * @return array
     */
    private function get_out_routes(){
        /** @var \Models\OutgoingRoutingTable $rout */
        /** @var \Models\OutgoingRoutingTable $routs */
        /** @var \Models\Sip $db_data */
        /** @var \Models\Sip $sip_peer */

        $data    = [];
        $routs   = \Models\OutgoingRoutingTable::find(['order' => 'priority']);
        $db_data = \Models\Sip::find("type = 'friend' AND ( disabled <> '1')");
        foreach ($routs as $rout) {
            foreach ($db_data as $sip_peer) {
                if($sip_peer->uniqid != $rout->providerid) continue;
                $arr_data   = $rout->toArray();
                $arr_data['description'] = $sip_peer->description;
                $arr_data['uniqid']      = $sip_peer->uniqid;
                $data[] = $arr_data;
            }
        }
        return $data;
    }

    /**
     * Генератор extension для контекста outgoing.
     * @param string $id
     * @return null|string
     */
    public function getTechByID($id){
        // Генерация внутреннего номерного плана.
        $technology = null;
        foreach ($this->data_providers as $sip_peer) {
            if($sip_peer['uniqid'] != $id) continue;
            $technology = 'SIP';
            break;
        }
        return $technology;
    }

    /**
     * Генератор extension для контекста peers.
     * @return string
     */
    public function extensionGenContexts(){
        // Генерация внутреннего номерного плана.
        $conf = '';

        foreach($this->data_peers as $peer){
            $conf .= "[peer_{$peer['extension']}] \n";
            $conf .= "include => internal \n";
            $conf .= "include => outgoing \n";
        }

        // Входящие контексты.
        foreach($this->data_providers as $provider) {
            $conf .= Extensions::generateIncomingContextPeers($provider['uniqid'], $provider['username']);
        }

        return $conf;
    }

    /**
     * Генерация хинтов.
     * @return string
     */
    public function extensionGenHints(){
        $conf = '';
        foreach($this->data_peers as $peer){
            $conf.= "exten => {$peer['extension']},hint,SIP/{$peer['extension']} \n";
        }
        return $conf;
    }

    public function extensionGenInternal():string {
        // Генерация внутреннего номерного плана.
        $conf = '';
        foreach($this->data_peers as $peer){
            $conf.= "exten => {$peer['extension']},1,Goto(internal-users,{$peer['extension']},1) \n";
        }
        $conf .= "\n";
        return $conf;
    }
    public function extensionGenInternalTransfer():string {
        // Генерация внутреннего номерного плана.
        $conf = '';
        foreach($this->data_peers as $peer){
            $conf.= "exten => {$peer['extension']},1,Goto(internal-users,{$peer['extension']},1) \n";
        }
        $conf .= "\n";
        return $conf;
    }


    /**
     * Получение статусов SIP пиров.
     * @return array
     */
    static function get_peers_statuses() : array {
        $result = array(
            'result'  => 'ERROR'
        );

        $am = Util::get_am('off');
        $peers = $am->get_sip_peers();
        $am->Logoff();

        $result['data']     = $peers;
        $result['result']   = 'Success';
        return $result;
    }

    /**
     * Получение статуса SIP пира.
     * @param $peer
     * @return array
     */
    static function get_peer_status($peer){
        $result = array(
            'result'  => 'ERROR'
        );

        $am = Util::get_am('off');
        $peers = $am->get_sip_peer($peer);
        $am->Logoff();

        $result['data']     = $peers;
        $result['result']   = 'Success';
        return $result;
    }

    /**
     * Получение статусов регистраций.
     */
    static function get_registry(){
        $result = array(
            'result'  => 'ERROR'
        );
        $am = Util::get_am('off');
        $peers = $am->get_sip_registry();

        $providers = Models\Sip::find("type = 'friend'");
        foreach ($providers as $provider){
            if($provider->disabled == 1){
                $peers[] = [
                    'state'     => 'OFF',
                    'id'        => $provider->uniqid,
                    'username'  => $provider->username,
                    'host'      => $provider->host
                ];
                continue;
            }
            if($provider->noregister == 1){
                $peers_status = $am->get_sip_peer($provider->uniqid);
                $peers[] = [
                    'state'     => $peers_status['state'],
                    'id'        => $provider->uniqid,
                    'username'  => $provider->username,
                    'host'      => $provider->host
                ];
                continue;
            }

            foreach ($peers as &$peer){
                if($peer['host'] != $provider->host || $peer['username'] != $provider->username){
                    continue;
                }
                $peer['id'] = $provider->uniqid;
            }
        }
        $am->Logoff();
        $result['data']     = $peers;
        $result['result']   = 'Success';
        return $result;
    }

    /**
     * Перезапуск модуля SIP.
     */
    static function sip_reload(){
        $result = array(
            'result'  => 'ERROR',
            'message' => ''
        );

        $sip    = new p_SIP($GLOBALS['g']);
        $config = new Config();
        $general_settings = $config->get_general_settings();
        $sip->generateConfigProtected($general_settings);
        $out    = array();
        Util::mwexec("asterisk -rx 'dialplan reload'",$out);
        $out_data  = trim(implode('', $out));
        if($out_data != 'Dialplan reloaded.'){
            $result['message'] .= "$out_data";
        }
        $out    = array();
        $out_data  = trim(implode('', $out));
        Util::mwexec("asterisk -rx 'sip reload'", $out);
        if($out_data != ''){
            $result['message'] .= " $out_data";
        }

        if($result['message'] == ''){
            $result['result'] = 'Success';
        }
        return $result;
    }
}