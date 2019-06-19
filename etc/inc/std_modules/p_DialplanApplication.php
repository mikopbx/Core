<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 5 2019
 */

class p_DialplanApplication extends ConfigClass {
    private $db_data;
    /**
     * Получение настроек.
     */
    public function getSettings(){
        // Настройки для текущего класса.
        $this->db_data = Models\DialplanApplications::find();
    }
    /**
     * Возвращает включения в контекст internal
     * @return string
     */
    public function getIncludeInternal(){
        // Включаем контексты.
        $conf = "include => applications \n";
        return $conf;
    }

    /**
     * Возвращает включения в контекст internal-transfer
     * @return string
     */
    public function getIncludeInternalTransfer(){
        // Генерация внутреннего номерного плана.
        $result = '';
        // $result.= "include => applications \n";
        return $result;
    }

    /**
     * Генерация дополнительных контекстов.
     * @return string
     */
    public function extensionGenContexts(){
        $app_ext_conf = "\n[applications]\n";
        foreach ($this->db_data as $app){
            if('plaintext' == $app->type){
                $app_ext_conf .= $this->generatePlaneTextApp($app);
            }else if('php' == $app->type){
                $app_ext_conf .= $this->generatePhpApp($app);
            }else{
                continue;
            }
        }
        return $app_ext_conf;
    }


    /**
     * Генерация хинтов.
     * @return string
     */
    public function extensionGenHints(){
        $conf = '';
        foreach ($this->db_data as $app){
            $conf.= "exten => {$app->extension},hint,Custom:{$app->extension} \n";
        }
        return $conf;
    }

    /**
     * @param $app
     * @return string
     */
    private function generatePlaneTextApp($app){
        // 	same => n,Macro(dial_answer)
        $text_app = base64_decode($app->applicationlogic);
        $arr_data_app = explode("\n", $text_app);

        $app_data = "";
        foreach ($arr_data_app as $row){
            if("" == $app_data){
                $app_data .= "exten => _{$app->extension},$row"."\n\t";
            }else{
                $app_data .= "same => $row"."\n\t";
            }
        }
        $result = "$app_data\n";
        return $result;
    }

    private function generatePhpApp($app){
        $text_app = "#!/usr/bin/php\n";
        $text_app.= base64_decode($app->applicationlogic);
        file_put_contents("/etc/asterisk/agi-bin/{$app->uniqid}.php", $text_app);
        chmod("/etc/asterisk/agi-bin/{$app->uniqid}.php", 0755);

        $result = 'exten => _'.$app->extension.',1,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Gosub(set_orign_chan,s,1))'."\n\t";
        // $result.= 'same => n,AGI(cdr_connector.php,dial_app)'." \n\t";
        $result.= 'same => n,Gosub(dial_app,${EXTEN},1)'."\n\t";
        $result.= "same => n,AGI({$app->uniqid}.php)\n";
        return $result;
    }

}