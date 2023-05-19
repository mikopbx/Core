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
    public const OK = 200;
    public const CREATED = 201;
    public const ACCEPTED = 202;
    public const MOVED_PERMANENTLY = 301;
    public const FOUND = 302;
    public const TEMPORARY_REDIRECT = 307;
    public const PERMANENTLY_REDIRECT = 308;
    public const BAD_REQUEST = 400;
    public const UNAUTHORIZED = 401;
    public const FORBIDDEN = 403;
    public const NOT_FOUND = 404;
    public const INTERNAL_SERVER_ERROR = 500;
    public const NOT_IMPLEMENTED = 501;
    public const BAD_GATEWAY = 502;
    private $codes = [
        200 => 'OK',
        301 => 'Moved Permanently',
        302 => 'Found',
        307 => 'Temporary Redirect',
        308 => 'Permanent Redirect',
        400 => 'Bad Request',
        401 => 'Unauthorized',
        403 => 'Forbidden',
        404 => 'Not Found',
        500 => 'Internal Server Error',
        501 => 'Not Implemented',
        502 => 'Bad Gateway',
    ];

    /**
     * Get the description of the HTTP code or the code itself if not found.
     *
     * @param int $code
     * @return int|string
     */
    public function getHttpCodeDescription(int $code)
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
        $content   = $this->getContent()??'';
        $timestamp = date('c');
        $hash      = sha1($timestamp . $content);
        $eTag      = sha1($content);

        $content = json_decode($content, true);
        if(!is_array($content)){
            $content = [];
        }
        $jsonapi = [
            'jsonapi' => [
                'version' => '1.0',
            ],
        ];
        $meta    = [
            'meta' => [
                'timestamp' => $timestamp,
                'hash'      => $hash,
            ],
        ];

        /**
         * Join the array again
         */
        $data = $jsonapi + $content + $meta;
        $this
            ->setHeader('E-Tag', $eTag)
            ->setJsonContent($data);


        return parent::send();
    }

    /**
     * Set the payload code as Error.
     *
     * @param string $detail
     * @return Response
     */
    public function setPayloadError(string $detail = ''): Response
    {
        $this->setJsonContent(['errors' => [$detail]]);

        return $this;
    }

    /**
     * Traverse the errors collection and set the errors in the payload.
     *
     * @param Messages $errors
     * @return Response
     */
    public function setPayloadErrors($errors): Response
    {
        $data = [];
        foreach ($errors as $error) {
            $data[] = $error->getMessage();
        }

        $this->setJsonContent(['errors' => $data]);

        return $this;
    }

    /**
     * Set the payload code as Success.
     *
     * @param null|string|array $content
     * @return Response
     */
    public function setPayloadSuccess($content = []): Response
    {
        $data = (true === is_array($content)) ? $content : ['data' => $content];
        $this->setJsonContent($data);

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