---
name: h-fix-firewall-rules-priority
branch: fix/firewall-rules-priority
status: completed
created: 2026-03-16
---

# Fix firewall rules priority order and add drag-drop reordering

## Problem/Goal

GeoIP module blocking is ineffective because the `0.0.0.0/0` (Internet) network filter rule generates ACCEPT rules **above** module rules (like GeoIP ipset DROP). Traffic is accepted before reaching the module's block rules.

Current iptables order (broken):
1. ESTABLISHED/RELATED
2. User subnet rules (miko, MTS, etc.) — mixed with 0.0.0.0/0
3. **0.0.0.0/0 ACCEPT** — opens ports for everyone
4. Module rules (GeoIP ipset DROP) — too late, traffic already accepted
5. Final DROP

Required order:
1. ESTABLISHED/RELATED
2. User subnet rules (drag-drop priority between them)
3. Module rules (`onAfterIptablesReload`)
4. `0.0.0.0/0` ACCEPT — lowest priority, last before final DROP
5. Final DROP

Changes needed:
- Add `priority` field to `m_NetworkFilters` model/table
- `IptablesConf` generates rules respecting priority, with `0.0.0.0/0` always last
- UI drag-drop reordering for user subnets on firewall page
- Migration to add `priority` column and set initial values

## Success Criteria
- [ ] `m_NetworkFilters` has `priority` integer field
- [ ] Migration adds column and sets `0.0.0.0/0` to lowest priority
- [ ] `IptablesConf` generates iptables rules in priority order: user subnets → module hooks → 0.0.0.0/0 → final DROP
- [ ] GeoIP ipset DROP rules appear BEFORE 0.0.0.0/0 ACCEPT in iptables
- [ ] Firewall UI has drag-drop reordering for network filter priority
- [ ] `changePriority` API endpoint works for NetworkFilters

## User Notes
- `0.0.0.0/0` is a system rule that cannot be deleted
- User rules should have higher priority than module rules
- Module rules should have higher priority than `0.0.0.0/0`
- No priority ordering needed between modules themselves
- Drag-drop: higher position = higher priority (like iptables)

## Context Manifest
<!-- Added by context-gathering agent -->

### How Firewall Rules Currently Work: The Full Flow

#### The Core Problem in IptablesConf

When `IptablesConf::applyConfig()` runs, it builds an `$arr_command` array of iptables rules in this order:

1. ESTABLISHED/RELATED (conntrack)
2. Rate limiting for SIP attacks (if `maxReqSec > 0`)
3. `addMainFirewallRules()` -- iterates ALL `FirewallRules` with `action="allow"`, groups them by `$options[$protocol][$subnet][] = $port`, then calls `makeCmdMultiport()` to generate rules. **There is NO ordering** -- `NetworkFilters::find()` returns records in arbitrary DB insertion order. The `0.0.0.0/0` filter's rules are intermixed with specific subnet rules.
4. `addAdditionalFirewallRules()` -- SIP provider hosts + localhost rules
5. `PBXConfModulesProvider::hookModulesMethod(SystemConfigInterface::ON_AFTER_IPTABLES_RELOAD)` -- module hooks like GeoIP
6. Final DROP (if rules exist in DB)

The critical bug: in step 3, `addMainFirewallRules()` iterates `FirewallRules::find('action="allow"')` and groups by `$network_filter->permit`. There is no sorting. When `0.0.0.0/0` appears, its ACCEPT rules are generated alongside (or before) specific subnet rules. This means `0.0.0.0/0` ACCEPT appears BEFORE the module GeoIP DROP rules in step 5, rendering GeoIP blocking useless.

#### The addMainFirewallRules Method (Critical Code Path)

