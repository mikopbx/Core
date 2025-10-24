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
 * Defines an API operation with metadata for OpenAPI generation and ACL configuration
 *
 * This attribute is used to mark controller methods and provide detailed
 * metadata for automatic OpenAPI specification generation, method-level ACL rules,
 * and operation documentation.
 *
 * @package MikoPBX\PBXCoreREST\Attributes
 */
#[Attribute(Attribute::TARGET_METHOD)]
class ApiOperation
{
    /**
     * @param string $summary Brief summary of the operation
     * @param string $description Detailed description of the operation
     * @param string|null $operationId Unique operation identifier (auto-generated if null)
     * @param array<string> $tags Tags for this specific operation (overrides resource tags)
     * @param array<string> $security Security requirements for this operation
     * @param bool $deprecated Whether this operation is deprecated
     * @param array<string, mixed> $parameters Parameters for this operation (raw array format)
     * @param array<ApiResponse> $responses Possible responses
     * @param array<string, mixed> $requestBody Request body schema
     * @param array<string, mixed> $extensions Custom OpenAPI extensions
     * @param array<string> $acl ACL permissions required for this operation
     * @param bool $requiresId Whether this operation requires a resource ID
     * @param bool $internal Whether this operation is for internal use only (excluded from OpenAPI)
     */
    public function __construct(
        public readonly string $summary,
        public readonly string $description = '',
        public readonly ?string $operationId = null,
        public readonly array $tags = [],
        public readonly array $security = [],
        public readonly bool $deprecated = false,
        public readonly array $parameters = [],
        public readonly array $responses = [],
        public readonly array $requestBody = [],
        public readonly array $extensions = [],
        public readonly array $acl = [],
        public readonly bool $requiresId = false,
        public readonly bool $internal = false
    ) {
    }

    /**
     * Convert to OpenAPI operation format
     *
     * @return array<string, mixed>
     */
    public function toOpenApi(string $defaultOperationId = ''): array
    {
        $result = [
            'summary' => $this->summary,
            'operationId' => $this->operationId ?? $defaultOperationId,
        ];

        if (!empty($this->description)) {
            $result['description'] = $this->description;
        }

        if (!empty($this->tags)) {
            $result['tags'] = $this->tags;
        }

        if (!empty($this->security)) {
            $result['security'] = array_map(fn($sec) => [$sec => []], $this->security);
        }

        if ($this->deprecated) {
            $result['deprecated'] = true;
        }

        if (!empty($this->parameters)) {
            $result['parameters'] = $this->parameters;
        }

        if (!empty($this->responses)) {
            $result['responses'] = [];
            foreach ($this->responses as $response) {
                $result['responses'][$response->statusCode] = $response->toOpenApi();
            }
        }

        if (!empty($this->requestBody)) {
            $result['requestBody'] = $this->requestBody;
        }

        if (!empty($this->extensions)) {
            foreach ($this->extensions as $key => $value) {
                $result['x-' . $key] = $value;
            }
        }

        return $result;
    }

    /**
     * Extract ACL rules from this operation
     *
     * @return array<string, mixed>
     */
    public function getAclRules(): array
    {
        return [
            'permissions' => $this->acl,
            'security' => $this->security,
            'requiresId' => $this->requiresId,
            'deprecated' => $this->deprecated,
        ];
    }
}