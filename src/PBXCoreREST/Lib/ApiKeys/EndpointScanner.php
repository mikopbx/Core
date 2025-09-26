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

namespace MikoPBX\PBXCoreREST\Lib\ApiKeys;

use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di\Di;

/**
 * Endpoint scanner for API controllers
 * 
 * Scans available REST API controllers to get @RoutePrefix values
 * for API key path restrictions
 */
class EndpointScanner
{
    /**
     * List of excluded controllers that should never be accessible via API keys
     * These endpoints are for internal use only and should only be accessible
     * through authenticated browser sessions.
     * 
     * Security note: These controllers are also blocked at validation level
     * in TokenValidationService::checkPathPermissions()
     */
    private const EXCLUDED_CONTROLLERS = [
        'UserPageTracker',  // Internal user activity tracking (browser sessions only)
        'Nchan',          // WebSocket/SSE event streaming (real-time events)
    ];
    
    /**
     * Get list of available API controller routes (@RoutePrefix values)
     * 
     * @return array List of controller routes with their descriptions
     */
    public function getAvailableControllers(): array
    {
        $controllers = [];
        
        // Get path to controllers directory
        $basePath = dirname(__FILE__, 3) . '/Controllers';
        
        if (!is_dir($basePath)) {
            SystemMessages::sysLogMsg(__CLASS__, "EndpointScanner: Controllers path not found: $basePath", LOG_WARNING);
            return [];
        }
        
        // Scan directory for controller folders
        $directories = scandir($basePath);
        
        foreach ($directories as $dir) {
            if ($dir === '.' || $dir === '..' || !is_dir($basePath . '/' . $dir)) {
                continue;
            }
            
            // Skip excluded controllers
            if (in_array($dir, self::EXCLUDED_CONTROLLERS)) {
                continue;
            }
            
            // Check if directory has controller files
            if ($this->hasControllerFiles($basePath . '/' . $dir)) {
                $controllers[] = [
                    'name' => $dir,
                    'path' => '/pbxcore/api/' . $this->convertToRouteName($dir),
                    'description' => $this->getControllerDescription($dir)
                ];
            }
        }
        
        // Add modules endpoint
        $controllers[] = [
            'name' => 'Modules',
            'path' => '/pbxcore/api/modules',
            'description' => $this->getControllerDescription('Modules')
        ];
        
        // Sort by name
        usort($controllers, function($a, $b) {
            return strcasecmp($a['name'], $b['name']);
        });
        
        return $controllers;
    }
    
    /**
     * Check if directory has controller files
     * 
     * @param string $controllerPath Path to controller directory
     * @return bool True if has controller files
     */
    private function hasControllerFiles(string $controllerPath): bool
    {
        $files = glob($controllerPath . '/*Controller.php');
        return !empty($files);
    }
    
    /**
     * Convert directory name to route name
     * 
     * @param string $dirName Directory name
     * @return string Route name
     */
    private function convertToRouteName(string $dirName): string
    {
        // Convert CamelCase to kebab-case
        $routeName = preg_replace('/([a-z])([A-Z])/', '$1-$2', $dirName);
        return strtolower($routeName);
    }
    
    /**
     * Get controller description
     * 
     * @param string $controllerName Controller name
     * @return string Description
     */
    private function getControllerDescription(string $controllerName): string
    {
        // Get translation for the controller
        $di = Di::getDefault();
        if ($di && $di->has(TranslationProvider::SERVICE_NAME)) {
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            return $translation->_('ak_Endpoint' . $controllerName);
        }
        
        // Fallback if no DI (shouldn't happen in normal operation)
        return $controllerName;
    }
}