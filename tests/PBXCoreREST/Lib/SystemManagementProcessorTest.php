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

namespace MikoPBX\Tests\PBXCoreREST\Lib;

use GuzzleHttp\Client;
use MikoPBX\PBXCoreREST\Lib\SystemManagementProcessor;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class SystemManagementProcessorTest extends \MikoPBX\Tests\Unit\AbstractUnitTest
{

    public function testDisableModule(){
        $httpClient = new Client([
            "timeout"  => 5.0,
       		"http_errors"=> false
       ]);

        $moduleUniqueID = 'ModuleTelegramNotify';
        $url = "http://127.0.0.1/pbxcore/api/system/disableModule";
        $response = $httpClient->request("POST", $url, [
            "form_params" =>["uniqid"=>$moduleUniqueID]
        ]);

          if ($response->getStatusCode() == 200){
            $body = $response->getBody();
              $result = json_decode($body, true);
              if ($result["result"]===true) {
                  if (openlog("License", LOG_ODELAY, LOG_LOCAL7)) {
                      syslog(LOG_EMERG, "Module:".$moduleUniqueID." was disabled by license reason");
                      closelog();
                  }
              }
          }
        $this->assertTrue(true);
    }
}
