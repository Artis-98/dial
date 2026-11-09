# DIAL firmware

DIAL is a small box on a solar hybrid inverter's RS485 port. It reads the
inverter and **writes its settings back**: charge current, charger source,
when the grid may charge the battery. It has its own page on your network
and shows up in Home Assistant by itself. No cloud, no account, no app.

This is the open firmware, built on [ESPHome](https://esphome.io). The
assembled hardware is sold by [SIA IITEG](https://dial.iiteg.com), but the
firmware is free for anyone, and so is adding your inverter to it.

## Supported inverters

| Profile | Inverters | Status |
|---|---|---|
| `growatt-spf` | Growatt SPF 3000 to 6000 ES Plus | Tested |

Your inverter is not listed? See [CONTRIBUTING.md](CONTRIBUTING.md). A new
inverter is one profile file; the page and everything else adapt to it.

## Smart charging

To have Home Assistant charge the battery from the grid at the cheapest
time, install [DIAL Smart Charge](https://github.com/Artis-98/dial-smart-charge)
from HACS. It finds a DIAL by itself.

## Updating your DIAL

* **Home Assistant** shows "Firmware Update" when a new release is out.
  Press Install.
* **DIAL's own page** (`http://dial-xxxxxx.local`) shows the same, under
  DIAL, with an Install update button.
* **By hand:** download `dial-<profile>.ota.bin` from
  [Releases](https://github.com/Artis-98/dial/releases) and use Update
  firmware on DIAL's page.
* **New or bricked board:** flash it from the browser over USB at
  [artis-98.github.io/dial](https://artis-98.github.io/dial/).

DIAL fetches updates for its own profile only, from this repository's
GitHub Pages.

## How it is laid out

```
dial-core.yaml           the board: Wi-Fi, Home Assistant API, page, LED, buttons,
                         24 h history, OLED, updates. Same for every inverter.
profiles/<name>.yaml     one inverter: how to talk to it, what it reads and writes
dial-<name>.yaml         a build: core + one profile. GitHub builds each on release
web/dial-ui.js           DIAL's own page, served from the device, works offline
web/setup.html           the DIAL-Setup hotspot page (packed by web/build_setup.py)
components/              captive portal with DIAL's page, and dial_history
static/                  the web flasher on GitHub Pages
```

## Build it yourself

```bash
pip install esphome==2026.10.1
esphome run dial-growatt-spf.yaml
```

The first build downloads ESP-IDF and takes a few minutes. On Windows,
build from PowerShell, not Git Bash.

## Setup, security, reset

1. Plug DIAL into the inverter with the right lead and power it from USB-C.
2. Join the Wi-Fi **DIAL-Setup** (password `dialsetup`) and pick your home
   network.
3. Open the address the setup page shows, `http://dial-xxxxxx.local`.
4. In Home Assistant press Configure on the new device. Home Assistant gives
   your DIAL its own encryption key, which also protects updates.

Hold BOOT for 10 seconds (the LED goes solid) to wipe the key and Wi-Fi.

DIAL's own page has no login yet: anyone on your network can open it. Keep
DIAL on a network you trust.

## Licence

MIT for DIAL's own files; see [NOTICE.md](NOTICE.md) for the ESPHome parts.
Not affiliated with any inverter maker. Changing inverter settings is your
responsibility, exactly as on the inverter's own keypad.
