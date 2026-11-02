# Adding an inverter, or a feature

Thank you. Most useful of all is a profile for an inverter DIAL does not
support yet. You do not need to touch the page or the core.

## A new inverter profile

1. **Copy** `profiles/growatt-spf.yaml` to `profiles/<brand>-<model>.yaml`
   and `dial-growatt-spf.yaml` to `dial-<brand>-<model>.yaml`, and point the
   new build file at your profile (`profile:` and the `!include`).
2. **Bus settings:** baud rate, Modbus address, and which registers hold
   what. Good sources: the maker's Modbus PDF,
   [ha-solarman](https://github.com/davidrapan/ha-solarman) inverter
   definitions (MIT, keep the attribution in your file header), ESPHome's
   `pipsolar` component for the Voltronic family (RS232).
3. **Provide these ids.** The page, the history charts, the OLED and the
   LED use them, so every profile has them:

   | id | type | name to use |
   |---|---|---|
   | `battery_soc` | sensor, % | Battery SOC |
   | `battery_voltage` | sensor, V | Battery Voltage |
   | `pv_power` | sensor, W | PV Power |
   | `load_power` | sensor, W | Load Power |
   | `grid_voltage` | sensor, V | Grid Voltage |
   | `battery_state` | text_sensor: Charging, Discharging or Idle | Battery State |
   | `inv_connected` | binary_sensor: the inverter answers | Inverter Connected |

   Use the same **names** where your inverter has the same thing (PV
   Voltage, Grid Frequency, Charge Current Limit, Charger Source and so on,
   see the Growatt profile): Home Assistant dashboards and the page's tiles
   go by name.
4. **Your own settings** (number, select or switch entities) appear on
   DIAL's page under "More settings" by themselves, with the name you give
   them. Give every writable number a real `min_value` and `max_value` from
   the inverter's manual. DIAL refuses values outside them.
5. **Turn the LED:** in your controller's `on_online` / `on_offline`, set
   `status_led` to the `Breathe` and `Searching` effects, as the Growatt
   profile does.
6. **Test** on your own inverter: compare five readings with the inverter's
   screen, and change one harmless setting from DIAL and back. Say in the
   pull request which model and inverter firmware you tested, and add a line
   to the table in README.md as `Tested` or `Untested`.

## Lead pinout

Say which pins of the inverter's port carry RS485 A, B and ground (or RS232
TX, RX, ground). DIAL's own socket: pin 4 A, pin 5 B, 3 and 6 ground,
1 RS232 RX, 2 RS232 TX, 8 RS232 ground.

## A feature

Open an issue first for anything bigger than a fix, so we can agree where
it goes. Features that work for every inverter belong in `dial-core.yaml`
or the page; inverter specific ones in the profile. Keep the page working
with no internet: no CDN, no external fonts.

## Releases

The maintainer bumps `dial_version` in `dial-core.yaml` and tags
`v<same version>`. GitHub then builds every `dial-*.yaml`, attaches the
files to the release, and publishes them to GitHub Pages, where DIALs find
the update.
