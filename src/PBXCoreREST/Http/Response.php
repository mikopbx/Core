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

namespace MikoPBX\PBXCoreREST\Http;

use Phalcon\Http\Response as PhResponse;
use Phalcon\Http\ResponseInterface;
use Phalcon\Messages\Messages;

use function date;
use function json_decode;
use function sha1;

/**
 * Class Response
 * @package MikoPBX\PBXCoreREST\Http
 */
class Response extends PhResponse
{
    // HTTP Success codes
    public const int OK = 200;
    public const int CREATED = 201;
    public const int ACCEPTED = 202;

    // HTTP Client Error codes
    public const int BAD_REQUEST = 400;
    public const int UNAUTHORIZED = 401;
    public const int FORBIDDEN = 403;
    public const int NOT_FOUND = 404;
    public const int CONFLICT = 409;

    // HTTP Server Error codes
    public const int INTERNAL_SERVER_ERROR = 500;
    /**
     * HTTP status code descriptions for getHttpCodeDescription() method.
     * Only includes codes that are actively used in the codebase.
     * @var array<int, string>
     */
    private array $codes = [
        200 => 'OK',
        201 => 'Created',
        202 => 'Accepted',
        400 => 'Bad Request',
        401 => 'Unauthorized',
        403 => 'Forbidden',
        404 => 'Not Found',
        409 => 'Conflict',
        500 => 'Internal Server Error',
    ];

    /**
     * Get the description of the HTTP code or the code itself if not found.
     *
     * @param int $code
     * @return int|string
     */
    public function getHttpCodeDescription(int $code): int|string
    {
        if (true === isset($this->codes[$code])) {
            return sprintf('%d (%s)', $code, $this->codes[$code]);
        }

        return $code;
    }

    /**
     * Send the response.
     *
     * @return ResponseInterface
     */
    public function send(): ResponseInterface
    {
        $content   = $this->getContent() ?: '';
        $timestamp = date('c');
        $hash      = sha1($timestamp . $content);
        $eTag      = sha1($content);

        $decodedContent = json_decode($content, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($decodedContent)) {
            $decodedContent = [];
        }

        $meta    = [
            'meta' => [
                'timestamp' => $timestamp,
                'hash'      => $hash,
            ],
        ];

        /**
         * Join the array again
         */
        $data = array_merge($decodedContent, $meta);
        $this
            ->setHeader('E-Tag', $eTag)
            ->setJsonContent($data);


        return parent::send();
    }

    /**
     * Build error payload structure.
     *
     * @param array<int, string> $errorMessages Array of error messages
     * @return array<string, mixed> Error payload structure
     */
    private function buildErrorPayload(array $errorMessages): array
    {
        return [
            'result' => false,
            'data' => [],
            'messages' => ['error' => $errorMessages],
            'function' => '',
            'processor' => '',
            'pid' => getmypid()
        ];
    }

    /**
     * Set the payload code as Error.
     *
     * @param string $detail Error detail message
     * @param int $httpCode HTTP status code (default 400 Bad Request)
     * @return Response
     */
    public function setPayloadError(string $detail = '', int $httpCode = 400): Response
    {
        $this->setJsonContent($this->buildErrorPayload([$detail]));
        $this->setStatusCode($httpCode);

        return $this;
    }

    /**
     * Traverse the errors collection and set the errors in the payload.
     *
     * @param Messages $errors
     * @param int $httpCode HTTP status code (default 400 Bad Request)
     * @return Response
     */
    public function setPayloadErrors(Messages $errors, int $httpCode = 400): Response
    {
        $errorMessages = [];
        foreach ($errors as $error) {
            $errorMessages[] = $error->getMessage();
        }

        $this->setJsonContent($this->buildErrorPayload($errorMessages));
        $this->setStatusCode($httpCode);

        return $this;
    }

    /**
     * Set the payload code as Success.
     *
     * @param array<string, mixed>|string|null $content Response content
     * @param int $httpCode HTTP status code (default 200 OK)
     * @return Response
     */
    public function setPayloadSuccess(array|string|null $content = [], int $httpCode = 200): Response
    {
        $data = (true === is_array($content)) ? $content : ['data' => $content];
        $this->setJsonContent($data);
        $this->setStatusCode($httpCode);

        return $this;
    }

    /**
     * Send raw content without additional tags.
     *
     * @return ResponseInterface
     */
    public function sendRaw(): ResponseInterface
    {
        return parent::send();
    }
}
