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
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Psr7\Message;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * Represents a client for making REST API requests to PBX Core.
 *
 * Supports full RESTful API v3 with GET, POST, PUT, PATCH, DELETE methods.
 *
 * Examples of usage:
 *
 * // GET request - retrieve a resource
 * $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
 *     '/pbxcore/api/v3/extensions/101',
 *     PBXCoreRESTClientProvider::HTTP_METHOD_GET
 * ]);
 *
 * // POST request - create a new resource
 * $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
 *     '/pbxcore/api/v3/extensions',
 *     PBXCoreRESTClientProvider::HTTP_METHOD_POST,
 *     ['number' => '102', 'username' => 'John'],
 *     ['Content-Type' => 'application/json']
 * ]);
 *
 * // PUT request - fully update a resource
 * $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
 *     '/pbxcore/api/v3/extensions/102',
 *     PBXCoreRESTClientProvider::HTTP_METHOD_PUT,
 *     ['number' => '102', 'username' => 'John Doe', 'email' => 'john@example.com'],
 *     ['Content-Type' => 'application/json']
 * ]);
 *
 * // PATCH request - partially update a resource
 * $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
 *     '/pbxcore/api/v3/extensions/102',
 *     PBXCoreRESTClientProvider::HTTP_METHOD_PATCH,
 *     ['email' => 'newemail@example.com'],
 *     ['Content-Type' => 'application/json']
 * ]);
 *
 * // DELETE request - remove a resource
 * $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
 *     '/pbxcore/api/v3/extensions/102',
 *     PBXCoreRESTClientProvider::HTTP_METHOD_DELETE
 * ]);
 *
 * // Custom method on singleton resource
 * $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
 *     '/pbxcore/api/v3/system:datetime',
 *     PBXCoreRESTClientProvider::HTTP_METHOD_GET
 * ]);
 *
 * // Legacy API (deprecated)
 * $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
 *     '/pbxcore/api/extensions/getRecord',
 *     PBXCoreRESTClientProvider::HTTP_METHOD_GET,
 *     ['id' => $id]
 * ]);
 *
 * // Event publishing (nchan)
 * $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
 *     '/pbxcore/api/nchan/pub/' . self::CHANNEL_ID,
 *     PBXCoreRESTClientProvider::HTTP_METHOD_POST,
 *     ['type' => $type, 'data' => $data],
 *     ['Content-Type' => 'application/json']
 * ]);
 *
 * @package MikoPBX\Common\Providers
 */
class PBXCoreRESTClientProvider implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'restAPIClient';
    public const string HTTP_METHOD_GET = 'GET';
    public const string HTTP_METHOD_POST = 'POST';
    public const string HTTP_METHOD_PUT = 'PUT';
    public const string HTTP_METHOD_PATCH = 'PATCH';
    public const string HTTP_METHOD_DELETE = 'DELETE';

    /**
     * Makes a REST API request.
     *
     * @param string $url - The API endpoint URL.
     * @param string $method - The HTTP method (default: 'GET').
     * @param array<string, mixed> $data - Optional data to include in the request.
     * @param array<string, string> $headers - Optional headers to include in the request.
     * @return PBXApiResult - The response from the API as PBXApiResult class.
     */
    private static function restApiRequest(string $url, string $method = self::HTTP_METHOD_GET, array $data = [], array $headers = []): PBXApiResult
    {
        $res = new PBXApiResult();

        // Modify request data according to http method
        switch ($method){
            case self::HTTP_METHOD_GET:
            case self::HTTP_METHOD_DELETE:
                $requestData = ['query'=>$data];
                break;
            case self::HTTP_METHOD_POST:
            case self::HTTP_METHOD_PUT:
            case self::HTTP_METHOD_PATCH:
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
        $webPort = PbxSettings::getValueByKey(PbxSettings::WEB_PORT);

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
            
            // Special handling for nchan endpoints
            if (strpos($url, '/nchan/pub/') !== false) {
                // nchan endpoints return plain text, not JSON
                // Success is indicated by HTTP 201 status code
                if ($response->getStatusCode() === 201) {
                    $res->success = true;
                    $res->data = ['body' => $body];
                    $res->messages = ['info' => ['Message published successfully']];
                } else {
                    $res->success = false;
                    $res->messages = ['error' => ['Failed to publish message, status: ' . $response->getStatusCode()]];
                }
                return $res;
            }
            
            $result = json_decode($body, true);
            $res->data = $result['data'] ?? [];
            $res->messages = $result['messages'] ?? ['error' => 'Unable to parse response from core rest api'];
            $res->success = $result['result'] ?? false;
        } catch (ConnectException $e) {
            // Handle connection errors (empty reply, connection refused, etc.)
            // These are expected during startup/restart and should not generate critical errors
            $message = "REST API connection error: " . $e->getMessage() . " for URL: " . $url;
            SystemMessages::sysLogMsg(__METHOD__, $message, LOG_WARNING);
            $res->messages['error'][] = 'REST API service temporarily unavailable';
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
            /**
             * @param array<string, mixed> $data
             * @param array<string, string> $headers
             */
            function (string $url, string $method = self::HTTP_METHOD_GET, array $data = [], array $headers=[]): PBXApiResult {
                return self::restApiRequest($url, $method, $data, $headers);
            }
        );
    }
}