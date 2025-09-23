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

namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetForSelectAction;

/**
 * Action for getting providers list formatted for dropdown selects
 *
 * Extends AbstractGetForSelectAction to leverage:
 * - Standard select data formatting
 * - Filtering capabilities
 * - Empty/none option support
 * - Consistent error handling
 *
 * @api {get} /pbxcore/api/v2/providers/getForSelect Get providers for select dropdown
 * @apiVersion 2.0.0
 * @apiName GetForSelect
 * @apiGroup Providers
 *
 * @apiParam {String} [type] Provider type filter (SIP/IAX)
 * @apiParam {Boolean} [includeDisabled=false] Include disabled providers
 * @apiParam {Boolean} [includeNone=false] Include "Any Provider" (none) option for incoming routes
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data List of providers for dropdown
 * @apiSuccess {String} data.value Provider ID
 * @apiSuccess {String} data.text Provider representation with HTML
 * @apiSuccess {String} data.name Provider representation (same as text)
 * @apiSuccess {String} data.type Provider type (SIP/IAX/ALL)
 * @apiSuccess {Boolean} data.disabled Disabled status
 */
class GetForSelectAction extends AbstractGetForSelectAction
{
    /**
     * Get providers list for dropdown select
     *
     * @param array $data Request parameters
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        // Custom "Any Provider" text for includeNone option
        if (isset($data['includeNone']) && filter_var($data['includeNone'], FILTER_VALIDATE_BOOLEAN)) {
            $di = \Phalcon\Di\Di::getDefault();
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            $data['noneText'] = '<i class="globe icon"></i> ' .
                ($translation->_('ir_AnyProvider_v2') ?: 'Any Provider');
        }

        return self::executeStandardGetForSelect(
            Providers::class,
            $data,
            'getRepresent',            // Use getRepresent() method for display
            ['type'],                  // Allowed filters
            '',                        // No ordering (will be sorted in custom transform)
            'uniqid',                  // Use uniqid as value
            ['type'],                  // Include type in response
            self::createProviderTransform()  // Custom transform for provider-specific logic
        );
    }

    /**
     * Create custom transform function for providers
     *
     * @return callable
     */
    private static function createProviderTransform(): callable
    {
        return function ($provider) {
            // Check if provider is disabled based on type
            $isDisabled = false;
            if ($provider->type === 'SIP' && $provider->Sip) {
                $isDisabled = $provider->Sip->disabled === '1';
            } elseif ($provider->type === 'IAX' && $provider->Iax) {
                $isDisabled = $provider->Iax->disabled === '1';
            }

            $represent = $provider->getRepresent();

            // Add status indicator to representation if disabled
            if ($isDisabled) {
                $di = \Phalcon\Di\Di::getDefault();
                $translation = $di->get(TranslationProvider::SERVICE_NAME);
                $disabledText = $translation->_('pr_Disabled') ?: 'Disabled';
                $represent .= ' <span class="ui red text">(' . $disabledText . ')</span>';
            }

            return [
                'value' => $provider->uniqid,
                'text' => $represent,
                'name' => $represent,
                'id' => $provider->uniqid,
                'type' => $provider->type,
                'disabled' => $isDisabled
            ];
        };
    }
}