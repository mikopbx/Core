<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\Modules\Pipeline;

use RuntimeException;

/**
 * Class PipelineStepException
 *
 * Aborts the install pipeline from a stage, carrying the structured
 * PBXApiResult::messages payload of the failed step.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules\Pipeline
 */
class PipelineStepException extends RuntimeException
{
    /**
     * @param array $stepMessages PBXApiResult::messages formatted payload
     */
    public function __construct(private readonly array $stepMessages)
    {
        parent::__construct(json_encode($stepMessages, JSON_UNESCAPED_UNICODE) ?: 'Pipeline step failed');
    }

    /**
     * @return array PBXApiResult::messages formatted payload
     */
    public function getStepMessages(): array
    {
        return $this->stepMessages;
    }
}
