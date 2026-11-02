"""Pack web/setup.html into components/captive_portal/captive_index.h (gzip).

    py -3 web/build_setup.py

components/captive_portal is ESPHome's own captive_portal copied from the
installed ESPHome (2026.10.1) with only this page swapped. After an ESPHome
upgrade, copy the component again and rerun this script.
"""
import gzip
import os

HERE = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(HERE, "setup.html")
dst = os.path.join(HERE, "..", "components", "captive_portal", "captive_index.h")

data = gzip.compress(open(src, "rb").read(), compresslevel=9, mtime=0)
rows = [", ".join(f"0x{b:02x}" for b in data[i:i + 19]) for i in range(0, len(data), 19)]
body = ",\n    ".join(rows)
with open(dst, "w", encoding="utf-8", newline="\n") as f:
    f.write(f"""#pragma once
// DIAL setup page, generated from web/setup.html by web/build_setup.py. Do not edit.

#include "esphome/core/hal.h"

namespace esphome::captive_portal {{

#ifndef USE_CAPTIVE_PORTAL_GZIP
#error "DIAL's setup page is gzip only: leave captive_portal compression at its default"
#endif

constexpr uint8_t INDEX_GZ[] PROGMEM = {{
    {body}}};

}}  // namespace esphome::captive_portal
""")
print(f"{os.path.relpath(dst, HERE)}: {len(data)} bytes gzip")
