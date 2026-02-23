# Sentry API v0 Endpoints Reference

Base URL: `https://sentry.miko.ru:8443/api/0`

All requests require `Authorization: Bearer $SENTRY_TOKEN` header.
All requests use `-sk` for self-signed certificate support.

## Organizations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/organizations/` | GET | List all organizations |
| `/organizations/{org_slug}/` | GET | Organization details |

### Example: List Organizations

```bash
curl -sk "https://sentry.miko.ru:8443/api/0/organizations/" \
  -H "Authorization: Bearer $SENTRY_TOKEN" | jq '.[].slug'
```

## Projects

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/organizations/{org_slug}/projects/` | GET | List projects in org |
| `/projects/{org_slug}/{project_slug}/` | GET | Project details |

### Example: List Projects

```bash
curl -sk "https://sentry.miko.ru:8443/api/0/organizations/sentry/projects/" \
  -H "Authorization: Bearer $SENTRY_TOKEN" | jq '.[] | {slug, name, platform}'
```

## Issues

| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| `/projects/{org}/{project}/issues/` | GET | List project issues | `query`, `sort`, `statsPeriod`, `cursor`, `limit` |
| `/organizations/{org}/issues/` | GET | List org issues | Same as above |
| `/issues/{issue_id}/` | GET | Issue details | - |
| `/issues/{issue_id}/` | PUT | Update issue | `status`, `assignedTo`, `hasSeen`, `isBookmarked` |

### Sort Options

| Value | Description |
|-------|-------------|
| `date` | Last seen (default) |
| `new` | First seen (newest first) |
| `freq` | Event count (most frequent first) |
| `priority` | Priority score |
| `user` | Number of affected users |

### Stats Period

| Value | Description |
|-------|-------------|
| `24h` | Last 24 hours |
| `7d` | Last 7 days |
| `14d` | Last 14 days |
| `30d` | Last 30 days |
| `90d` | Last 90 days |

### Example: Top Issues by Frequency

```bash
curl -sk "https://sentry.miko.ru:8443/api/0/projects/sentry/mikopbx/issues/?sort=freq&statsPeriod=24h&limit=10" \
  -H "Authorization: Bearer $SENTRY_TOKEN" | \
  jq '.[] | {id, title, count, culprit, firstSeen, lastSeen}'
```

### Example: Search Issues

```bash
curl -sk "https://sentry.miko.ru:8443/api/0/projects/sentry/mikopbx/issues/?query=is:unresolved+level:error&statsPeriod=7d" \
  -H "Authorization: Bearer $SENTRY_TOKEN" | \
  jq '.[] | {id, title, count}'
```

## Events

| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| `/issues/{issue_id}/events/` | GET | List events for issue | `full=true`, `limit` |
| `/issues/{issue_id}/events/latest/` | GET | Latest event | `full=true` |
| `/issues/{issue_id}/events/oldest/` | GET | Oldest event | `full=true` |
| `/projects/{org}/{project}/events/{event_id}/` | GET | Specific event | `full=true` |

### Example: Get Latest Event with Full Stacktrace

```bash
curl -sk "https://sentry.miko.ru:8443/api/0/issues/12345/events/latest/?full=true" \
  -H "Authorization: Bearer $SENTRY_TOKEN" | \
  jq '.entries[] | select(.type == "exception") | .data.values[].stacktrace.frames[] | {filename, function, lineNo, context}'
```

### Example: Get Breadcrumbs

```bash
curl -sk "https://sentry.miko.ru:8443/api/0/issues/12345/events/latest/?full=true" \
  -H "Authorization: Bearer $SENTRY_TOKEN" | \
  jq '.entries[] | select(.type == "breadcrumbs") | .data.values[] | {timestamp, category, message, level}'
```

## Releases

| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| `/organizations/{org}/releases/` | GET | List releases | `project`, `query`, `sort` |
| `/organizations/{org}/releases/{version}/` | GET | Release details | - |

### Example: List Releases

```bash
curl -sk "https://sentry.miko.ru:8443/api/0/organizations/sentry/releases/?project=mikopbx" \
  -H "Authorization: Bearer $SENTRY_TOKEN" | \
  jq '.[] | {version, dateCreated, newGroups}'
```

## Tags

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/issues/{issue_id}/tags/` | GET | Tags for issue |
| `/issues/{issue_id}/tags/{tag_key}/values/` | GET | Tag values |

### Example: Get Tags

```bash
curl -sk "https://sentry.miko.ru:8443/api/0/issues/12345/tags/" \
  -H "Authorization: Bearer $SENTRY_TOKEN" | \
  jq '.[] | {key, totalValues, topValues: [.topValues[].value]}'
```

## Pagination

Sentry API uses cursor-based pagination via `Link` header:

```
Link: <...?&cursor=1234567890:0:1>; rel="previous"; results="false",
      <...?&cursor=1234567890:100:0>; rel="next"; results="true"
```

Use `cursor` parameter for next page:
```bash
curl -sk "...?cursor=1234567890:100:0" -H "Authorization: Bearer $SENTRY_TOKEN"
```

## Common Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Search query (Sentry search syntax) |
| `sort` | string | Sort order: `date`, `new`, `freq`, `priority`, `user` |
| `statsPeriod` | string | Time period: `24h`, `7d`, `14d`, `30d`, `90d` |
| `limit` | integer | Max results per page (default: 25, max: 100) |
| `cursor` | string | Pagination cursor |
| `full` | boolean | Include full event data (for events) |

## Error Responses

| Status | Description |
|--------|-------------|
| 401 | Invalid or missing token |
| 403 | Token lacks required scopes |
| 404 | Resource not found (wrong org/project/issue ID) |
| 429 | Rate limit exceeded (wait 60s) |
| 500 | Sentry server error |
