// DIAL alerts: every error, warning and notice in one list.
//
// Anything in the firmware raises or clears a condition with
//   dial::alert_set(dial::NO_INVERTER, true);
// or shows a short notice with
//   dial::alert_pulse(dial::SETTING_SET, 10000);
// dial-core.yaml turns the list into the Alert entities, the web page banner
// and the status LED. The full list with what each one means is
// dial-pcb/docs/ALERTS.md; keep the two in step.
//
// Settings written to the inverter are checked here too: a profile calls
// dial::write_sent() from the setting's write_lambda and dial::write_read()
// from its read lambda, and DIAL raises WRITE_FAILED if the inverter does not
// read back what was written.
#pragma once
#include <cmath>
#include <cstdint>
#include <string>
#include "esphome/core/hal.h"
#include "esphome/core/log.h"
#include <esp_system.h>

namespace dial {

enum Severity : uint8_t { INFO = 0, WARNING = 1, CRITICAL = 2 };

// Order matters: within one severity the first listed wins.
enum Alert : uint8_t {
  NO_INVERTER,
  WRITE_FAILED,
  FALLBACK_FIRED,
  RESET_HOLD,
  WRONG_PROFILE,
  INVERTER_HOT,
  LOW_BATTERY,
  HA_LOST,
  BROWNOUT,
  CRASHED,
  HW_UNKNOWN,
  CHIP_HOT,
  WEAK_WIFI,
  UPDATING,
  STARTING,
  SETTING_SET,
  GRID_DOWN,
  DRY_CONTACT,
  ALERT_COUNT
};

struct AlertDef {
  const char *code;
  Severity sev;
  const char *text;
};

inline const AlertDef ALERTS[ALERT_COUNT] = {
    {"no_inverter", CRITICAL, "No answer from the inverter. Check the lead, that the inverter is on, and the profile."},
    {"write_failed", CRITICAL, "A setting did not reach the inverter. Try again; if it repeats, the inverter refuses it in its current mode."},
    {"fallback_fired", CRITICAL, "Home Assistant was gone for 15 minutes, so DIAL put grid charging back to the safe level."},
    {"reset_hold", WARNING, "BOOT held 10 s. Letting go now erases Wi-Fi and the Home Assistant key."},
    {"wrong_profile", WARNING, "The inverter answers, but the values make no sense. This build may not match this inverter."},
    {"inverter_hot", WARNING, "Inverter temperature is high. Check the inverter's ventilation."},
    {"low_battery", WARNING, "Battery is below the low battery level."},
    {"ha_lost", WARNING, "Home Assistant has not been connected for over 2 minutes."},
    {"brownout", WARNING, "DIAL restarted because its power dipped. Use a better USB supply or cable."},
    {"crashed", WARNING, "DIAL restarted after a fault. If it repeats, report it with the firmware version."},
    {"hw_unknown", WARNING, "The board type cannot be read. Board fault or wrong build."},
    {"chip_hot", WARNING, "DIAL itself is hot. Move it away from the inverter's heat."},
    {"weak_wifi", INFO, "Weak Wi-Fi signal."},
    {"updating", INFO, "Firmware update running. Do not unplug DIAL."},
    {"starting", INFO, "Starting, waiting for the first answer from the inverter."},
    {"setting_set", INFO, "Setting saved and confirmed by the inverter."},
    {"grid_down", INFO, "Grid is down, running on battery."},
    {"dry_contact", INFO, "The dry contact is closed."},
};

inline bool alert_on[ALERT_COUNT] = {};
inline uint32_t alert_until[ALERT_COUNT] = {};  // for pulsed notices, millis()

inline void alert_set(Alert a, bool on) {
  if (alert_on[a] != on) {
    if (on)
      ESP_LOGW("dial.alert", "%s: %s", ALERTS[a].code, ALERTS[a].text);
    else
      ESP_LOGI("dial.alert", "%s cleared", ALERTS[a].code);
  }
  alert_on[a] = on;
  alert_until[a] = 0;
}

inline void alert_pulse(Alert a, uint32_t ms) {
  alert_on[a] = true;
  alert_until[a] = esphome::millis() + ms;
}

// expire pulsed notices; call before reading the list
inline void alert_tick() {
  const uint32_t now = esphome::millis();
  for (int i = 0; i < ALERT_COUNT; i++)
    if (alert_until[i] && (int32_t) (now - alert_until[i]) >= 0) {
      alert_on[i] = false;
      alert_until[i] = 0;
    }
}

// the alert to show: highest severity, then list order; -1 when all is fine
inline int alert_top() {
  for (int sev = CRITICAL; sev >= INFO; sev--)
    for (int i = 0; i < ALERT_COUNT; i++)
      if (alert_on[i] && ALERTS[i].sev == sev)
        return i;
  return -1;
}

inline int alert_worst() {
  int t = alert_top();
  return t < 0 ? -1 : ALERTS[t].sev;
}

inline std::string alert_list() {
  std::string s;
  for (int i = 0; i < ALERT_COUNT; i++)
    if (alert_on[i]) {
      if (!s.empty())
        s += ",";
      s += ALERTS[i].code;
    }
  return s.empty() ? "ok" : s;
}

// ------------------------------------------------------------------ write check
// One slot per checked setting. A write is confirmed when a later read of the
// same register matches. It fails if WRITE_CHECK_MS pass, or WRITE_CHECK_READS
// reads arrive, without a match. One stale read right after the write is
// normal (it was already queued), so a single mismatch is not a failure.
static const int WRITE_SLOTS = 8;
static const uint32_t WRITE_CHECK_MS = 30000;
static const int WRITE_CHECK_READS = 3;

struct WriteCheck {
  const char *name = nullptr;
  bool pending = false;
  float want = NAN;
  uint32_t at = 0;
  int reads = 0;
};
inline WriteCheck write_checks[WRITE_SLOTS];
inline uint32_t write_ok_count = 0;
inline uint32_t write_fail_count = 0;
inline std::string write_last = "none yet";

inline void write_sent(int slot, const char *name, float want) {
  WriteCheck &w = write_checks[slot];
  w.name = name;
  w.pending = true;
  w.want = want;
  w.at = esphome::millis();
  w.reads = 0;
  ESP_LOGI("dial.write", "%s: sent %.1f, waiting for the read back", name, want);
}

inline void write_result_(WriteCheck &w, bool ok, float got) {
  w.pending = false;
  char buf[96];
  if (ok) {
    write_ok_count++;
    snprintf(buf, sizeof buf, "%s %.1f: confirmed", w.name, w.want);
    ESP_LOGI("dial.write", "%s", buf);
    alert_set(WRITE_FAILED, false);
    alert_pulse(SETTING_SET, 10000);
  } else {
    write_fail_count++;
    if (std::isnan(got))
      snprintf(buf, sizeof buf, "%s %.1f: no read back", w.name, w.want);
    else
      snprintf(buf, sizeof buf, "%s %.1f: inverter has %.1f", w.name, w.want, got);
    ESP_LOGE("dial.write", "%s", buf);
    alert_pulse(WRITE_FAILED, 15 * 60 * 1000);  // until a write confirms, or 15 min
  }
  write_last = buf;
}

inline void write_read(int slot, float got) {
  WriteCheck &w = write_checks[slot];
  if (!w.pending || std::isnan(got))
    return;
  // ignore reads that were already on the way when the write went out
  if (esphome::millis() - w.at < 1000)
    return;
  if (std::fabs(got - w.want) < 0.5f) {
    write_result_(w, true, got);
    return;
  }
  if (++w.reads >= WRITE_CHECK_READS)
    write_result_(w, false, got);
}

// call every few seconds: catches writes that never got any read back
inline void write_tick() {
  for (auto &w : write_checks)
    if (w.pending && esphome::millis() - w.at > WRITE_CHECK_MS)
      write_result_(w, false, NAN);
}

}  // namespace dial
