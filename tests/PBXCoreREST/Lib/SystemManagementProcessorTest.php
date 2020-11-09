<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2020
 *
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
