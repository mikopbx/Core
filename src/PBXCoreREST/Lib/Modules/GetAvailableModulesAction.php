<?php

namespace MikoPBX\PBXCoreREST\Lib\Modules;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di;
use GuzzleHttp;

/**
 *  Class GetAvailableModules
 *  Request new modules form repository and store the information in local cache
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class GetAvailableModulesAction  extends \Phalcon\Di\Injectable
{
    /**
     * Retrieves available modules on MIKO repository.
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $di = Di::getDefault();
        if ($di === null) {
            $res->success    = false;
            $res->messages[] = 'Dependency injector does not initialized';
            return $res;
        }
        $WebUiLanguage = PbxSettings::getValueByKey(PbxSettingsConstants::WEB_ADMIN_LANGUAGE);
        $cacheKey = "ModulesManagementProcessor:GetAvailableModules:$WebUiLanguage";
        $managedCache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        if ($managedCache->has($cacheKey)){
            $body = $managedCache->get($cacheKey);
        } else {
            $PBXVersion = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_VERSION);
            $PBXVersion = (string)str_ireplace('-dev', '', $PBXVersion);
            $body = '';
            $client = new GuzzleHttp\Client();
            try {
                $request = $client->request(
                    'POST',
                    'https://releases.mikopbx.com/releases/v1/mikopbx/getAvailableModules',
                    [
                        'headers' => [
                            'Content-Type' => 'application/json; charset=utf-8',
                        ],
                        'json' => [
                            'PBXVER' => $PBXVersion,
                            'LANGUAGE'=> $WebUiLanguage,
                        ],
                        'timeout' => 5,
                    ]
                );
                $code = $request->getStatusCode();
                if ($code === Response::OK){
                    $body = $request->getBody()->getContents();
                    $managedCache->set($cacheKey, $body, 3600);
                }
            } catch (\Throwable $e) {
                $code = Response::INTERNAL_SERVER_ERROR;
                Util::sysLogMsg(static::class, $e->getMessage());
                $res->messages[] = $e->getMessage();
            }

            if ($code !== Response::OK) {
                return $res;
            }
        }
        $res->data = json_decode($body, true)??[];
        $res->success = true;

        return $res;
    }

}