#!/bin/bash
#
# Sentry API Client for MikoPBX
#
# Interacts with self-hosted Sentry (API v0) to retrieve errors,
# stacktraces, breadcrumbs, and search issues.
#
# Usage:
#   ./sentry-api.sh <command> [args] [options]
#
# Commands:
#   orgs                        List organizations
#   projects                    List projects
#   issues                      List issues (top errors)
#   issue <ISSUE_ID>            Issue details
#   event <ISSUE_ID>            Stacktrace of latest event
#   events <ISSUE_ID>           List recent events for an issue
#   breadcrumbs <ISSUE_ID>      Breadcrumbs of latest event
#   tags <ISSUE_ID>             Tag breakdown for an issue
#   search <QUERY>              Search issues
#   releases                    List releases
#
# Options:
#   --limit N                   Max results (default: 25)
#   --period 24h|14d             Stats period (default: 14d)
#   --sort date|new|freq|priority  Sort order (default: freq for issues)
#   --query QUERY               Additional query filter
#   --release VERSION           Filter issues by release version
#   --debug                     Show debug information
#
# Environment Variables:
#   SENTRY_TOKEN    Bearer token (required)
#   SENTRY_URL      Sentry URL (default: https://sentry.miko.ru:8443)
#   SENTRY_ORG      Organization slug (default: auto-detect)
#   SENTRY_PROJECT  Project slug (default: mikopbx)
#
# Exit Codes:
#   0 - Success
#   1 - Invalid arguments
#   2 - Missing token
#   3 - API request failed
#

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SENTRY_URL="${SENTRY_URL:-https://sentry.miko.ru:8443}"
SENTRY_ORG="${SENTRY_ORG:-miko}"
SENTRY_PROJECT="${SENTRY_PROJECT:-mikopbx}"
API_BASE="${SENTRY_URL}/api/0"

# ============================================================================
# Validate Token
# ============================================================================

if [[ -z "${SENTRY_TOKEN:-}" ]]; then
    echo "ERROR: SENTRY_TOKEN is not set" >&2
    echo "" >&2
    echo "Set it with:" >&2
    echo "  export SENTRY_TOKEN=\"your_token_here\"" >&2
    echo "" >&2
    echo "Get a token from: ${SENTRY_URL}/settings/account/api/auth-tokens/" >&2
    exit 2
fi

# ============================================================================
# Parse Arguments
# ============================================================================

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <command> [args] [options]" >&2
    echo "" >&2
    echo "Commands:" >&2
    echo "  orgs                        List organizations" >&2
    echo "  projects                    List projects" >&2
    echo "  issues                      List issues (top errors)" >&2
    echo "  issue <ISSUE_ID>            Issue details" >&2
    echo "  event <ISSUE_ID>            Stacktrace of latest event" >&2
    echo "  events <ISSUE_ID>           List recent events for an issue" >&2
    echo "  breadcrumbs <ISSUE_ID>      Breadcrumbs of latest event" >&2
    echo "  tags <ISSUE_ID>             Tag breakdown for an issue" >&2
    echo "  search <QUERY>              Search issues" >&2
    echo "  releases                    List releases" >&2
    echo "" >&2
    echo "Options:" >&2
    echo "  --limit N                   Max results (default: 25)" >&2
    echo "  --period 24h|14d            Stats period (default: 14d)" >&2
    echo "  --sort date|new|freq        Sort order (default: freq)" >&2
    echo "  --release VERSION           Filter issues by release" >&2
    echo "  --debug                     Show debug info" >&2
    exit 1
fi

COMMAND="$1"
shift

# Command argument (issue ID or search query)
CMD_ARG=""
if [[ $# -gt 0 && ! "$1" =~ ^-- ]]; then
    CMD_ARG="$1"
    shift
fi

# Parse options
LIMIT=25
PERIOD="14d"
SORT=""
QUERY=""
RELEASE=""
DEBUG=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --limit)
            LIMIT="$2"
            shift 2
            ;;
        --period)
            PERIOD="$2"
            shift 2
            ;;
        --sort)
            SORT="$2"
            shift 2
            ;;
        --query)
            QUERY="$2"
            shift 2
            ;;
        --release)
            RELEASE="$2"
            shift 2
            ;;
        --debug)
            DEBUG=1
            shift
            ;;
        *)
            echo "ERROR: Unknown option: $1" >&2
            exit 1
            ;;
    esac
done

# ============================================================================
# Functions
# ============================================================================

debug() {
    if [[ "$DEBUG" == "1" ]]; then
        echo "[DEBUG] $*" >&2
    fi
}

