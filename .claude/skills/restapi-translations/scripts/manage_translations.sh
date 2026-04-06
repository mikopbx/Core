#!/bin/bash
# REST API Translation Management Tool
# Main wrapper script for managing RestApi.php translations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="${PYTHON:-python3}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check Python availability
if ! command -v "$PYTHON" &> /dev/null; then
    print_error "Python 3 not found. Please install Python 3."
    exit 1
fi

# Main menu
show_menu() {
    print_header "REST API Translation Management"
    echo "1. Extract keys from source code"
    echo "2. Validate translations"
    echo "3. Add missing keys"
    echo "4. Remove unused keys"
    echo "5. Full sync (add + remove)"
    echo "6. Preview changes (dry run)"
    echo "7. Run all (extract + validate + sync)"
    echo "0. Exit"
    echo ""
}

# Execute extract
do_extract() {
    print_header "Extracting REST API Keys from Source Code"
    "$PYTHON" "$SCRIPT_DIR/extract_keys.py"
    print_success "Extraction complete!"
}

# Execute validate
do_validate() {
    print_header "Validating Translation Keys"
    "$PYTHON" "$SCRIPT_DIR/validate_translations.py"
}

# Execute sync with options
do_sync() {
    local add_missing="$1"
    local remove_unused="$2"
    local dry_run="$3"

    local args=()
    [[ "$add_missing" == "true" ]] && args+=("--add-missing")
    [[ "$remove_unused" == "true" ]] && args+=("--remove-unused")
    [[ "$dry_run" == "true" ]] && args+=("--dry-run")

    if [ ${#args[@]} -eq 0 ]; then
        print_error "No sync options specified"
        return 1
    fi

    print_header "Synchronizing Translation Keys"
    "$PYTHON" "$SCRIPT_DIR/sync_translations.py" "${args[@]}"
}

# Interactive mode
interactive_mode() {
    while true; do
        show_menu
        read -rp "Select option [0-7]: " choice

        case $choice in
            1)
                do_extract
                ;;
            2)
                do_validate
                ;;
            3)
                do_sync "true" "false" "false"
                ;;
            4)
                do_sync "false" "true" "false"
                ;;
            5)
                do_sync "true" "true" "false"
                ;;
            6)
                do_sync "true" "true" "true"
                ;;
            7)
                do_extract
                echo ""
                do_validate
                echo ""
                read -rp "Proceed with sync? [y/N]: " proceed
                if [[ "$proceed" =~ ^[Yy]$ ]]; then
                    do_sync "true" "true" "false"
                else
                    print_warning "Sync cancelled"
                fi
                ;;
            0)
                print_success "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option: $choice"
                ;;
        esac

        echo ""
        read -rp "Press Enter to continue..."
    done
}

# Command-line mode
if [ $# -eq 0 ]; then
    # No arguments - run interactive mode
    interactive_mode
else
    # Parse command-line arguments
    case "$1" in
        extract)
            do_extract
            ;;
        validate)
            do_validate
            ;;
        sync)
            shift
            add_missing="false"
            remove_unused="false"
            dry_run="false"

            while [ $# -gt 0 ]; do
                case "$1" in
                    --add-missing)
                        add_missing="true"
                        ;;
                    --remove-unused)
                        remove_unused="true"
                        ;;
                    --dry-run)
                        dry_run="true"
                        ;;
                    *)
                        print_error "Unknown option: $1"
                        exit 1
                        ;;
                esac
                shift
            done

            do_sync "$add_missing" "$remove_unused" "$dry_run"
            ;;
        all)
            do_extract
            echo ""
            do_validate
            echo ""
            do_sync "true" "true" "false"
            ;;
        help|--help|-h)
            echo "Usage: $0 [command] [options]"
            echo ""
            echo "Commands:"
            echo "  extract              Extract keys from source code"
            echo "  validate             Validate translations"
            echo "  sync [options]       Synchronize translations"
            echo "  all                  Run extract + validate + sync"
            echo "  help                 Show this help"
            echo ""
            echo "Sync options:"
            echo "  --add-missing        Add missing keys to RestApi.php"
            echo "  --remove-unused      Remove unused keys from RestApi.php"
            echo "  --dry-run            Preview changes without modifying"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Interactive mode"
            echo "  $0 extract                            # Extract keys only"
            echo "  $0 validate                           # Validate only"
            echo "  $0 sync --add-missing                 # Add missing keys"
            echo "  $0 sync --add-missing --dry-run       # Preview additions"
            echo "  $0 sync --add-missing --remove-unused # Full sync"
            echo "  $0 all                                # Complete workflow"
            ;;
        *)
            print_error "Unknown command: $1"
            echo "Run '$0 help' for usage information"
            exit 1
            ;;
    esac
fi
