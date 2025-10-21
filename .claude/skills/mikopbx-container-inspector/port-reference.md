# Port Reference Guide

## Port Types

### Internal Container Ports

These ports are used **inside** the container and stored in SQLite `m_PBXSettings` table.

**Query to get internal ports**:
```sql
SELECT key, value FROM m_PBXSettings
WHERE key IN (
  'WEBPort',
  'WEBHTTPSPort',
  'SIPPort',
  'SIPDefaultPort',
  'RTPPortFrom',
  'RTPPortTo',
  'IAXPort'
);
```

**Typical internal ports**:
| Service | Port | DB Key |
|---------|------|--------|
| HTTP | 80 or custom | WEBPort |
| HTTPS | 443 or custom | WEBHTTPSPort |
| SIP | 5060 | SIPPort |
| IAX | 4569 (php83) / 7000 (php74) | IAXPort |
| RTP | 10000-10200 (php83) | RTPPortFrom, RTPPortTo |
| RTP | 10000-10999 (php74) | RTPPortFrom, RTPPortTo |

### External Host Ports (Docker Mapped)

These ports are exposed on your **host machine** (Mac) via Docker port mapping.

**mikopbx_php83 (develop)**:
| Service | Host Port | Container Port |
|---------|-----------|----------------|
| HTTP | 8081 | 8081 |
| HTTPS | 8445 | 8445 |
| SIP | 5060 | 5060 |
| SSH | 8023 | 22 |

**mikopbx_php74 (old release)**:
| Service | Host Port | Container Port |
|---------|-----------|----------------|
| HTTP | 8082 | 8082 |
| HTTPS | 8444 | 8444 |
| SSH | 8024 | 22 |

## When to Use Which Port

### From Host Machine (Your Mac)

Use **external ports**:
```bash
# Correct
curl https://192.168.117.2:8445/pbxcore/api/v3/extensions

# Correct
curl https://mikopbx_php83.localhost:8445/pbxcore/api/v3/extensions
```

### From Inside Container

Use **internal ports**:
```bash
# Inside container
docker exec mikopbx_php83 /bin/sh

# Use internal port (usually same as external for web)
curl http://localhost:8081/pbxcore/api/v3/extensions
```

### From Another Container

Use **container IP + internal port**:
```bash
# From container A to container B
curl http://192.168.117.2:8081/pbxcore/api/v3/extensions
```

## Port Discovery Commands

### Get All Port Mappings
```bash
# Show all port mappings for container
docker port mikopbx_php83

# Example output:
# 5060/tcp -> 0.0.0.0:5060
# 8023/tcp -> 0.0.0.0:8023
# 8081/tcp -> 0.0.0.0:8081
# 8445/tcp -> 0.0.0.0:8445
```

### Get Specific Port
```bash
# Get HTTPS port
docker port mikopbx_php83 8445

# Example output:
# 0.0.0.0:8445
```

### Get Internal Ports from Database
```bash
# Inside container
docker exec mikopbx_php83 sqlite3 /cf/conf/mikopbx.db \
  "SELECT key, value FROM m_PBXSettings WHERE key LIKE '%Port%'"
```

### Get IP Address
```bash
# Get container IP
docker inspect mikopbx_php83 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'

# Example output:
# 192.168.117.2
```

## Common Port Issues

### Port Already in Use

```bash
# Find what's using port 8445
lsof -i :8445

# Or on macOS
sudo lsof -i :8445

# Kill the process
kill -9 <PID>
```

### Port Not Accessible

```bash
# Check if port is actually mapped
docker port mikopbx_php83 8445

# Check firewall
sudo pfctl -s rules | grep 8445

# Check container is running
docker ps | grep mikopbx_php83
```

### Wrong Port in Configuration

```bash
# Check actual running config
docker exec mikopbx_php83 sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_PBXSettings WHERE key='WEBHTTPSPort'"

# Compare with docker port mapping
docker port mikopbx_php83
```

## Port Ranges

### RTP Ports (Media Streams)

**mikopbx_php83**:
- Range: 10000-10200
- Used for: Audio/video call media
- Must be accessible: Yes (if using SIP from external)

**mikopbx_php74**:
- Range: 10000-10999
- Used for: Audio/video call media
- Must be accessible: Yes (if using SIP from external)

### SIP Port

- Default: 5060 (UDP and TCP)
- Used for: SIP signaling
- Must be accessible: Yes (for external SIP clients)

### IAX Port

- php83: 4569
- php74: 7000
- Used for: IAX2 protocol (trunk connections)
- Must be accessible: Only if using IAX trunks

## Environment Variables

Docker compose often uses environment variables for port configuration:

```yaml
# Example from docker-compose.yml
environment:
  - WEB_PORT=8081
  - WEB_HTTPS_PORT=8445
  - SIP_PORT=5060
  - SSH_PORT=8023
```

These get stored in `m_PBXSettings` table on first run.