# Make authenticated API request
# Usage: api_request <endpoint> [extra_curl_args...]
api_request() {
    local endpoint="$1"
    shift
    local url="${API_BASE}${endpoint}"

    debug "Request: GET $url"

    local response
    local http_code

    # Get response with HTTP status code
    response=$(curl -sk -w "\n%{http_code}" \
        -H "Authorization: Bearer ${SENTRY_TOKEN}" \
        -H "Content-Type: application/json" \
        "$@" \
        "$url" 2>/dev/null)

    http_code=$(echo "$response" | tail -1)
    response=$(echo "$response" | sed '$d')

    debug "HTTP status: $http_code"

    if [[ "$http_code" == "400" ]]; then
        local detail
        detail=$(echo "$response" | jq -r '.detail // "Bad request"' 2>/dev/null || echo "Bad request")
        echo "ERROR: Bad request (HTTP 400): $detail" >&2
        return 3
    elif [[ "$http_code" == "401" ]]; then
        echo "ERROR: Authentication failed (HTTP 401)" >&2
        echo "Check SENTRY_TOKEN value" >&2
        return 3
    elif [[ "$http_code" == "403" ]]; then
        echo "ERROR: Forbidden (HTTP 403) - token may lack required scopes" >&2
        return 3
    elif [[ "$http_code" == "404" ]]; then
        echo "ERROR: Not found (HTTP 404) - check org/project/issue ID" >&2
        echo "Response: $response" >&2
        return 3
    elif [[ "$http_code" == "429" ]]; then
        echo "ERROR: Rate limited (HTTP 429) - wait 60 seconds" >&2
        return 3
    elif [[ "$http_code" -ge 500 ]]; then
        echo "ERROR: Server error (HTTP $http_code)" >&2
        return 3
    fi

    echo "$response"
}

# URL-encode a string safely
url_encode() {
    python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.stdin.read().strip()))" <<< "$1" 2>/dev/null || echo "$1"
}

# Auto-detect org slug if not set
detect_org() {
    if [[ -n "$SENTRY_ORG" ]]; then
        return
    fi
    debug "Auto-detecting organization..."
    local orgs_response
    orgs_response=$(api_request "/organizations/") || return 1
    SENTRY_ORG=$(echo "$orgs_response" | jq -r '.[0].slug // empty' 2>/dev/null)
    if [[ -z "$SENTRY_ORG" ]]; then
        echo "ERROR: Could not auto-detect organization" >&2
        echo "Set it manually: export SENTRY_ORG=your-org-slug" >&2
        return 1
    fi
    debug "Detected org: $SENTRY_ORG"
}

