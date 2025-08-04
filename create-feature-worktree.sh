#!/bin/bash

# MikoPBX Feature Worktree Setup Script
# Run this from the Core directory to create a new feature branch with worktree and Docker setup

set -e

# Get the directory paths
CORE_DIR="$(pwd)"
DEV_DOCKER_DIR="$(dirname "$CORE_DIR")/dev_docker"

function show_usage() {
    echo "Usage: $0 <feature-name> [base-branch] [ports]"
    echo ""
    echo "Creates a new feature branch, git worktree, and Docker infrastructure"
    echo ""
    echo "Arguments:"
    echo "  feature-name   The name for your feature branch"
    echo "  base-branch    Optional base branch (default: current branch)"
    echo "  ports          Optional port configuration (SSH:HTTP:HTTPS), e.g., '8028:8086:8449'"
    echo ""
    echo "Examples:"
    echo "  $0 my-new-feature"
    echo "  $0 api-improvements develop"
    echo "  $0 bug-fix master 8030:8088:8451"
    echo ""
}

function get_current_branch() {
    git rev-parse --abbrev-ref HEAD
}

function get_next_available_ports() {
    local ssh_port=8028
    local http_port=8086
    local https_port=8449
    
    # Check existing docker-compose files for used ports
    if [ -d "$DEV_DOCKER_DIR" ]; then
        while IFS= read -r compose_file; do
            if [ -f "$compose_file" ]; then
                local ports_in_use=$(grep -E "\"[0-9]+:[0-9]+\"" "$compose_file" | grep -oE "[0-9]+:" | grep -oE "[0-9]+" | sort -n)
                for port in $ports_in_use; do
                    if [ "$port" -ge "$ssh_port" ] && [ "$port" -lt 8030 ]; then
                        ssh_port=$((port + 1))
                    fi
                    if [ "$port" -ge "$http_port" ] && [ "$port" -lt 8090 ]; then
                        http_port=$((port + 1))
                    fi
                    if [ "$port" -ge "$https_port" ] && [ "$port" -lt 8460 ]; then
                        https_port=$((port + 1))
                    fi
                done
            fi
        done < <(find "$DEV_DOCKER_DIR" -name "docker-compose-*.yml" 2>/dev/null)
    fi
    
    echo "$ssh_port:$http_port:$https_port"
}

function create_feature_branch() {
    local feature_name="$1"
    local base_branch="$2"
    
    echo "Creating feature branch '$feature_name' based on '$base_branch'..."
    
    # Fetch latest changes
    git fetch origin
    
    # Create the new branch
    if git show-ref --verify --quiet "refs/heads/$feature_name"; then
        echo "Branch '$feature_name' already exists locally"
        read -p "Do you want to delete and recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git branch -D "$feature_name"
            git checkout -b "$feature_name" "$base_branch"
        else
            echo "Using existing branch '$feature_name'"
        fi
    else
        git checkout -b "$feature_name" "$base_branch"
    fi
}

function create_worktree() {
    local feature_name="$1"
    local project_dir="../project-$feature_name"
    
    echo "Creating git worktree for branch '$feature_name'..."
    
    # Remove existing worktree if it exists
    if [ -d "$project_dir" ]; then
        echo "Removing existing worktree at $project_dir..."
        git worktree remove "$project_dir" --force 2>/dev/null || rm -rf "$project_dir"
    fi
    
    # Create the worktree
    git worktree add "$project_dir" "$feature_name"
    
    echo "✓ Worktree created at $project_dir"
}

