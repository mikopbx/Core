#!/bin/bash
# Fix dylib paths to use @loader_path instead of ../lib

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

echo "Fixing dylib paths in ${SCRIPT_DIR}..."

# List of all PJSIP libraries
LIBS=(
    "libpj.dylib.2"
    "libpjlib-util.dylib.2"
    "libpjmedia.dylib.2"
    "libpjmedia-audiodev.dylib.2"
    "libpjmedia-codec.dylib.2"
    "libpjmedia-videodev.dylib.2"
    "libpjnath.dylib.2"
    "libpjsdp.dylib.2"
    "libpjsip.dylib.2"
    "libpjsip-simple.dylib.2"
    "libpjsip-ua.dylib.2"
    "libpjsua.dylib.2"
    "libpjsua2.dylib.2"
    "libresample.dylib.2"
    "libspeex.dylib.2"
    "libsrtp.dylib.2"
    "libwebrtc.dylib.2"
    "libyuv.dylib.2"
    "libg7221codec.dylib.2"
    "libgsmcodec.dylib.2"
    "libilbccodec.dylib.2"
)

# External dependencies that are copied locally
EXTERNAL_LIBS=(
    "libsrtp.dylib.2"
    "libopus.0.dylib"
    "libssl.3.dylib"
    "libcrypto.3.dylib"
    "libSDL2-2.0.0.dylib"
    "libopencore-amrnb.0.dylib"
    "libopencore-amrwb.0.dylib"
    "libgnutls.30.dylib"
)

# Fix paths for each library
for lib in "${LIBS[@]}"; do
    if [ -f "${lib}" ]; then
        echo "Processing ${lib}..."

        # Fix ../lib/ references to use @loader_path
        for dep in "${LIBS[@]}"; do
            install_name_tool -change "../lib/${dep}" "@loader_path/${dep}" "${lib}" 2>/dev/null || true
        done

        # Fix ../../lib/ references to use @loader_path
        for dep in "${LIBS[@]}"; do
            install_name_tool -change "../../lib/${dep}" "@loader_path/${dep}" "${lib}" 2>/dev/null || true
        done

        # Fix external library references
        for dep in "${EXTERNAL_LIBS[@]}"; do
            install_name_tool -change "../../lib/${dep}" "@loader_path/${dep}" "${lib}" 2>/dev/null || true
        done
    fi
done

# Fix _pjsua2.cpython-311-darwin.so
if [ -f "_pjsua2.cpython-311-darwin.so" ]; then
    echo "Processing _pjsua2.cpython-311-darwin.so..."
    for dep in "${LIBS[@]}"; do
        install_name_tool -change "../lib/${dep}" "@loader_path/${dep}" "_pjsua2.cpython-311-darwin.so" 2>/dev/null || true
        install_name_tool -change "../../lib/${dep}" "@loader_path/${dep}" "_pjsua2.cpython-311-darwin.so" 2>/dev/null || true
    done
    for dep in "${EXTERNAL_LIBS[@]}"; do
        install_name_tool -change "../../lib/${dep}" "@loader_path/${dep}" "_pjsua2.cpython-311-darwin.so" 2>/dev/null || true
    done
fi

echo "Done! All paths fixed."
