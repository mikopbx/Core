---
index: rest-api
name: REST API & Architecture
description: Tasks related to REST API routing, authentication, controllers, middleware, and architectural improvements
---

# REST API & Architecture

## Active Tasks

### High Priority
- `h-implement-api-queue-backpressure.md` - Fast-fail 503 + TTL on stale requests to prevent API queue deadlock
- `h-refactor-ssh-password-storage/` - Refactor SSH password storage to SHA-512 hashes (security improvement)

### Medium Priority
- `m-fix-zabbix-module-api-flooding.md` - ModuleZabbixAgent5 caching to stop REST API flooding

### Low Priority

### Investigate

## Completed Tasks
- `m-implement-rest-api-acl-authorization.md` - Implement Phalcon ACL authorization for REST API endpoints (role-based access control)
- `m-refactor-router-provider-public-endpoints.md` - Refactor RouterProvider to eliminate code duplication and improve public endpoints handling