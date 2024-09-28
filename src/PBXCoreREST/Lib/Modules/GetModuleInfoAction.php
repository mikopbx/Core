<?php

namespace MikoPBX\PBXCoreREST\Lib\Modules;

use GuzzleHttp;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 *  Class GetModuleInfo
 *  Retrieves module information from repository and stores the information in local cache
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class GetModuleInfoAction  extends Injectable
{
    public const string WRONG_MODULE_INFO = 'Wrong module info';


    /**
     * Retrieves module information from repository and store the information in local cache
     *
     * @param string $moduleUniqueID
     * @return PBXApiResult
     */
    public static function main(string $moduleUniqueID): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $di = Di::getDefault();
        if ($di === null) {
            $res->success    = false;
            $res->messages[] = 'Dependency injector does not initialized';
            return $res;
        }
        $WebUiLanguage = PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_LANGUAGE);
        $cacheKey = "ModulesManagementProcessor:GetModuleInfo:$moduleUniqueID:$WebUiLanguage";
        $managedCache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        if ($managedCache->has($cacheKey)){
            $body = $managedCache->get($cacheKey);
        } else {
            $PBXVersion = PbxSettings::getValueByKey(PbxSettings::PBX_VERSION);
            $PBXVersion = (string)str_ireplace('-dev', '', $PBXVersion);
            $body = '';
            $client = new GuzzleHttp\Client();
            try {
                $request = $client->request(
                    'POST',
                    'https://releases.mikopbx.com/releases/v1/mikopbx/getModuleInfo',
                    [
                        'headers' => [
                            'Content-Type' => 'application/json; charset=utf-8',
                        ],
                        'json' => [
                            'PBXVER' => $PBXVersion,
                            'LANGUAGE'=> $WebUiLanguage,
                            'GUID'=> $moduleUniqueID,
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
                SystemMessages::sysLogMsg(static::class, $e->getMessage());
                $res->messages[] = $e->getMessage();
            }

            if ($code !== Response::OK) {
                return $res;
            }
        }
        $result =  json_decode($body, true);
        if (array_key_exists('data', $result)) {
            $res->data = $result['data'];
            $res->success = true;
        } else {
            $res->success    = false;
            $res->messages[] = self::WRONG_MODULE_INFO;
        }

        return $res;
    }

}