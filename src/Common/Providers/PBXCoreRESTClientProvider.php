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

declare(strict_types=1);

namespace MikoPBX\Common\Providers;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Psr7\Message;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * Represents a client for making REST API requests to PBX Core.
 *
 * @package MikoPBX\Common\Providers
 */
class PBXCoreRESTClientProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'restAPIClient';
    public const HTTP_METHOD_GET = 'GET';
    public const HTTP_METHOD_POST = 'POST';

    /**
     * Makes a REST API request.
     *
     * @param string $url - The API endpoint URL.
     * @param string $method - The HTTP method (default: 'GET').
     * @param array $data - Optional data to include in the request.
     * @param array $headers - Optional headers to include in the request.
     * @return PBXApiResult - The response from the API as PBXApiResult class.
     */
    private static function restApiRequest(string $url, string $method = self::HTTP_METHOD_GET, array $data = [], array $headers = []): PBXApiResult
    {
        $res = new PBXApiResult();

        // Modify request data according to http method
        switch ($method){
            case self::HTTP_METHOD_GET:
                $requestData = ['query'=>$data];
                break;
            case self::HTTP_METHOD_POST:
                if (isset($headers['Content-Type']) && $headers['Content-Type'] === 'application/json') {
                    $requestData = ['json' => $data];
                } else {
                    $requestData = ['form_params' => $data];
                }
                break;
            default:
                $requestData=$data;
        }
        $requestData['headers'] = $headers;

        // Get the web port from PbxSettings
        $webPort = PbxSettings::getValueByKey(PbxSettingsConstants::WEB_PORT);

        // Create a new HTTP client instance
        $client = new Client([
            'base_uri' => 'http://localhost:' . $webPort,
            'timeout' => 30,
            'allow_redirects' => true
        ]);

        try {
            // Send the request and get the response
            $response = $client->request($method, $url, $requestData);
            $body = (string)$response->getBody();
            $result = json_decode($body, true);
            $res->data = $result['data'] ?? [];
            $res->messages = $result['messages'] ?? ['error' => 'Unable to parse response from core rest api'];
            $res->success = $result['result'] ?? false;
        } catch (ClientException $e) {
            // Handle client exception
            $message = "Rest API request error " . Message::toString($e->getResponse());
            SystemMessages::sysLogMsg(__METHOD__, $message, LOG_DEBUG);
            $res->messages['error'][] = $message;
        } catch (\Throwable $e) {
            // Handle other exceptions and log using CriticalErrorsHandler
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }

    /**
     * Register the registry service provider.
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $di->set(
            self::SERVICE_NAME,
            function (string $url, string $method = self::HTTP_METHOD_GET, array $data = [], array $headers=[]): PBXApiResult {
                return self::restApiRequest($url, $method, $data, $headers);
            }
        );
    }
}