<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Models\AsteriskRestUsers;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\PasswordService;

/**
 * Class AriConf
 *
 * Represents the configuration for ari.conf (Asterisk REST Interface).
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class AriConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'ari.conf';
    
    /**
     * Get list of ARI and Stasis modules in dependency order.
     * 
     * @return array List of module names
     */
    public static function getAriModules(): array
    {
        return [
            // Stasis modules (base functionality)
            'res_stasis.so',
            'res_stasis_answer.so',
            'res_stasis_device_state.so',
            'res_stasis_playback.so',
            'res_stasis_recording.so',
            'res_stasis_snoop.so',
            // ARI modules
            'res_ari.so',
            'res_ari_model.so',
            'res_ari_applications.so',
            'res_ari_asterisk.so',
            'res_ari_bridges.so',
            'res_ari_channels.so',
            'res_ari_device_states.so',
            'res_ari_endpoints.so',
            'res_ari_events.so',
            'res_ari_playbacks.so',
            'res_ari_recordings.so',
            'res_ari_sounds.so',
        ];
    }

    /**
     * Generates the configuration for ari.conf.
     */
    protected function generateConfigProtected(): void
    {
        $ariEnabled = PbxSettings::getValueByKey(PbxSettings::ARI_ENABLED) === '1';
        $allowedOrigins = PbxSettings::getValueByKey(PbxSettings::ARI_ALLOWED_ORIGINS);
        
        // If ARI is disabled, create minimal config
        if (!$ariEnabled) {
            $conf = "[general]\n";
            $conf .= "enabled = no\n\n";
            $this->saveConfig($conf, $this->description);
            return;
        }

        // Generate the configuration content
        $conf = "[general]\n";
        $conf .= "enabled = yes\n";
        $conf .= "pretty = yes\n"; // Pretty-print JSON responses
        
        // Configure allowed origins for CORS
        if (!empty($allowedOrigins) && $allowedOrigins !== '*') {
            // Split by comma and trim spaces
            $origins = array_map('trim', explode(',', $allowedOrigins));
            foreach ($origins as $origin) {
                $conf .= "allowed_origins = {$origin}\n";
            }
        } else {
            // Allow all origins
            $conf .= "allowed_origins = *\n";
        }
        
        $conf .= "\n";

        // Fetch all ARI users (no enabled field in this model)
        /** @var AsteriskRestUsers[] $users */
        $users = AsteriskRestUsers::find();

        // Generate configuration for each ARI user
        foreach ($users as $user) {
            $conf .= "[{$user->username}]\n";
            $conf .= "type = user\n";
            $conf .= "password = {$user->password}\n";
            $conf .= "password_format = plain\n"; // Using plain text passwords
            
            // Add read-only flag if needed (for monitoring users)
            // $conf .= "read_only = no\n";
            
            // Note: Application filtering is done at connection time,
            // not in the config file. The 'app' parameter in the WebSocket URL
            // determines which Stasis application(s) the connection can access.
            // We store allowed applications in the database for validation
            // but don't add them to ari.conf
            
            $conf .= "\n";
        }

        // Add default user for internal use (used by MikoPBX core)
        $conf .= "[pbxcore]\n";
        $conf .= "type = user\n";
        $conf .= "password = " . PasswordService::generate(['length' => 32, 'includeSpecial' => true]) . "\n";
        $conf .= "password_format = plain\n";
        // pbxcore user has access to all applications
        $conf .= "\n";

        // Call the hook modules method for generating additional configuration
        $hookResult = $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_ARI_CONF);
        if (!empty($hookResult)) {
            $conf .= $hookResult;
        }

        // Write the configuration content to the file
        $this->saveConfig($conf, $this->description);
    }
    
    /**
     * Reloads ARI modules in Asterisk.
     * Handles both enabling and disabling of ARI.
     *
     * @return void
     */
    public static function reload(): void
    {
        // First generate the configuration
        $ariConf = new self();
        $ariConf->generateConfig();

        $ariEnabled = PbxSettings::getValueByKey(PbxSettings::ARI_ENABLED) === '1';
        $arr_out = [];
        $asterisk = Util::which('asterisk');

        if ($ariEnabled) {
            // ARI is enabled - load/reload modules

            // Try to reload modules first, if they fail - load them
            Processes::mwExec("$asterisk -rx 'module reload res_ari'", $arr_out);
            if (!empty($arr_out) && strpos(implode('', $arr_out), 'No such module') !== false) {
                // Module not loaded, need to reload modules.conf first
                $modulesConf = new ModulesConf();
                $modulesConf->generateConfig();
                Processes::mwExec("$asterisk -rx 'module reload'", $arr_out);
            }

            // Also reload HTTP websocket module as ARI depends on it
            Processes::mwExec("$asterisk -rx 'module reload res_http_websocket'", $arr_out);
        } else {
            // ARI is disabled - unload ARI modules
            // Get modules in reverse order for proper dependency handling
            $ariModules = array_reverse(self::getAriModules());

            // Unload each module
            foreach ($ariModules as $module) {
                Processes::mwExec("$asterisk -rx 'module unload $module'", $arr_out);
            }

            // Regenerate modules.conf to remove ARI modules from autoload
            $modulesConf = new ModulesConf();
            $modulesConf->generateConfig();
        }
    }
}