```php
public function addMainFirewallRules(array &$arr_command): void
{
    $options = [];
    $result = FirewallRules::find('action="allow"');
    foreach ($result as $rule) {
        // ... port calculation ...
        $network_filter = NetworkFilters::findFirst($rule->networkfilterid);
        // ... null check ...
        $options[$rule->protocol][$network_filter->permit][] = $port;
    }
    $this->makeCmdMultiport($options, $arr_command);
}
```

The fix needs to: (1) Query `NetworkFilters` with `ORDER BY priority ASC` (lower number = higher priority, processed first); (2) Separate `0.0.0.0/0` rules out so they are added AFTER the module hook; (3) Keep the existing grouping pattern for `$options[$protocol][$subnet][] = $port` but generate them in priority order.

#### The NetworkFilters Model

Located at `src/Common/Models/NetworkFilters.php`. Table: `m_NetworkFilters`. Current fields:
- `id` (integer, primary, identity)
- `permit` (string, nullable) -- e.g., "192.168.1.0/24", "0.0.0.0/0"
- `deny` (string, nullable)
- `newer_block_ip` (string, "0"/"1") -- Fail2Ban whitelist flag
- `local_network` (string, "0"/"1") -- local subnet flag
- `description` (string, nullable)

Relations:
- hasMany `Sip` (via `networkfilterid`)
- hasMany `FirewallRules` (via `networkfilterid`, CASCADE delete)
- hasMany `AsteriskManagerUsers` (via `networkfilterid`)

**New field needed**: `priority` (string, nullable, default "0"). Following the OutgoingRoutingTable pattern where priority is stored as a string type.

#### The Database Migration System

MikoPBX uses a two-part migration system:

1. **Automatic schema migration** (`UpdateDatabase::updateDatabaseStructure()`): Scans all model classes in `src/Common/Models/`, reads Phalcon annotations (`@Column`), and automatically creates/alters SQLite tables to match. If you add a new property with `@Column` annotation to a model, the column is automatically added to the table on next boot. This handles the DDL part.

2. **Data migration** (`UpdateSystemConfig::updateConfigs()`): Runs versioned upgrade scripts from `src/Core/System/Upgrade/Releases/` in order. Each class implements `UpgradeSystemConfigInterface` with a `processUpdate()` method and a `PBX_VERSION` constant. Scripts only run once -- when the previous version is less than the script's version.

For this task: Adding `@Column` annotation to `NetworkFilters::$priority` handles the DDL automatically. A data migration script is needed to set initial priority values (e.g., `0.0.0.0/0` gets highest number = lowest priority).

#### Reference Implementation: OutboundRoutes Priority

The `OutgoingRoutingTable` model has `public ?string $priority = '0'` as a string field. The full drag-drop priority stack:

**Model** (`src/Common/Models/OutgoingRoutingTable.php`):
```php
public ?string $priority = '0';
```

**REST API**:
- `OutboundRoutesManagementProcessor` has `CHANGE_PRIORITY = 'changePriority'` enum case
- Routes to `ChangePriorityAction::main($data)`
- `ChangePriorityAction` extends `AbstractChangePriorityAction` -- calls `executeStandardPriorityChange()` with model class, entity type, priority field name, and name field for logging

**REST Controller** (`src/PBXCoreREST/Controllers/OutboundRoutes/RestController.php`):
```php
#[HttpMapping(
    mapping: [
        'POST' => ['create', 'changePriority'],
        // ...
    ],
    customMethods: ['getDefault', 'changePriority', 'copy'],
)]
```
The `changePriority` method is a POST custom method at `/pbxcore/api/v3/outbound-routes:changePriority`.

**JavaScript API** (`sites/admin-cabinet/assets/js/src/PbxAPI/outbound-routes-api.js`):
```javascript
const OutboundRoutesAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/outbound-routes',
    customMethods: { changePriority: ':changePriority' }
});
OutboundRoutesAPI.changePriority = function(priorityData, callback) {
    return this.callCustomMethod('changePriority', { priorities: priorityData }, callback, 'POST');
};
```

