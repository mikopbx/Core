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
 * Defines a REST API resource with metadata for OpenAPI generation and ACL configuration
 *
 * This attribute is used to mark REST controller classes and provide comprehensive
 * metadata for automatic OpenAPI specification generation, ACL rule creation,
 * and API documentation.
 *
 * @package MikoPBX\PBXCoreREST\Attributes
 */
#[Attribute(Attribute::TARGET_CLASS)]
class ApiResource
{
    /**
     * @param string $path Base API path for this resource (e.g., '/pbxcore/api/v3/api-keys')
     * @param array<string> $tags OpenAPI tags for grouping operations (e.g., ['Call Queues']). Will be auto-translated.
     * @param string $description Human-readable description of the resource
     * @param array<string> $security Default security requirements for all operations
     * @param string|null $processor Processor class name (if different from convention)
     * @param array<string, string> $schemas Additional schema definitions
     * @param bool $deprecated Whether this resource is deprecated
     * @param string|null $version API version (defaults to v3)
     * @param array<string, mixed> $extensions Custom OpenAPI extensions
     */
    public function __construct(
        public readonly string $path,
        public readonly array $tags = [],
        public readonly string $description = '',
        public readonly array $security = ['session'],
        public readonly ?string $processor = null,
        public readonly array $schemas = [],
        public readonly bool $deprecated = false,
        public readonly ?string $version = 'v3',
        public readonly array $extensions = []
    ) {
    }

    /**
     * Convert to OpenAPI format
     *
     * @return array<string, mixed>
     */
    public function toOpenApi(): array
    {
        $result = [
            'tags' => $this->tags,
            'security' => array_map(fn($sec) => [$sec => []], $this->security),
        ];

        if (!empty($this->description)) {
            $result['description'] = $this->description;
        }

        if ($this->deprecated) {
            $result['deprecated'] = true;
        }

        if (!empty($this->extensions)) {
            foreach ($this->extensions as $key => $value) {
                $result['x-' . $key] = $value;
            }
        }

        return $result;
    }

    /**
     * Extract ACL rules from this resource
     *
     * @return array<string, mixed>
     */
    public function getAclRules(): array
    {
        return [
            'resource' => $this->path,
            'security' => $this->security,
            'deprecated' => $this->deprecated,
        ];
    }
}