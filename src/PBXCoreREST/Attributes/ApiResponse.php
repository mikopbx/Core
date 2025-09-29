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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Attributes;

use Attribute;

/**
 * Defines an API response with metadata for OpenAPI generation
 *
 * This attribute is used to define possible responses for API operations,
 * providing comprehensive metadata for automatic OpenAPI specification generation
 * and response documentation.
 *
 * @package MikoPBX\PBXCoreREST\Attributes
 */
#[Attribute(Attribute::TARGET_METHOD | Attribute::IS_REPEATABLE)]
class ApiResponse
{
    /**
     * @param int $statusCode HTTP status code
     * @param string $description Response description
     * @param string|null $schema Response schema class name or reference
     * @param array<string, mixed> $content Response content type mapping
     * @param array<string, mixed> $headers Response headers
     * @param mixed $example Example response
     * @param array<string, mixed> $examples Multiple response examples
     * @param array<string, mixed> $extensions Custom OpenAPI extensions
     */
    public function __construct(
        public readonly int $statusCode,
        public readonly string $description,
        public readonly ?string $schema = null,
        public readonly array $content = [],
        public readonly array $headers = [],
        public readonly mixed $example = null,
        public readonly array $examples = [],
        public readonly array $extensions = []
    ) {
    }

    /**
     * Convert to OpenAPI response format
     *
     * @return array<string, mixed>
     */
    public function toOpenApi(): array
    {
        $result = [
            'description' => $this->description,
        ];

        // Add content if schema or content is specified
        if ($this->schema !== null || !empty($this->content)) {
            $result['content'] = $this->buildContent();
        }

        if (!empty($this->headers)) {
            $result['headers'] = $this->headers;
        }

        if (!empty($this->extensions)) {
            foreach ($this->extensions as $key => $value) {
                $result['x-' . $key] = $value;
            }
        }

        return $result;
    }

    /**
     * Build content section for OpenAPI response
     *
     * @return array<string, mixed>
     */
    private function buildContent(): array
    {
        if (!empty($this->content)) {
            return $this->content;
        }

        $content = [
            'application/json' => []
        ];

        if ($this->schema !== null) {
            $content['application/json']['schema'] = [
                '$ref' => "#/components/schemas/{$this->schema}"
            ];
        }

        if ($this->example !== null) {
            $content['application/json']['example'] = $this->example;
        }

        if (!empty($this->examples)) {
            $content['application/json']['examples'] = $this->examples;
        }

        return $content;
    }

    /**
     * Get standard success response
     */
    public static function success(string $description = 'Success', ?string $schema = null): self
    {
        return new self(200, $description, $schema);
    }

    /**
     * Get standard created response
     */
    public static function created(string $description = 'Created', ?string $schema = null): self
    {
        return new self(201, $description, $schema);
    }

    /**
     * Get standard no content response
     */
    public static function noContent(string $description = 'No Content'): self
    {
        return new self(204, $description);
    }

    /**
     * Get standard bad request response
     */
    public static function badRequest(string $description = 'Bad Request'): self
    {
        return new self(400, $description, 'ErrorResponse');
    }

    /**
     * Get standard unauthorized response
     */
    public static function unauthorized(string $description = 'Unauthorized'): self
    {
        return new self(401, $description, 'ErrorResponse');
    }

    /**
     * Get standard forbidden response
     */
    public static function forbidden(string $description = 'Forbidden'): self
    {
        return new self(403, $description, 'ErrorResponse');
    }

    /**
     * Get standard not found response
     */
    public static function notFound(string $description = 'Not Found'): self
    {
        return new self(404, $description, 'ErrorResponse');
    }

    /**
     * Get standard server error response
     */
    public static function serverError(string $description = 'Internal Server Error'): self
    {
        return new self(500, $description, 'ErrorResponse');
    }
}