**JavaScript UI** (`sites/admin-cabinet/assets/js/src/OutboundRoutes/outbound-routes-index.js`):
- Uses `jquery.tablednd.js` for drag-drop: `$('#outbound-routes-table tbody').tableDnD({onDrop, dragHandle: '.dragHandle'})`
- `cbDrawComplete()` initializes tableDnD and sets `data-value` attribute on rows for priority tracking
- `cbOnDrop()` collects changed priorities, calls `OutboundRoutesAPI.changePriority(priorityData, callback)`
- Uses `PbxDataTableIndex` base class for DataTable initialization
- First column is a drag handle: `{className: 'collapsing dragHandle', render: () => '<i class="sort grey icon"></i>'}`

**AssetProvider** loads `jquery.tablednd.js` for outbound-routes index page.

#### The Firewall UI (Current Implementation -- No DataTable)

The firewall index page is **completely JavaScript-driven** -- NOT using DataTables or `PbxDataTableIndex`. The Volt template (`src/AdminCabinet/Views/Firewall/index.volt`) is just:
```html
<div id="firewall-content" class="ui loading basic segment" style="min-height: 200px;">
    {# All content will be generated by JavaScript from REST API data #}
</div>
```

The JS (`firewall-index.js`) loads data via `FirewallAPI.getList()`, then dynamically builds the HTML table using `buildFirewallTable()`, `buildRuleRow()`, etc. The table is a plain `<table class="ui selectable very basic compact unstackable table" id="firewall-table">` -- it is NOT a DataTable instance. This means drag-drop must be applied directly to the dynamically generated table, similar to how outbound routes does it but without `PbxDataTableIndex`.

The `GetListAction` (`src/PBXCoreREST/Lib/Firewall/GetListAction.php`) currently sorts with `usort($networksTable, [__CLASS__, 'sortArrayByNetwork'])` which pushes permanent/all-network entries to the bottom. With the priority field, this sort should use priority order instead (or in addition to the permanent flag logic).

#### The Firewall REST API

**Endpoint**: `/pbxcore/api/v3/firewall`
**Processor**: `FirewallManagementProcessor` with enum `FirewallAction`
**Current custom methods**: `enable`, `disable`, `getBannedIps`, `unbanIp`, `getDefault`
**Missing**: `changePriority` -- needs to be added

The `FirewallAPI` JS client (`sites/admin-cabinet/assets/js/src/PbxAPI/firewall-api.js`) needs `changePriority` added.

#### What The Firewall GetListAction Returns

The response structure from `GetListAction::main()`:
```json
{
  "items": [
    {
      "id": "1",
      "description": "...",
      "permit": "192.168.1.0/24",
      "network": "192.168.1.0",
      "subnet": "24",
      "permanent": false,
      "newer_block_ip": false,
      "local_network": true,
      "rules": { "SIP": {"name":"SIP & RTP","action":true,"ports":[...]}, ... }
    }
  ],
  "firewallEnabled": "1",
  "isDocker": false,
  "dockerSupportedServices": ["WEB","AMI","SIP & RTP","IAX"]
}
```

Items include both DB-stored filters and "virtual" entries for local networks / `0.0.0.0/0` that don't yet exist in DB.

### Implementation Plan: What Needs to Connect

#### 1. Model Change: Add `priority` to NetworkFilters

Add to `src/Common/Models/NetworkFilters.php`:
```php
/**
 * Priority for firewall rule ordering (lower = higher priority, processed first)
 *
 * @Column(type="string", nullable=true)
 */
public ?string $priority = '0';
```

The `UpdateDatabase` system will auto-add the column on next boot via annotations.

#### 2. Data Migration: Set Initial Priorities

Create `src/Core/System/Upgrade/Releases/UpdateConfigsUpToVer2026XXX.php` (use appropriate version). The migration should:
- Set `priority = 100` for all existing `NetworkFilters` records
- Set `priority = 9999` for the `0.0.0.0/0` record specifically (or `::/0`)
- Follow the pattern of existing upgrade classes (extends `Injectable`, implements `UpgradeSystemConfigInterface`, has `PBX_VERSION` constant)

