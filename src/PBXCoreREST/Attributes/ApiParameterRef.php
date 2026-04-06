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
 * Reference to parameter definition from DataStructure
 *
 * This attribute references a parameter definition stored in DataStructure::getParameterDefinitions().
 * It allows defining parameters once in DataStructure and reusing them across multiple controller methods.
 *
 * The full parameter definition is retrieved from DataStructure at schema generation time,
 * and any overrides specified in this attribute are merged with the base definition.
 *
 * This approach provides:
 * - Single Source of Truth: Parameter definitions in DataStructure
 * - Lightweight attributes: Only parameter name + optional overrides
 * - DRY principle: No duplication of enum values, constraints, etc.
 * - Flexibility: Can override specific properties when needed
 *
 * Usage:
 * ```php
 * // In DataStructure.php:
 * public static function getParameterDefinitions(): array {
 *     return [
 *         'strategy' => [
 *             'type' => 'string',
 *             'description' => 'rest_param_cq_strategy',
 *             'enum' => ['ringall', 'leastrecent', 'fewestcalls', ...],
 *             'default' => 'ringall',
 *             'example' => 'ringall'
 *         ],
 *         // ... other parameters
 *     ];
 * }
 *
 * // In RestController.php:
 * #[ApiParameterRef('strategy')]  // Uses all defaults from controller's DataStructure
 * #[ApiParameterRef('name', required: true)]  // Override required flag
 * #[ApiParameterRef('strategy', example: 'leastrecent')]  // Override example
 *
 * // Reference parameters from CommonDataStructure:
 * use MikoPBX\PBXCoreREST\Lib\Common\CommonDataStructure;
 * #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class)]
 * #[ApiParameterRef('offset', dataStructure: CommonDataStructure::class)]
 * #[ApiParameterRef('order', dataStructure: CommonDataStructure::class, enum: ['name', 'extension'])]
 * public function create(): void {}
 * ```
 *
 * @package MikoPBX\PBXCoreREST\Attributes
 */
#[Attribute(Attribute::TARGET_METHOD | Attribute::IS_REPEATABLE)]
class ApiParameterRef
{
    /**
     * @param string $parameterName Name of parameter from DataStructure::getParameterDefinitions()
     * @param string|null $dataStructure Fully qualified class name of DataStructure to reference (null = controller's DataStructure)
     * @param ParameterLocation|null $in Override parameter location (query/path/header)
     * @param bool|null $required Override required flag
     * @param mixed|null $default Override default value
     * @param mixed|null $example Override example value
     * @param int|null $minimum Override minimum value (for numeric types)
     * @param int|null $maximum Override maximum value (for numeric types)
     * @param int|null $maxLength Override maximum length (for strings)
     * @param string|null $pattern Override validation pattern (for strings)
     * @param array<string>|null $enum Override enum values
     * @param string|null $description Override description
     */
    public function __construct(
        public readonly string $parameterName,
        public readonly ?string $dataStructure = null,
        public readonly ?ParameterLocation $in = null,
        public readonly ?bool $required = null,
        public readonly mixed $default = null,
        public readonly mixed $example = null,
        public readonly ?int $minimum = null,
        public readonly ?int $maximum = null,
        public readonly ?int $maxLength = null,
        public readonly ?string $pattern = null,
        public readonly ?array $enum = null,
        public readonly ?string $description = null
    ) {
    }

    /**
     * Get overrides as array
     *
     * Returns only non-null override values to be merged with base definition.
     *
     * @return array<string, mixed> Override values
     */
    public function getOverrides(): array
    {
        $overrides = [];

        if ($this->in !== null) {
            $overrides['in'] = $this->in;
        }
        if ($this->required !== null) {
            $overrides['required'] = $this->required;
        }
        if ($this->default !== null) {
            $overrides['default'] = $this->default;
        }
        if ($this->example !== null) {
            $overrides['example'] = $this->example;
        }
        if ($this->minimum !== null) {
            $overrides['minimum'] = $this->minimum;
        }
        if ($this->maximum !== null) {
            $overrides['maximum'] = $this->maximum;
        }
        if ($this->maxLength !== null) {
            $overrides['maxLength'] = $this->maxLength;
        }
        if ($this->pattern !== null) {
            $overrides['pattern'] = $this->pattern;
        }
        if ($this->enum !== null) {
            $overrides['enum'] = $this->enum;
        }
        if ($this->description !== null) {
            $overrides['description'] = $this->description;
        }

        return $overrides;
    }
}