function create_docker_infrastructure() {
    local feature_name="$1"
    local ssh_port="$2"
    local http_port="$3"
    local https_port="$4"
    
    local safe_name=$(echo "$feature_name" | sed 's/[^a-zA-Z0-9]/-/g')
    local compose_file="$DEV_DOCKER_DIR/docker-compose-$safe_name.yml"
    local start_script="$DEV_DOCKER_DIR/start-$safe_name.sh"
    local readme_file="$DEV_DOCKER_DIR/README-$safe_name.md"
    
    echo "Creating Docker infrastructure..."
    
    # Create dev_docker directory if it doesn't exist
    mkdir -p "$DEV_DOCKER_DIR"
    
    # Create project cache directories
    mkdir -p "$DEV_DOCKER_DIR/tmp/projects/$safe_name"/{cf,storage,assets/{js,css,img}}
    
    # Create docker-compose.yml
    cat > "$compose_file" << EOF
services:
  mikopbx-${safe_name}:
    ports:
      - "${ssh_port}:${ssh_port}"  # SSH port
      - "${http_port}:${http_port}"  # Web port  
      - "${https_port}:${https_port}"  # HTTPS port
    container_name: "mikopbx_${safe_name}"
    hostname: "mikopbx-${safe_name}"
    image: "mikopbx/develop:2025.ARM.10"
    entrypoint: "/sbin/docker-entrypoint"
    restart: unless-stopped
    volumes:
      - ./resources/15-xdebug.ini:/etc/php.d/15-xdebug.ini:ro
      - ./resources/version.ini:/etc/version:ro
      - ./resources/nginx.disablecaches.conf:/etc/nginx/mikopbx/locations/static.conf:ro
      - ../Core/vendor:/offload/rootfs/usr/www/vendor:ro
      - ./tmp/projects/${safe_name}/cf:/cf
      - ./tmp/projects/${safe_name}/storage:/storage
      - ../project-${feature_name}/sites/admin-cabinet:/offload/rootfs/usr/www/sites/admin-cabinet:ro
      - ../project-${feature_name}/src:/offload/rootfs/usr/www/src:ro
      - ../project-${feature_name}/tests:/offload/rootfs/usr/www/tests:ro
      - ./tmp/projects/${safe_name}/storage/usbdisk1/mikopbx/tmp/www_cache/files_cache:/offload/rootfs/usr/www/sites/pbxcore/files/cache:rw
      - ../project-${feature_name}/sites/admin-cabinet/assets/js:/offload/rootfs/usr/www/sites/admin-cabinet/assets/js:rw
      - ../project-${feature_name}/sites/admin-cabinet/assets/css:/offload/rootfs/usr/www/sites/admin-cabinet/assets/css:rw
    environment:
      - PHP_IDE_CONFIG=serverName=mikopbx-${safe_name}
      - PBX_NAME=PHP8.3-$(echo "${feature_name}" | sed 's/.*/\u&/')
      - PBX_DESCRIPTION=MikoPBX with ${feature_name} feature pass  123456789MikoPBX#1
      - WEB_ADMIN_PASSWORD=123456789MikoPBX#1
      - SSH_PASSWORD=123456789MikoPBX#1
      - SSH_DISABLE_SSH_PASSWORD=0
      - AUTO_UPDATE_EXTERNAL_IP=0
      - SEND_METRICS=0
      - PBX_FIREWALL_ENABLED=1
      - PBX_FAIL2BAN_ENABLED=1
      - SSH_PORT=${ssh_port}
      - WEB_PORT=${http_port}
      - WEB_HTTPS_PORT=${https_port}
      - ID_WWW_USER=501
      - ID_WWW_GROUP=501
      - BROWSERSTACK_USERNAME=bsuser63039
      - BROWSERSTACK_ACCESS_KEY=hqQXx7KMkEj3yMqoHArr
      - BROWSERSTACK_LOCAL=true
      - BROWSERSTACK_LOCAL_IDENTIFIER=local_test_${safe_name}
      - BROWSERSTACK_DAEMON_START=true
      - SERVER_PBX=https://maclic.miko.ru:${https_port}
      - MIKO_LICENSE_KEY=MIKO-GW0DC-QEQQD-WN87S-C88PG
      - SSH_RSA_KEYS_SET=ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAAAgQDZ3hd6/gqPxMMCqFytFdVznYD3Debp2LKTRiJEaS2SSIRHtE9jMNJjCfMR3CnScjKFh19Hfg/SJf2/rmXIJOHNjZvZZ7GgPTMBYllj3okniCA4/vQQRd6FMVPa9Rhu+N2kyMoQcuDEhzL5kEw0ge5BJJcmNjzW+an3fKqB7QwfMQ== jorikfon@MacBook-Pro-Nikolay.local
      - BUILD_NUMBER=miko-local-vscode-${safe_name}
      - SELENIUM_COOKIE_DIR=C:/Users/hello/Documents
      - CONFIG_FILE=/offload/rootfs/usr/www/tests/AdminCabinet/config/local.conf.json.template
EOF

    # Create start script
    cat > "$start_script" << EOF
#!/bin/bash

# Start MikoPBX ${feature_name} Container
echo "Starting MikoPBX ${feature_name} container..."

# Navigate to dev_docker directory
cd "\$(dirname "\$0")"

# Stop any existing container
docker-compose -f docker-compose-${safe_name}.yml down

# Start the container
docker-compose -f docker-compose-${safe_name}.yml up -d

# Wait for container to start
echo "Waiting for container to start..."
sleep 5

# Show container status
echo "Container status:"
docker ps | grep mikopbx_${safe_name}

echo ""
echo "MikoPBX ${feature_name} is starting up..."
echo "Web interface will be available at:"
echo "  - HTTP:  http://localhost:${http_port}"
echo "  - HTTPS: https://localhost:${https_port}"
echo "  - SSH:   ssh root@localhost -p ${ssh_port}"
echo ""
echo "Default credentials:"
echo "  - Web: admin / 123456789MikoPBX#1"
echo "  - SSH: root / 123456789MikoPBX#1"
echo ""
echo "To view logs: docker logs -f mikopbx_${safe_name}"
echo "To stop: docker-compose -f docker-compose-${safe_name}.yml down"
EOF

    # Create README
    cat > "$readme_file" << EOF
# MikoPBX ${feature_name} Docker Setup

This setup creates a separate Docker container for testing the MikoPBX ${feature_name} feature.

## Ports Configuration

The container uses unique ports to avoid conflicts with other MikoPBX containers:

- **SSH**: ${ssh_port}
- **HTTP**: ${http_port}
- **HTTPS**: ${https_port}

## Directory Mapping

The container mounts source code from \`../project-${feature_name}\` instead of \`../Core\`, allowing you to test the ${feature_name} feature in isolation.

## Quick Start

1. Start the container:
   \`\`\`bash
   ./start-${safe_name}.sh
   \`\`\`

2. Access the web interface:
   - HTTP: http://localhost:${http_port}
   - HTTPS: https://localhost:${https_port}

3. SSH access:
   \`\`\`bash
   ssh root@localhost -p ${ssh_port}
   \`\`\`

## Default Credentials

- Web interface: admin / 123456789MikoPBX#1
- SSH: root / 123456789MikoPBX#1

## Container Management

- **View logs**: \`docker logs -f mikopbx_${safe_name}\`
- **Stop container**: \`docker-compose -f docker-compose-${safe_name}.yml down\`
- **Restart container**: \`docker-compose -f docker-compose-${safe_name}.yml restart\`
- **Access shell**: \`docker exec -it mikopbx_${safe_name} /bin/sh\`

## Data Persistence

Container data is stored in:
- \`./tmp/projects/${safe_name}/cf/\` - Configuration files
- \`./tmp/projects/${safe_name}/storage/\` - Storage data, logs, etc.
EOF

    # Make start script executable
    chmod +x "$start_script"
    
    echo "✓ Docker compose file created: $compose_file"
    echo "✓ Start script created: $start_script"
    echo "✓ README created: $readme_file"
}

function main() {
    if [ $# -lt 1 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_usage
        exit 0
    fi
    
    local feature_name="$1"
    local base_branch="${2:-$(get_current_branch)}"
    local ports="$3"
    
    # Validate we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo "Error: Not in a git repository. Please run this script from the Core directory."
        exit 1
    fi
    
    # Parse or generate ports
    if [ -n "$ports" ]; then
        IFS=':' read -r ssh_port http_port https_port <<< "$ports"
        if [ -z "$ssh_port" ] || [ -z "$http_port" ] || [ -z "$https_port" ]; then
            echo "Error: Invalid port format. Use SSH:HTTP:HTTPS (e.g., 8028:8086:8449)"
            exit 1
        fi
    else
        ports_result=$(get_next_available_ports)
        IFS=':' read -r ssh_port http_port https_port <<< "$ports_result"
    fi
    
    echo "Setting up feature development environment"
    echo "Feature name: $feature_name"
    echo "Base branch: $base_branch"
    echo "Ports: SSH=$ssh_port, HTTP=$http_port, HTTPS=$https_port"
    echo ""
    
    # Create feature branch
    create_feature_branch "$feature_name" "$base_branch"
    
    # Switch back to base branch to create worktree
    git checkout "$base_branch"
    
    # Create worktree
    create_worktree "$feature_name"
    
    # Create Docker infrastructure
    create_docker_infrastructure "$feature_name" "$ssh_port" "$http_port" "$https_port"
    
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "Your feature branch '$feature_name' has been created with:"
    echo "  - Git worktree at: ../project-$feature_name"
    echo "  - Docker setup in: ../dev_docker/"
    echo ""
    echo "Next steps:"
    echo "1. cd ../project-$feature_name  # Switch to your feature worktree"
    echo "2. ../dev_docker/start-$(echo "$feature_name" | sed 's/[^a-zA-Z0-9]/-/g').sh  # Start Docker container"
    echo "3. Access web interface: http://localhost:$http_port"
    echo ""
    echo "For more details, see ../dev_docker/README-$(echo "$feature_name" | sed 's/[^a-zA-Z0-9]/-/g').md"
}

# Run main function
main "$@"