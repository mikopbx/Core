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
 * Parameter location types for OpenAPI specification
 */
enum ParameterLocation: string
{
    case PATH = 'path';
    case QUERY = 'query';
    case HEADER = 'header';
    case COOKIE = 'cookie';
}

/**
 * Defines an API parameter with metadata for OpenAPI generation and validation
 *
 * This attribute is used to define parameters for API operations, providing
 * comprehensive metadata for automatic OpenAPI specification generation,
 * request validation, and documentation.
 *
 * @package MikoPBX\PBXCoreREST\Attributes
 */
#[Attribute(Attribute::TARGET_METHOD | Attribute::IS_REPEATABLE)]
class ApiParameter
{
    /**
     * @param string $name Parameter name
     * @param string $type Parameter type (string, integer, boolean, array, object)
     * @param string $description Parameter description
     * @param ParameterLocation $in Parameter location
     * @param bool $required Whether the parameter is required
     * @param mixed $default Default value
     * @param mixed $example Example value
     * @param array<mixed> $enum Allowed values (for enum parameters)
     * @param string|null $format Parameter format (date, date-time, email, etc.)
     * @param int|null $minimum Minimum value (for numeric parameters)
     * @param int|null $maximum Maximum value (for numeric parameters)
     * @param int|null $minLength Minimum length (for string parameters)
     * @param int|null $maxLength Maximum length (for string parameters)
     * @param string|null $pattern Regex pattern for validation
     * @param bool $deprecated Whether this parameter is deprecated
     * @param array<string, mixed> $schema Additional schema properties
     */
    public function __construct(
        public readonly string $name,
        public readonly string $type,
        public readonly string $description = '',
        public readonly ParameterLocation $in = ParameterLocation::QUERY,
        public readonly bool $required = false,
        public readonly mixed $default = null,
        public readonly mixed $example = null,
        public readonly array $enum = [],
        public readonly ?string $format = null,
        public readonly ?int $minimum = null,
        public readonly ?int $maximum = null,
        public readonly ?int $minLength = null,
        public readonly ?int $maxLength = null,
        public readonly ?string $pattern = null,
        public readonly bool $deprecated = false,
        public readonly array $schema = []
    ) {
    }

    /**
     * Convert to OpenAPI parameter format
     *
     * @return array<string, mixed>
     */
    public function toOpenApi(): array
    {
        $result = [
            'name' => $this->name,
            'in' => $this->in->value,
            'required' => $this->required,
            'schema' => [
                'type' => $this->type,
                ...$this->schema
            ]
        ];

        if (!empty($this->description)) {
            $result['description'] = $this->description;
        }

        if ($this->default !== null) {
            $result['schema']['default'] = $this->default;
        }

        if ($this->example !== null) {
            $result['example'] = $this->example;
        }

        if (!empty($this->enum)) {
            $result['schema']['enum'] = $this->enum;
        }

        if ($this->format !== null) {
            $result['schema']['format'] = $this->format;
        }

        if ($this->minimum !== null) {
            $result['schema']['minimum'] = $this->minimum;
        }

        if ($this->maximum !== null) {
            $result['schema']['maximum'] = $this->maximum;
        }

        if ($this->minLength !== null) {
            $result['schema']['minLength'] = $this->minLength;
        }

        if ($this->maxLength !== null) {
            $result['schema']['maxLength'] = $this->maxLength;
        }

        if ($this->pattern !== null) {
            $result['schema']['pattern'] = $this->pattern;
        }

        if ($this->deprecated) {
            $result['deprecated'] = true;
        }

        return $result;
    }

    /**
     * Get validation rules for this parameter
     *
     * @return array<string>
     */
    public function getValidationRules(): array
    {
        $rules = [];

        if ($this->required) {
            $rules[] = 'required';
        }

        $rules[] = $this->type;

        if ($this->minimum !== null) {
            $rules[] = "min:{$this->minimum}";
        }

        if ($this->maximum !== null) {
            $rules[] = "max:{$this->maximum}";
        }

        if ($this->minLength !== null) {
            $rules[] = "min_length:{$this->minLength}";
        }

        if ($this->maxLength !== null) {
            $rules[] = "max_length:{$this->maxLength}";
        }

        if (!empty($this->enum)) {
            $rules[] = 'in:' . implode(',', $this->enum);
        }

        if ($this->pattern !== null) {
            $rules[] = "regex:{$this->pattern}";
        }

        return $rules;
    }
}