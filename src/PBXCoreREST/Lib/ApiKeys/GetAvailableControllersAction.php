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

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

/**
 * Action for getting available API controllers
 * 
 * @api {get} /pbxcore/api/v2/api-keys/getAvailableControllers Get available API controllers
 * @apiVersion 2.0.0
 * @apiName GetAvailableControllers
 * @apiGroup ApiKeys
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data List of available controllers
 */
class GetAvailableControllersAction
{
    /**
     * Get list of available API controllers
     * 
     * @param array $data Request data (not used)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        // Add syslog to ensure we see it
        openlog("GetAvailableControllersAction", LOG_PID | LOG_PERROR, LOG_LOCAL0);
        syslog(LOG_INFO, "Starting GetAvailableControllersAction::main");
        
        try {
            $scanner = new EndpointScanner();
            $controllers = $scanner->getAvailableControllers();
            
            syslog(LOG_INFO, "Retrieved " . count($controllers) . " controllers");
            
            $res->data = $controllers;
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            syslog(LOG_ERR, "Error: " . $e->getMessage());
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        closelog();
        return $res;
    }
}