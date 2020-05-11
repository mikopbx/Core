<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Modules\Config\ConfigClass;

class DialplanApplicationConf extends ConfigClass
{
    private $db_data;

    /**
     * Получение настроек.
     */
    public function getSettings(): void
    {
        // Настройки для текущего класса.
        $this->db_data = DialplanApplications::find()->toArray();
    }

    /**
     * Возвращает включения в контекст internal
     *
     * @return string
     */
    public function getIncludeInternal(): string
    {
        // Включаем контексты.
        $conf = "include => applications \n";

        return $conf;
    }

    /**
     * Возвращает включения в контекст internal-transfer
     *
     * @return string
     */
    public function getIncludeInternalTransfer(): string
    {
        // Генерация внутреннего номерного плана.
        $result = '';

        // $result.= "include => applications \n";
        return $result;
    }

    /**
     * Генерация дополнительных контекстов.
     *
     * @return string
     */
    public function extensionGenContexts(): string
    {
        $app_ext_conf = "\n[applications]\n";
        foreach ($this->db_data as $app) {
            if ('plaintext' == $app['type']) {
                $app_ext_conf .= $this->generatePlaneTextApp($app);
            } elseif ('php' == $app['type']) {
                $app_ext_conf .= $this->generatePhpApp($app);
            } else {
                continue;
            }
        }

        return $app_ext_conf;
    }

    /**
     * @param $app
     *
     * @return string
     */
    private function generatePlaneTextApp($app): string
    {
        // 	same => n,Macro(dial_answer)
        $text_app     = base64_decode($app['applicationlogic']);
        $arr_data_app = explode("\n", trim($text_app));

        $app_data = '';
        foreach ($arr_data_app as $row) {
            if ('' === $app_data) {
                $app_data .= "exten => _{$app['extension']},$row" . "\n\t";
            } else {
                $app_data .= "same => $row" . "\n\t";
            }
        }
        $result = "$app_data\n";

        return $result;
    }

    private function generatePhpApp($app): string
    {
        $agiBinFolder = $this->di->getConfig()->path('asterisk.astagidir');
        $text_app     = "#!/usr/bin/php\n";
        $text_app     .= base64_decode($app['applicationlogic']);
        file_put_contents("{$agiBinFolder}/{$app['uniqid']}.php", $text_app);
        chmod("{$agiBinFolder}/{$app['uniqid']}.php", 0755);

        $result = 'exten => _' . $app['extension'] . ',1,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Gosub(set_orign_chan,s,1))' . "\n\t";
        // $result.= 'same => n,AGI(cdr_connector.php,dial_app)'." \n\t";
        $result .= 'same => n,Gosub(dial_app,${EXTEN},1)' . "\n\t";
        $result .= "same => n,AGI({$app['uniqid']}.php)\n";

        return $result;
    }

    /**
     * Генерация хинтов.
     *
     * @return string
     */
    public function extensionGenHints(): string
    {
        $conf = '';
        foreach ($this->db_data as $app) {
            $conf .= "exten => {$app['extension']},hint,Custom:{$app['extension']} \n";
        }

        return $conf;
    }

}