# Auto-detect project slug if not set
detect_project() {
    if [[ -n "$SENTRY_PROJECT" ]]; then
        return
    fi
    detect_org || return 1
    debug "Auto-detecting project..."
    local projects_response
    projects_response=$(api_request "/organizations/${SENTRY_ORG}/projects/") || return 1
    # Prefer 'mikopbx' project if it exists, otherwise fall back to first
    SENTRY_PROJECT=$(echo "$projects_response" | jq -r '
        (map(select(.slug == "mikopbx")) | .[0].slug) //
        (.[0].slug) // empty
    ' 2>/dev/null)
    if [[ -z "$SENTRY_PROJECT" ]]; then
        echo "ERROR: Could not auto-detect project" >&2
        echo "Set it manually: export SENTRY_PROJECT=your-project-slug" >&2
        return 1
    fi
    debug "Detected project: $SENTRY_PROJECT"
}

# Resolve project slug to numeric ID (needed for some API endpoints)
# Caches result in SENTRY_PROJECT_ID variable
SENTRY_PROJECT_ID=""
resolve_project_id() {
    if [[ -n "$SENTRY_PROJECT_ID" ]]; then
        return
    fi
    detect_org || return 1
    detect_project || return 1
    debug "Resolving project ID for: $SENTRY_PROJECT..."
    local projects_response
    projects_response=$(api_request "/organizations/${SENTRY_ORG}/projects/") || return 1
    SENTRY_PROJECT_ID=$(echo "$projects_response" | jq -r \
        --arg slug "$SENTRY_PROJECT" \
        '.[] | select(.slug == $slug) | .id // empty' 2>/dev/null)
    if [[ -z "$SENTRY_PROJECT_ID" ]]; then
        debug "Could not resolve project ID, releases will not be filtered by project"
        return 1
    fi
    debug "Project ID: $SENTRY_PROJECT_ID"
}

# ============================================================================
# Commands
# ============================================================================

case "$COMMAND" in

    # ------------------------------------------------------------------
    # List organizations
    # ------------------------------------------------------------------
    orgs)
        response=$(api_request "/organizations/") || exit 3
        echo "$response" | jq '[.[] | {slug, name, status: .status.id}]'
        ;;

    # ------------------------------------------------------------------
    # List projects
    # ------------------------------------------------------------------
    projects)
        detect_org || exit 1
        response=$(api_request "/organizations/${SENTRY_ORG}/projects/") || exit 3
        echo "$response" | jq '[.[] | {slug, name, platform, dateCreated}]'
        echo "" >&2
        echo "Organization: $SENTRY_ORG" >&2
        echo "Use: export SENTRY_ORG=$SENTRY_ORG" >&2
        first_project=$(echo "$response" | jq -r '.[0].slug // empty' 2>/dev/null)
        if [[ -n "$first_project" ]]; then
            echo "Use: export SENTRY_PROJECT=$first_project" >&2
        fi
        ;;

    # ------------------------------------------------------------------
    # List issues (top errors)
    # ------------------------------------------------------------------
    issues)
        detect_project || exit 1

        # Default sort for issues is freq
        if [[ -z "$SORT" ]]; then
            SORT="freq"
        fi

        local_query="is:unresolved"
        if [[ -n "$RELEASE" ]]; then
            local_query="${local_query} release:${RELEASE}"
        fi
        if [[ -n "$QUERY" ]]; then
            local_query="${local_query} ${QUERY}"
        fi

        # URL-encode the query safely via stdin
        encoded_query=$(url_encode "$local_query")

        response=$(api_request "/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/issues/?query=${encoded_query}&sort=${SORT}&statsPeriod=${PERIOD}&limit=${LIMIT}") || exit 3

        echo "$response" | jq '[.[] | {
            id,
            title: (.title[:100]),
            culprit: (.culprit[:80]),
            count: (.count | tonumber),
            userCount,
            firstSeen,
            lastSeen,
            level,
            status
        }]'

        total=$(echo "$response" | jq 'length' 2>/dev/null || echo "0")
        echo "" >&2
        echo "Showing $total issues (sort=$SORT, period=$PERIOD)" >&2
        if [[ -n "$RELEASE" ]]; then
            echo "Release filter: $RELEASE" >&2
        fi
        echo "Org: $SENTRY_ORG / Project: $SENTRY_PROJECT" >&2
        ;;

    # ------------------------------------------------------------------
    # Issue details
    # ------------------------------------------------------------------
    issue)
        if [[ -z "$CMD_ARG" ]]; then
            echo "Usage: $0 issue <ISSUE_ID>" >&2
            exit 1
        fi

        response=$(api_request "/issues/${CMD_ARG}/") || exit 3

        echo "$response" | jq '{
            id,
            title,
            culprit,
            type,
            level,
            status,
            count: (.count | tonumber),
            userCount,
            firstSeen,
            lastSeen,
            assignedTo: (.assignedTo.name // "unassigned"),
            shortId,
            project: .project.slug,
            platform,
            metadata,
            tags: [.tags[]? | {key, value}]
        }'
        ;;

    # ------------------------------------------------------------------
    # Latest event stacktrace
    # ------------------------------------------------------------------
    event)
        if [[ -z "$CMD_ARG" ]]; then
            echo "Usage: $0 event <ISSUE_ID>" >&2
            exit 1
        fi

        response=$(api_request "/issues/${CMD_ARG}/events/latest/?full=true") || exit 3

        # Extract exception info
        echo "=== Exception ===" >&2
        echo "$response" | jq -r '
            .entries[]? | select(.type == "exception") |
            .data.values[]? | "\(.type // "Unknown"): \(.value // "no message")"
        ' 2>/dev/null

        echo ""

        # Extract stacktrace frames
        echo "$response" | jq '[
            .entries[]? | select(.type == "exception") |
            .data.values[]? | {
                type,
                value,
                stacktrace: [
                    .stacktrace.frames[]? | {
                        filename,
                        function: (.function // "?"),
                        lineNo,
                        colNo,
                        context: (
                            if .context then
                                [.context[]? | .[1]?] | map(select(. != null))
                            else
                                []
                            end
                        ),
                        inApp: (.inApp // false)
                    }
                ] | reverse
            }
        ]'

        # Show event metadata and tags
        echo "" >&2
        event_id=$(echo "$response" | jq -r '.eventID // "unknown"' 2>/dev/null)
        event_ts=$(echo "$response" | jq -r '.dateCreated // "unknown"' 2>/dev/null)
        event_release=$(echo "$response" | jq -r '.release.version // .tags[]? | select(.key == "release") | .value // "unknown"' 2>/dev/null | head -1)
        event_server=$(echo "$response" | jq -r '.tags[]? | select(.key == "server_name") | .value // empty' 2>/dev/null | head -1)
        echo "Event: $event_id" >&2
        echo "Date: $event_ts" >&2
        if [[ -n "$event_release" && "$event_release" != "unknown" ]]; then
            echo "Release: $event_release" >&2
        fi
        if [[ -n "$event_server" ]]; then
            echo "Server: $event_server" >&2
        fi
        ;;

    # ------------------------------------------------------------------
    # Breadcrumbs for latest event
    # ------------------------------------------------------------------
    breadcrumbs)
        if [[ -z "$CMD_ARG" ]]; then
            echo "Usage: $0 breadcrumbs <ISSUE_ID>" >&2
            exit 1
        fi

        response=$(api_request "/issues/${CMD_ARG}/events/latest/?full=true") || exit 3

        echo "$response" | jq '[
            .entries[]? | select(.type == "breadcrumbs") |
            .data.values[]? | {
                timestamp,
                category: (.category // "default"),
                type: (.type // "default"),
                level: (.level // "info"),
                message: (.message // ""),
                data: (.data // {})
            }
        ]'

        count=$(echo "$response" | jq '[.entries[]? | select(.type == "breadcrumbs") | .data.values[]?] | length' 2>/dev/null || echo "0")
        echo "" >&2
        echo "Total breadcrumbs: $count" >&2
        ;;

    # ------------------------------------------------------------------
    # Search issues
    # ------------------------------------------------------------------
    search)
        if [[ -z "$CMD_ARG" ]]; then
            echo "Usage: $0 search <QUERY>" >&2
            echo "" >&2
            echo "Examples:" >&2
            echo "  $0 search 'database is locked'" >&2
            echo "  $0 search 'is:unresolved level:error'" >&2
            echo "  $0 search 'filename:WorkerBase.php'" >&2
            exit 1
        fi

        detect_project || exit 1

        # URL-encode the search query safely via stdin
        encoded_query=$(url_encode "$CMD_ARG")

        response=$(api_request "/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/issues/?query=${encoded_query}&statsPeriod=${PERIOD}&limit=${LIMIT}") || exit 3

        echo "$response" | jq '[.[] | {
            id,
            title: (.title[:100]),
            culprit: (.culprit[:80]),
            count: (.count | tonumber),
            level,
            firstSeen,
            lastSeen
        }]'

        total=$(echo "$response" | jq 'length' 2>/dev/null || echo "0")
        echo "" >&2
        echo "Found $total issues matching: $CMD_ARG" >&2
        ;;

    # ------------------------------------------------------------------
    # List recent events for an issue
    # ------------------------------------------------------------------
    events)
        if [[ -z "$CMD_ARG" ]]; then
            echo "Usage: $0 events <ISSUE_ID>" >&2
            exit 1
        fi

        response=$(api_request "/issues/${CMD_ARG}/events/?limit=${LIMIT}&full=false") || exit 3

        echo "$response" | jq '[.[] | {
            eventID: (.eventID[:16]),
            dateCreated,
            tags: (
                [.tags[]? | select(.key == "release" or .key == "server_name") | {(.key): .value}]
                | add // {}
            ),
            message: (.message // .title // "")[:100]
        }]'

        total=$(echo "$response" | jq 'length' 2>/dev/null || echo "0")
        echo "" >&2
        echo "Showing $total events for issue $CMD_ARG" >&2
        ;;

    # ------------------------------------------------------------------
    # Tag breakdown for an issue
    # ------------------------------------------------------------------
    tags)
        if [[ -z "$CMD_ARG" ]]; then
            echo "Usage: $0 tags <ISSUE_ID>" >&2
            exit 1
        fi

        response=$(api_request "/issues/${CMD_ARG}/tags/") || exit 3

        echo "$response" | jq '[.[] | {
            key,
            name,
            totalValues,
            topValues: [.topValues[]? | {value, count, name: (.name // .value)}]
        }]'
        ;;

    # ------------------------------------------------------------------
    # List releases
    # ------------------------------------------------------------------
    releases)
        detect_org || exit 1

        # Resolve numeric project ID for API filter (slug causes HTTP 400)
        project_filter=""
        resolve_project_id 2>/dev/null
        if [[ -n "$SENTRY_PROJECT_ID" ]]; then
            project_filter="&project=${SENTRY_PROJECT_ID}"
        fi

        response=$(api_request "/organizations/${SENTRY_ORG}/releases/?per_page=${LIMIT}${project_filter}") || exit 3

        echo "$response" | jq --argjson limit "$LIMIT" '[.[:$limit][] | {
            version: (.version[:60]),
            dateCreated,
            newGroups,
            commitCount,
            lastEvent,
            projects: [.projects[]?.slug]
        }]'
        ;;

    # ------------------------------------------------------------------
    # Unknown command
    # ------------------------------------------------------------------
    *)
        echo "ERROR: Unknown command: $COMMAND" >&2
        echo "" >&2
        echo "Available commands: orgs, projects, issues, issue, event, events, breadcrumbs, tags, search, releases" >&2
        exit 1
        ;;
esac
