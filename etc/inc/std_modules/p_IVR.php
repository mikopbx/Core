<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 5 2019
 */

class p_IVR extends ConfigClass{
    private $db_data;
    private $extensionLength;

    /**
     * Получение настроек.
     */
    public function getSettings(){
        // Настройки для текущего класса.
        $res = Models\IvrMenu::find();
        $this->db_data = $res;
        $config = new Config();
        $this->extensionLength = $config->get_general_settings('PBXInternalExtensionLength');
    }

    /**
     * Генерация дополнительных контекстов.
     * @return string
     */
    public function extensionGenContexts(){
        // Генерация внутреннего номерного плана.
        $conf = '';
        foreach ($this->db_data as $ivr) {
            /** @var \Models\SoundFiles $res */
            $res = \Models\SoundFiles::findFirst($ivr->audio_message_id);
            $audio_message = ($res == null)?'':$res->path;

            $timeout_wait_exten = max($ivr->timeout, 1);
            if(file_exists($audio_message)){
                $audio_message = Util::trim_extension_file($audio_message);
            }else{
                $audio_message = 'vm-enter-num-to-call';
            }
            $try_count_ivr = $ivr->number_of_repeat;
            $conf .= "[ivr-{$ivr->extension}] \n";
            $conf .= 'exten => s,1,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Gosub(set_orign_chan,s,1))'."\n\t";
            $conf .= "same => n,Set(APPEXTEN={$ivr->extension})\n\t";
            // $conf .= 'same => n,AGI(cdr_connector.php,dial_app)'."\n\t";
            $conf .= 'same => n,Gosub(dial_app,${EXTEN},1)'."\n\t";
            $conf .= 'same => n,Answer()'."\n\t";
            $conf .= 'same => n,ExecIf($["${try_count}x" == "x"]?Set(try_count=0)'."\n\t";
            $conf .= 'same => n,Set(try_count=$[${try_count} + 1])'."\n\t";
            $conf .= 'same => n,GotoIf($[${try_count} > '.$try_count_ivr.']?internal,'.$ivr->timeout_extension.',1)'."\n\t";
            $conf .= "same => n,Set(TIMEOUT(digit)=2) \n\t";
            $conf .= "same => n,Background({$audio_message}) \n\t";
            $conf .= "same => n,WaitExten({$timeout_wait_exten}) \n";
            $res = Models\IvrMenuActions::find("ivr_menu_id = '{$ivr->uniqid}'");
            foreach ($res as $ext){
                $conf .= "exten => {$ext->digits},1,Goto(internal,{$ext->extension},1)\n";
            }
            $conf .= "exten => i,1,Goto(s,5)\n";
            $conf .= "exten => t,1,Goto(s,5)\n";

            if($ivr->allow_enter_any_internal_extension == 1){
                $extension = Util::get_extension_X($this->extensionLength);
                $conf .= 'exten => _'.$extension.',1,ExecIf($["${SIPPEER(${EXTEN},status)}x" == "x"]?Goto(s,1))'. "\n\t";
                $conf .= 'same => n,Goto(internal,${EXTEN},1)'."\n";
            }
        }
        return $conf;
    }

    /**
     * Генерация хинтов.
     * @return string
     */
    public function extensionGenHints(){
        $conf = '';
        foreach($this->db_data as $ivr){
            $conf.= "exten => {$ivr->extension},hint,Custom:{$ivr->extension} \n";
        }
        return $conf;
    }

    /**
     * Получаем длительность файла.
     * @param $filename
     * @return int
     */
    public function get_duration_file($filename){
        $result = 7;
        if(file_exists($filename)){
            Util::mwexec("soxi  {$filename} 2>/dev/null | grep Duration | /usr/bin/awk  '{ print $3}'",$out);
            $time_str = implode($out);
            preg_match_all('/^\d{2}:\d{2}:\d{2}.?\d{0,2}$/', $time_str, $matches, PREG_SET_ORDER, 0);
            if(count($matches)>0){
                $data = date_parse($time_str);
                $result += $data['minute'] * 60 + $data['second'];
            }
        }

        return $result;
    }

    /**
     * Возвращает номерной план для internal контекста.
     * @return string
     */
    public function extensionGenInternal(){
        $ivr_ext_conf = '';
        foreach ($this->db_data as $ivr){
            $ivr_ext_conf .= "exten => {$ivr->extension},1,Goto(ivr-{$ivr->extension},s,1)" . "\n";
        }

        return $ivr_ext_conf;
    }

    /**
     * @return string
     */
    public function extensionGenInternalTransfer(){
        $conf = '';
        foreach ($this->db_data as $ivr){
            $conf.= 'exten => _'.$ivr->extension.',1,Set(__ISTRANSFER=transfer_)'." \n\t";
            $conf.= 'same => n,Goto(internal,${EXTEN},1)'." \n";
        }
        return $conf;
    }

}