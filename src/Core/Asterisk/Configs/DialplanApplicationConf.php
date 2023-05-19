<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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


/**
 * Represents the configuration class for Dialplan applications.
 * Generates the configuration content for extensions.conf.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class DialplanApplicationConf extends AsteriskConfigClass
{

    public int $priority = 550;


    /**
     * Retrieves the include statement for the internal context.
     *
     * @return string The include statement for the internal context.
     */
    public function getIncludeInternal(): string
    {
        return "include => applications \n";
    }

    /**
     * Generates additional contexts for dialplan applications.
     *
     * @return string The generated contexts for dialplan applications.
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
     * Generates the configuration for a plaintext application.
     *
     * @param array $app The dialplan application data.
     * @return string The generated configuration for the plaintext application.
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
     * Generates the configuration for a PHP application.
     *
     * @param array $app The dialplan application data.
     * @return string The generated configuration for the PHP application.
     */
    private function generatePhpApp($app): string
    {
        $agiBinDir = $this->config->path('asterisk.astagidir');

        // Create PHP script file for the application
        $text_app     = "#!/usr/bin/php\n";
        $text_app     .= base64_decode($app['applicationlogic']);
        file_put_contents("{$agiBinDir}/{$app['uniqid']}.php", $text_app);
        chmod("{$agiBinDir}/{$app['uniqid']}.php", 0755);

        // Generate the dialplan configuration for the PHP application
        $result = 'exten => _' . $app['extension'] . ',1,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Gosub(set_orign_chan,s,1))' . "\n\t";
        $result .= 'same => n,Gosub(dial_app,${EXTEN},1)' . "\n\t";
        $result .= "same => n,AGI({$app['uniqid']}.php)\n";

        return $result;
    }

    /**
     * Generates the extension hints configuration.
     *
     * @return string The generated extension hints configuration.
     */
    public function extensionGenHints(): string
    {
        $conf = '';
        $arrDialplanApplications = DialplanApplications::find()->toArray();
        foreach ($arrDialplanApplications as $app) {
            // Skip non-numeric extensions
            if(!is_numeric($app['extension'])){
                continue;
            }
            $conf .= "exten => {$app['extension']},hint,Custom:{$app['extension']} \n";
        }

        return $conf;
    }
}