#### 3. IptablesConf Changes

Modify `addMainFirewallRules()` to:
- Query `NetworkFilters` joined with `FirewallRules` ordered by `priority ASC`
- Build two sets of rules: normal subnet rules and "all-network" rules (`0.0.0.0/0`, `::/0`)
- In `applyConfig()`, generate rules in order: ESTABLISHED/RELATED -> rate limiting -> **normal subnet rules** -> additional rules -> **module hooks** -> **all-network rules** -> DROP

The key change is splitting `addMainFirewallRules` into two phases, or having it return separate arrays for normal vs all-network rules.

#### 4. REST API: Add changePriority Endpoint

**New file**: `src/PBXCoreREST/Lib/Firewall/ChangePriorityAction.php`
- Extend `AbstractChangePriorityAction`
- Call `executeStandardPriorityChange($data, NetworkFilters::class, 'Network filter', 'priority', 'description')`

**Modify** `FirewallManagementProcessor`:
- Add `CHANGE_PRIORITY = 'changePriority'` to `FirewallAction` enum
- Add match case routing to `ChangePriorityAction::main($data)`

**Modify** `src/PBXCoreREST/Controllers/Firewall/RestController.php`:
- Add `'changePriority'` to HttpMapping `POST` array
- Add to `customMethods` and `collectionLevelMethods`
- Add `changePriority()` method with OpenAPI attributes

#### 5. JavaScript API: Add changePriority to FirewallAPI

In `sites/admin-cabinet/assets/js/src/PbxAPI/firewall-api.js`:
```javascript
FirewallAPI.changePriority = function(priorityData, callback) {
    return this.callCustomMethod('changePriority', { priorities: priorityData }, callback, 'POST');
};
```
Also add `changePriority: ':changePriority'` to the `customMethods` in the `PbxApiClient` constructor.

#### 6. JavaScript UI: Add Drag-Drop to Firewall Index

In `sites/admin-cabinet/assets/js/src/Firewall/firewall-index.js`:
- In `buildRuleRow()`: Add a drag handle column `<td class="collapsing dragHandle"><i class="sort grey icon"></i></td>`
- In `buildFirewallTable()`: Add an empty `<th></th>` header for the drag column
- In `initializeUIElements()` (after table is built): Initialize tableDnD on `#firewall-table tbody`
- Add `cbOnDrop()` handler that collects priorities and calls `FirewallAPI.changePriority()`
- Add `data-value` (priority) and `id` attributes to each `<tr>` in `buildRuleRow()`
- The `0.0.0.0/0` row should NOT be draggable (it stays at the bottom)
- Rows that don't have an `id` (virtual/unsaved rules) should not be draggable

#### 7. AssetProvider: Add tableDnD for Firewall Index

In `src/AdminCabinet/Providers/AssetProvider.php`, method `makeFirewallAssets()`, for `action === 'index'`:
- Add `->addJs('js/vendor/jquery.tablednd.js', true)` before the firewall JS files

#### 8. Babel Transpilation

After editing ES6+ source files in `sites/admin-cabinet/assets/js/src/`, transpile to ES5 in `sites/admin-cabinet/assets/js/pbx/` using the babel-compiler skill.

#### 9. GetListAction: Include Priority in Response

Modify `GetListAction::main()` to:
- Add `priority` field to each item in the response
- Sort by `priority ASC` instead of the current `sortArrayByNetwork` method
- Virtual entries (not saved in DB) should get a display priority (e.g., 9999 for all-networks)

#### 10. DataStructure: Add Priority Field

Add `priority` field to `src/PBXCoreREST/Lib/Firewall/DataStructure.php`:
- In `getAllFieldDefinitions()`: add writable `priority` field (type integer)
- In `createFromModel()`: include `$model->priority` in output
- In `createForList()`: include priority

