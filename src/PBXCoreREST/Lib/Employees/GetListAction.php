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

namespace MikoPBX\PBXCoreREST\Lib\Employees;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\ExternalPhones;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Users;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetListAction;
use MikoPBX\PBXCoreREST\Lib\Common\AvatarHelper;
use Phalcon\Di\Di;

/**
 * Get list of all employees with DataTable support
 * 
 * @api {get} /pbxcore/api/v2/employees Get list of employees
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup Employees
 *
 * @apiParam {String} [search] Search query with optional prefixes (id:, email:, number:, mobile:)
 * @apiParam {String} [order_by=username] Sort field: username, number, mobile, email
 * @apiParam {String} [order_direction=ASC] Sort direction: ASC, DESC
 * @apiParam {Number} [limit=50] Records per page (max 1000)
 * @apiParam {Number} [offset=0] Pagination offset
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of employee records
 * @apiSuccess {String} data.id User ID (primary identifier)
 * @apiSuccess {String} data.number Internal extension number
 * @apiSuccess {String} data.user_username Employee name
 * @apiSuccess {String} data.user_email User's email address
 * @apiSuccess {String} data.mobile Mobile phone number
 * @apiSuccess {String} data.avatar Avatar image URL
 * @apiSuccess {Boolean} data.disabled Extension disabled status
 * @apiSuccess {String} data.represent Employee representation for display
 * @apiSuccess {String} data.DT_RowId DataTable row ID (same as id)
 * @apiSuccess {String} data.DT_RowClass DataTable row CSS class
 *
 * @package MikoPBX\PBXCoreREST\Lib\Employees
 */
class GetListAction extends AbstractGetListAction
{
    /**
     * Gets list of all employees with DataTable support
     *
     * @param array $data Request parameters (search, ordering, pagination)
     * @return PBXApiResult Result with employees list
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = self::createListResult(__METHOD__);
        
        // Extract actual data parameters (they come nested in 'data' key)
        $requestData = $data['data'] ?? $data;
        
        try {
            // Build base query parameters with JOINs
            $parameters = self::buildBaseQueryParameters();
            
            // Apply search filters if provided
            if (!empty($requestData['search'])) {
                $parameters = self::applyEmployeeSearchFilters($parameters, $requestData['search']);
            }
            
            // Apply ordering
            $orderField = $requestData['order_by'] ?? 'username';
            $orderDirection = strtoupper($requestData['order_direction'] ?? 'ASC');
            $parameters = self::applyEmployeeOrdering($parameters, $orderField, $orderDirection);
            
            // Get total count before applying pagination (for DataTables)
            $totalCount = self::getTotalCount($parameters);
            
            // Apply pagination if requested
            if (isset($requestData['limit']) || isset($requestData['offset'])) {
                $parameters = self::applyPagination($parameters, $requestData);
            }
            
            // Execute query and get results
            $employees = self::executeEmployeeQuery($parameters);
            
            // Transform results for DataTable format
            $resultData = [];
            foreach ($employees as $employee) {
                $resultData[] = self::createDataTableRecord($employee);
            }
            
            // Always return DataTable format with pagination info
            // This ensures proper pagination support in the frontend
            $res->data = [
                'data' => $resultData,
                'recordsTotal' => $totalCount,
                'recordsFiltered' => $totalCount  // Same as total since we filter on server side
            ];
            
            $res->success = true;
            
        } catch (\Exception $e) {
            return self::handleListError($e, $res);
        }
        
        return $res;
    }
    
    /**
     * Build base query parameters with JOINs for employee data
     * 
     * Uses INNER JOIN for primary extension (SIP) to only show users with extensions,
     * and LEFT JOIN for mobile extensions which are optional.
     * 
     * @return array<string, mixed> Base query parameters
     */
    private static function buildBaseQueryParameters(): array
    {
        return [
            'models' => [
                'Users' => Users::class,
            ],
            'joins' => [
                'InternalExtensions' => [
                    0 => Extensions::class,
                    1 => 'InternalExtensions.userid=Users.id AND InternalExtensions.is_general_user_number = "1" AND InternalExtensions.type="' . Extensions::TYPE_SIP . '"',
                    2 => 'InternalExtensions',
                    3 => 'LEFT',
                ],
                'Sip' => [
                    0 => Sip::class,
                    1 => 'Sip.extension=InternalExtensions.number',
                    2 => 'Sip',
                    3 => 'LEFT',
                ],
                'MobileExtensions' => [
                    0 => Extensions::class,
                    1 => 'MobileExtensions.userid=Users.id AND MobileExtensions.is_general_user_number = "1" AND MobileExtensions.type="' . Extensions::TYPE_EXTERNAL . '"',
                    2 => 'MobileExtensions',
                    3 => 'LEFT',
                ],
                'ExternalPhones' => [
                    0 => ExternalPhones::class,
                    1 => 'ExternalPhones.extension=MobileExtensions.number',
                    2 => 'ExternalPhones',
                    3 => 'LEFT',
                ],
            ],
            'columns' => [
                'id' => 'Users.id',
                'username' => 'Users.username', 
                'email' => 'Users.email',
                'avatar' => 'Users.avatar',
                'extension_number' => 'InternalExtensions.number',
                'sip_disabled' => 'Sip.disabled',
                'mobile_number' => 'MobileExtensions.number',
                'mobile_dialstring' => 'ExternalPhones.dialstring',
                'search_index' => 'InternalExtensions.search_index',
            ],
        ];
    }
    
