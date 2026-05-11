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

namespace MikoPBX\PBXCoreREST\Controllers\FirewallBouncer;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\FirewallBouncerManagementProcessor;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiResponse,
    HttpMapping,
    SecurityType,
    ResourceSecurity
};

/**
 * Firewall Bouncer API — external enforcement bridge (v3 API)
 *
 * Serves the list of currently-active ban decisions in a format
 * compatible with the CrowdSec Local API (LAPI). Designed to be polled
 * by external bouncers (cs-firewall-bouncer, cs-cloudflare-bouncer,
 * cs-nginx-bouncer, …) that translate the decisions into real host
 * iptables rules, cloud security groups, or CDN edge policies.
 *
 * **Route topology (LAPI-canonical):**
 *
 *   - `GET /pbxcore/api/v3/firewall-bouncer/v1/decisions/stream` —
 *     full decision snapshot in the exact shape stock cs-firewall-bouncer
 *     expects (top-level `{new: [...], deleted: []}`, no envelope).
 *   - `GET /pbxcore/api/v3/firewall-bouncer/v1/whitelist` —
 *     operator-defined allow-list as a flat JSON array. Custom MikoPBX
 *     extension; stock cs-firewall-bouncer ignores it and uses its own
 *     `whitelists.yaml`. For integrations that want to consume our
 *     whitelist server-side.
 *
 * These literal multi-segment paths are mounted in
 * {@see \MikoPBX\PBXCoreREST\Providers\RouterProvider::SPECIAL_ROUTES}
 * because the universal `:method` discovery cannot express them.
 *
 * **Auth:** `Authorization: Bearer <token>` is the canonical form, but the
 * controller also accepts `X-Api-Key: <token>` (the CrowdSec convention) —
 * see {@see \MikoPBX\PBXCoreREST\Http\Request::getBearerToken()}.
 *
 * Lives on its own resource path `/firewall-bouncer` (not under
 * `/firewall`) because {@see \MikoPBX\PBXCoreREST\Services\ApiKeyPermissionChecker}
 * strips `:method` suffixes before the lookup, so per-method scoping inside
 * `/firewall` would either over-grant (read access to all firewall endpoints
 * including admin operations) or be unenforceable. A dedicated path lets
 * the bouncer preset grant exactly `firewall-bouncer:read` and nothing else.
 *
 * Why this endpoint exists: in Docker bridge mode, MikoPBX cannot manage
 * host iptables, and Nginx ACLs see docker0 gateway instead of the real
 * client IP. The Firewall UI is therefore non-functional for HTTP. SIP
 * fail2ban still works (Asterisk sees real IP via UDP DNAT,
 * `module reload acl`). This endpoint closes the HTTP gap by letting an
 * external bouncer enforce on the host firewall using the same decision
 * set the SIP path already produces.
 *
 * @examples
 *
 *   # Standard cs-firewall-bouncer config (api_url is the BASE, the bouncer
 *   # appends /v1/decisions/stream itself; api_key is sent as X-Api-Key):
 *   #
 *   api_url: http://pbx/pbxcore/api/v3/firewall-bouncer/
 *   api_key: <bouncer-token>
 *   update_frequency: 10s
 *
 *   # Manual probe (Bearer form, equivalent):
 *   curl -H "Authorization: Bearer <bouncer-token>" \
 *        "http://pbx/pbxcore/api/v3/firewall-bouncer/v1/decisions/stream?startup=true"
 *
 * @package MikoPBX\PBXCoreREST\Controllers\FirewallBouncer
 */
#[ApiResource(
    path: '/pbxcore/api/v3/firewall-bouncer',
    tags: ['Firewall'],
    description: 'rest_FirewallBouncer_ApiDescription',
    processor: FirewallBouncerManagementProcessor::class
)]
#[ResourceSecurity(
    'firewall_bouncer',
    requirements: [SecurityType::BEARER_TOKEN],
    description: 'rest_security_bearer'
)]
// Declared so the resource appears in `GetSimplifiedPermissionsAction` output and
// the API-key permission selector renders a `/api/v3/firewall-bouncer` row that
// the `?preset=bouncer` flow can pre-fill. No `*Action` methods exist on this
// class, so `RouterProvider::generateSimpleRoutes()` produces no extra routes —
// the literal `/v1/decisions/stream` and `/v1/whitelist` paths are mounted via
// `RouterProvider::SPECIAL_ROUTES`.
#[HttpMapping(
    mapping: ['GET' => ['exportDecisions', 'exportWhitelist']],
    collectionLevelMethods: ['exportDecisions', 'exportWhitelist']
)]
class RestController extends BaseController
{
    /**
     * Processor class for the worker queue dispatch.
     */
    protected string $processorClass = FirewallBouncerManagementProcessor::class;