### Technical Reference Details

#### Component Interfaces & Signatures

**AbstractChangePriorityAction::executeStandardPriorityChange**:
```php
public static function executeStandardPriorityChange(
    array $data,
    string $modelClass,       // NetworkFilters::class
    string $entityType,        // 'Network filter'
    string $priorityField = 'priority',
    ?string $nameField = null, // 'description'
    ?string $errorMessage = null
): PBXApiResult
```

**PbxApiClient JS constructor pattern**:
```javascript
const FirewallAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/firewall',
    customMethods: {
        changePriority: ':changePriority',  // ADD THIS
        // existing methods...
    }
});
```

**tableDnD initialization pattern** (from outbound-routes):
```javascript
$('#firewall-table tbody').tableDnD({
    onDrop: this.cbOnDrop.bind(this),
    onDragClass: 'hoveringRow',
    dragHandle: '.dragHandle'
});
```

#### Data Structures

**Priority change API request**:
```json
POST /pbxcore/api/v3/firewall:changePriority
{
  "priorities": {
    "1": 10,
    "2": 20,
    "3": 30
  }
}
```

**NetworkFilters table schema after migration**:
```sql
m_NetworkFilters (
  id INTEGER PRIMARY KEY,
  permit TEXT,
  deny TEXT,
  newer_block_ip TEXT DEFAULT '0',
  local_network TEXT DEFAULT '0',
  description TEXT,
  priority TEXT DEFAULT '0'   -- NEW COLUMN
)
```

#### File Locations

- **Model**: `src/Common/Models/NetworkFilters.php`
- **IptablesConf**: `src/Core/System/Configs/IptablesConf.php`
- **Firewall REST processor**: `src/PBXCoreREST/Lib/FirewallManagementProcessor.php`
- **Firewall REST controller**: `src/PBXCoreREST/Controllers/Firewall/RestController.php`
- **Firewall GetListAction**: `src/PBXCoreREST/Lib/Firewall/GetListAction.php`
- **Firewall SaveRecordAction**: `src/PBXCoreREST/Lib/Firewall/SaveRecordAction.php`
- **Firewall DataStructure**: `src/PBXCoreREST/Lib/Firewall/DataStructure.php`
- **New ChangePriorityAction**: `src/PBXCoreREST/Lib/Firewall/ChangePriorityAction.php` (create)
- **Migration script**: `src/Core/System/Upgrade/Releases/UpdateConfigsUpToVer2026XXX.php` (create)
- **JS API**: `sites/admin-cabinet/assets/js/src/PbxAPI/firewall-api.js`
- **JS UI**: `sites/admin-cabinet/assets/js/src/Firewall/firewall-index.js`
- **Transpiled JS API**: `sites/admin-cabinet/assets/js/pbx/PbxAPI/firewall-api.js`
- **Transpiled JS UI**: `sites/admin-cabinet/assets/js/pbx/Firewall/firewall-index.js`
- **AssetProvider**: `src/AdminCabinet/Providers/AssetProvider.php`
- **Volt template**: `src/AdminCabinet/Views/Firewall/index.volt` (no changes needed -- all JS-driven)
- **AbstractChangePriorityAction**: `src/PBXCoreREST/Lib/Common/AbstractChangePriorityAction.php` (reference only)
- **Reference: OutboundRoutes ChangePriority**: `src/PBXCoreREST/Lib/OutboundRoutes/ChangePriorityAction.php`
- **Reference: OutboundRoutes JS**: `sites/admin-cabinet/assets/js/src/OutboundRoutes/outbound-routes-index.js`
- **tableDnD vendor lib**: `sites/admin-cabinet/assets/js/vendor/jquery.tablednd.js`

## Work Log
- [2026-03-16] Task created from production issue on boffart.miko.ru
