<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\DialplanApplications;

class DialplanApplicationConf extends AsteriskConfigClass
{

    public int $priority = 550;


    /**
     * Возвращает включения в контекст internal
     *
     * @return string
     */
    public function getIncludeInternal(): string
    {
        // Включаем контексты.
        return "include => applications \n";
    }


    /**
     * Генерация дополнительных контекстов.
     *
     * @return string
     */
    public function extensionGenContexts(): string
    {
        $app_ext_conf = "\n[applications]\n";
        $arrDialplanApplications = DialplanApplications::find()->toArray();
        foreach ($arrDialplanApplications as $app) {
            if ('plaintext' === $app['type']) {
                $app_ext_conf .= $this->generatePlaneTextApp($app);
            } elseif ('php' === $app['type']) {
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
        $text_app     = base64_decode($app['applicationlogic']);
        $arr_data_app = explode("\n", trim($text_app));

        $app_data = '';
        foreach ($arr_data_app as $row) {
            if(trim($row) === ''){
                continue;
            }
            if ('' === $app_data) {
                $app_data .= "exten => _{$app['extension']},$row" . "\n\t";
            } else {
                $app_data .= "same => $row" . "\n\t";
            }
        }

        return "$app_data\n";
    }

    /**
     * @param $app
     *
     * @return string
     */
    private function generatePhpApp($app): string
    {
        $agiBinDir = $this->config->path('asterisk.astagidir');
        $text_app     = "#!/usr/bin/php\n";
        $text_app     .= base64_decode($app['applicationlogic']);
        file_put_contents("{$agiBinDir}/{$app['uniqid']}.php", $text_app);
        chmod("{$agiBinDir}/{$app['uniqid']}.php", 0755);

        $result = 'exten => _' . $app['extension'] . ',1,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Gosub(set_orign_chan,s,1))' . "\n\t";
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
        $arrDialplanApplications = DialplanApplications::find()->toArray();
        foreach ($arrDialplanApplications as $app) {
            if(!is_numeric($app['extension'])){
                continue;
            }
            $conf .= "exten => {$app['extension']},hint,Custom:{$app['extension']} \n";
        }

        return $conf;
    }
}