    /**
     * Export all active ban decisions in CrowdSec-LAPI-compatible format.
     *
     * Returns the raw LAPI snapshot at the top level (NOT wrapped in
     * `{result, data, ...}`), so stock cs-firewall-bouncer and the rest of
     * the CrowdSec ecosystem can parse the response with no custom adapter.
     * MVP returns the full snapshot in `new` on every poll, with `deleted`
     * always empty — bouncers reapply idempotently.
     *
     * The `?startup=true` query parameter that bouncers send on the first
     * call is accepted but has no effect: we always emit a full snapshot.
     *
     * @route GET /pbxcore/api/v3/firewall-bouncer/v1/decisions/stream
     */
    #[ApiOperation(
        summary: 'rest_fwbouncer_Export',
        description: 'rest_fwbouncer_ExportDesc',
        operationId: 'exportFirewallBouncerDecisions'
    )]
    #[ApiResponse(
        statusCode: 200,
        description: 'rest_response_200_fwbouncer_export',
        content: [
            'application/json' => [
                'schema' => [
                    'type' => 'object',
                    'required' => ['new', 'deleted'],
                    'properties' => [
                        'new' => [
                            'type' => 'array',
                            'description' => 'rest_schema_fwbouncer_new',
                            'items' => [
                                'type' => 'object',
                                'required' => ['id', 'origin', 'type', 'scope', 'value', 'duration', 'scenario'],
                                'properties' => [
                                    'id'       => ['type' => 'integer', 'description' => 'rest_schema_fwbouncer_id'],
                                    'origin'   => ['type' => 'string',  'description' => 'rest_schema_fwbouncer_origin', 'example' => 'mikopbx-fail2ban'],
                                    'type'     => ['type' => 'string',  'description' => 'rest_schema_fwbouncer_type',   'example' => 'ban'],
                                    'scope'    => ['type' => 'string',  'description' => 'rest_schema_fwbouncer_scope',  'example' => 'Ip'],
                                    'value'    => ['type' => 'string',  'description' => 'rest_schema_fwbouncer_value',  'example' => '203.0.113.7'],
                                    'duration' => ['type' => 'string',  'description' => 'rest_schema_fwbouncer_duration', 'example' => '3600s'],
                                    'scenario' => ['type' => 'string',  'description' => 'rest_schema_fwbouncer_scenario', 'example' => 'mikopbx/sip'],
                                ],
                            ],
                        ],
                        'deleted' => [
                            'type' => 'array',
                            'description' => 'rest_schema_fwbouncer_deleted',
                            'items' => ['type' => 'object'],
                        ],
                    ],
                ],
            ],
        ]
    )]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function exportDecisions(): void
    {
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            'exportDecisions',
            []
        );
    }

    /**
     * Export operator-defined whitelist (allow-list) as a flat JSON array.
     *
     * Sibling endpoint to `/v1/decisions/stream`. Not part of CrowdSec LAPI —
     * stock cs-firewall-bouncer uses its own `whitelists.yaml` and never polls
     * this path. Provided so MikoPBX-aware integrations can consume the same
     * whitelist that NetworkFilters enforces server-side
     * ({@see \MikoPBX\Core\System\DockerNetworkFilterService::isIpWhitelisted()}).
     *
     * Response body is a top-level JSON array of CIDR / IP strings, e.g.
     * `["10.0.0.0/8", "192.168.1.0/24"]`. Order is not stable; consumers
     * should treat it as a set.
     *
     * @route GET /pbxcore/api/v3/firewall-bouncer/v1/whitelist
     */
    #[ApiOperation(
        summary: 'rest_fwbouncer_Whitelist',
        description: 'rest_fwbouncer_WhitelistDesc',
        operationId: 'exportFirewallBouncerWhitelist'
    )]
    #[ApiResponse(
        statusCode: 200,
        description: 'rest_response_200_fwbouncer_whitelist',
        content: [
            'application/json' => [
                'schema' => [
                    'type' => 'array',
                    'description' => 'rest_schema_fwbouncer_whitelist',
                    'items' => ['type' => 'string', 'example' => '10.0.0.0/8'],
                ],
            ],
        ]
    )]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(500, 'rest_response_500_error', 'PBXApiResult')]
    public function exportWhitelist(): void
    {
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            'exportWhitelist',
            []
        );
    }
}
