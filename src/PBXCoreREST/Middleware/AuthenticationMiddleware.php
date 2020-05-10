<?php

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Middleware;

use MikoPBX\PBXCoreREST\Http\Request;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Traits\ResponseTrait;
use Phalcon\Mvc\Micro;
use Phalcon\Mvc\Micro\MiddlewareInterface;

/**
 * Class AuthenticationMiddleware
 */
class AuthenticationMiddleware implements MiddlewareInterface
{
    use ResponseTrait;

    /**
     * Call me
     *
     * @param Micro $api
     *
     * @return bool
     */
    public function call(Micro $api)
    {
        /** @var Request $request */
        $request = $api->getService('request');
        /** @var Response $response */
        $response = $api->getService('response');

        if (
            true !== $request->isLocalHostRequest()
            && true !== $request->isAuthorizedSessionRequest()
            && true !== $request->isDebugModeEnabled()
            && true !== $this->isCTIClientSessionRequest($api) //TODO::Перенести в модуль панели 1
        ) {
            $this->halt(
                $api,
                $response::OK,
                'Invalid Token'
            );

            return false;
        }

        return true;
    }

    public function isCTIClientSessionRequest(Micro $api): bool
    {
        // Исключения дла авторизации.content-disposition
        $panel_pattern = [
            '/api/miko_ajam/getvar', // Тут авторизация basic
            '/api/cdr/records',      // Тут авторизация basic
            '/api/cdr/playback',     // Защищен fail2ban
            '/api/cdr/getData',
        ];
        // Текущий паттерн.
        $pattern  = $api->getRouter()->getRewriteUri();
        $res_auth = true;
        // Проверяем авторизацию.
        if (preg_match_all('/\/api\/modules\/Module\w*\/customAction\S*/m', $pattern) > 0) {
            // Это сервисы модулей.
        } elseif ( ! in_array($pattern, $panel_pattern, true)) {
            $res_auth = false;
        }

        return $res_auth;
    }

}