    /**
     * Apply employee-specific search filters with prefix support
     * 
     * @param array<string, mixed> $parameters Existing query parameters
     * @param string $searchPhrase Search phrase with optional prefix
     * @return array<string, mixed> Updated parameters with search conditions
     */
    private static function applyEmployeeSearchFilters(array $parameters, string $searchPhrase): array
    {
        // Convert to lowercase for case-insensitive matching
        $searchPhrase = mb_strtolower(trim($searchPhrase), 'UTF-8');
        
        if (empty($searchPhrase)) {
            return $parameters;
        }
        
        // Handle different search prefixes
        if (str_starts_with($searchPhrase, 'id:')) {
            // Search by User.id with exact match
            $id = substr($searchPhrase, 3);
            $parameters['conditions'] = 'Users.id = :SearchId:';
            $parameters['bind']['SearchId'] = (int) $id;
            
        } elseif (str_starts_with($searchPhrase, 'email:')) {
            // Search by User.email using LIKE query
            $email = substr($searchPhrase, 6);
            $parameters['conditions'] = 'Users.email LIKE :SearchEmail:';
            $parameters['bind']['SearchEmail'] = "%$email%";
            
        } elseif (str_starts_with($searchPhrase, 'number:')) {
            // Search by InternalExtensions.number with exact match
            $number = substr($searchPhrase, 7);
            $parameters['conditions'] = 'InternalExtensions.number = :SearchNumber:';
            $parameters['bind']['SearchNumber'] = $number;
            
        } elseif (str_starts_with($searchPhrase, 'mobile:')) {
            // Search by mobile number using LIKE query
            $mobile = substr($searchPhrase, 7);
            $mobile = preg_replace('/\D/', '', $mobile); // Remove non-digits
            $parameters['conditions'] = 'ExternalPhones.dialstring LIKE :SearchMobile:';
            $parameters['bind']['SearchMobile'] = "%$mobile%";
            
        } else {
            // Default: search by username or search_index
            $parameters['conditions'] = '(Users.username LIKE :SearchPhrase: OR InternalExtensions.search_index LIKE :SearchPhrase:)';
            $parameters['bind']['SearchPhrase'] = "%$searchPhrase%";
        }
        
        return $parameters;
    }
    
    /**
     * Apply employee-specific ordering
     * 
     * @param array<string, mixed> $parameters Query parameters
     * @param string $orderField Field to order by
     * @param string $orderDirection ASC or DESC
     * @return array<string, mixed> Updated parameters with ordering
     */
    private static function applyEmployeeOrdering(array $parameters, string $orderField, string $orderDirection): array
    {
        $allowedFields = ['username', 'number', 'mobile', 'email'];
        
        if (!in_array($orderField, $allowedFields)) {
            $orderField = 'username';
        }
        
        if (!in_array($orderDirection, ['ASC', 'DESC'])) {
            $orderDirection = 'ASC';
        }
        
        // Map order fields to actual column expressions
        $orderMappings = [
            'username' => 'Users.username',
            'number' => 'CAST(InternalExtensions.number AS INTEGER)',
            'mobile' => 'CAST(MobileExtensions.number AS INTEGER)',  
            'email' => 'Users.email',
        ];
        
        $orderExpression = $orderMappings[$orderField] ?? 'Users.username';
        $parameters['order'] = "$orderExpression $orderDirection";
        
        return $parameters;
    }
    
    /**
     * Get total count of employees matching the filter criteria
     * 
     * @param array<string, mixed> $parameters Query parameters (without pagination)
     * @return int Total count
     */
    private static function getTotalCount(array $parameters): int
    {
        $di = Di::getDefault();
        if ($di === null) {
            return 0;
        }
        
        // Remove pagination and ordering for count query
        $countParameters = $parameters;
        unset($countParameters['limit'], $countParameters['offset'], $countParameters['order']);
        
        // Change columns to COUNT
        $countParameters['columns'] = ['count' => 'COUNT(Users.id)'];
        
        $query = $di->get('modelsManager')->createBuilder($countParameters)->getQuery();
        $result = $query->execute();
        
        if (!$result || !$result[0]) {
            return 0;
        }
        
        return (int)$result[0]->count;
    }
    
    /**
     * Execute employee query and return results
     * 
     * @param array<string, mixed> $parameters Query parameters
     * @return array Query results
     */
    private static function executeEmployeeQuery(array $parameters): array
    {
        $di = Di::getDefault();
        if ($di === null) {
            return [];
        }
        
        $query = $di->get('modelsManager')->createBuilder($parameters)->getQuery();
        $result = $query->execute();
        
        if (!$result) {
            return [];
        }
        
        return $result->toArray();
    }
    
    /**
     * Create DataTable-compatible record from query result
     * 
     * @param array $employee Employee data from query
     * @return array DataTable-formatted record
     */
    private static function createDataTableRecord(array $employee): array
    {
        $userId = $employee['id'] ?? '';
        $username = $employee['username'] ?? '';
        $extensionNumber = $employee['extension_number'] ?? '';
        $email = $employee['email'] ?? '';
        $mobileNumber = $employee['mobile_number'] ?? '';
        $mobileDialstring = $employee['mobile_dialstring'] ?? '';
        $avatar = $employee['avatar'] ?? '';
        $disabled = ($employee['sip_disabled'] ?? '0') === '1';
        
        // Process avatar with caching
        $avatarUrl = AvatarHelper::getAvatarUrl($avatar);
        
        return [
            'id' => (int)$userId,  // User ID as primary identifier
            'number' => $extensionNumber ?: '',
            'user_username' => $username ?: '',
            'user_email' => $email ?: '',
            'mobile' => $mobileDialstring ?: $mobileNumber ?: '',  // Use dialstring if available, otherwise mobile number
            'avatar' => $avatarUrl,
            'disabled' => $disabled,
        ];
    }
}