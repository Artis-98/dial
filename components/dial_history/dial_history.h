#pragma once

#include <cmath>
#include <cstdint>
#include <vector>

#include "esphome/components/sensor/sensor.h"
#include "esphome/components/web_server_base/web_server_base.h"
#include "esphome/core/component.h"
#include "esphome/core/hal.h"

namespace esphome::dial_history {

// Ring buffer of per-interval means, served as
// {"step":60,"age":12,"n":3,"s":{"soc":[70,70,69],...}} oldest first.
// "age" is seconds since the newest point, so the browser can place points in
// time without DIAL knowing the clock. Values are sensor * scale, rounded.
class DialHistory : public PollingComponent, public AsyncWebHandler {
 public:
  explicit DialHistory(web_server_base::WebServerBase *base) : base_(base) {}

  void set_points(uint16_t n) { this->points_ = n; }
  void set_point_every(uint32_t ms) { this->point_ms_ = ms; }
  void add_series(const char *key, sensor::Sensor *sensor, float scale) {
    this->series_.push_back(Series{key, sensor, scale, {}, 0.0f, 0});
  }

  void setup() override {
    for (auto &s : this->series_)
      s.data.assign(this->points_, EMPTY);
    this->last_point_ = millis();
    this->base_->init();
    this->base_->add_handler(this);
  }

  void update() override {
    for (auto &s : this->series_) {
      const float v = s.sensor->state;
      if (std::isfinite(v)) {
        s.sum += v;
        s.count++;
      }
    }
    const uint32_t now = millis();
    if (now - this->last_point_ < this->point_ms_)
      return;
    this->last_point_ = now;
    for (auto &s : this->series_) {
      int16_t q = EMPTY;
      if (s.count > 0) {
        const float m = roundf(s.sum / s.count * s.scale);
        q = static_cast<int16_t>(m > 32767.0f ? 32767.0f : (m < -32767.0f ? -32767.0f : m));
      }
      s.data[this->head_] = q;
      s.sum = 0.0f;
      s.count = 0;
    }
    this->head_ = (this->head_ + 1) % this->points_;
    if (this->filled_ < this->points_)
      this->filled_++;
  }

  float get_setup_priority() const override { return setup_priority::WIFI - 1.0f; }

  bool canHandle(AsyncWebServerRequest *request) const override {
    if (request->method() != HTTP_GET)
      return false;
    char url_buf[AsyncWebServerRequest::URL_BUF_SIZE];
    return request->url_to(url_buf) == "/history.json";
  }

  void handleRequest(AsyncWebServerRequest *request) override {
    // snapshot the ring position; the main loop may add a point meanwhile
    const uint16_t head = this->head_, n = this->filled_;
    const uint32_t age = n > 0 ? (millis() - this->last_point_) / 1000 : 0;
    auto *stream = request->beginResponseStream("application/json");
    stream->addHeader("cache-control", "no-store");
    stream->printf("{\"step\":%u,\"age\":%u,\"n\":%u,\"s\":{", static_cast<unsigned>(this->point_ms_ / 1000),
                   static_cast<unsigned>(age), static_cast<unsigned>(n));
    for (size_t k = 0; k < this->series_.size(); k++) {
      const auto &s = this->series_[k];
      stream->printf("%s\"%s\":[", k ? "," : "", s.key);
      for (uint16_t i = 0; i < n; i++) {
        const int16_t v = s.data[(head + this->points_ - n + i) % this->points_];
        if (i)
          stream->write(',');
        if (v == EMPTY) {
          stream->print("null");
        } else {
          stream->printf("%d", v);
        }
      }
      stream->write(']');
    }
    stream->print("}}");
    request->send(stream);
  }

 protected:
  static constexpr int16_t EMPTY = INT16_MIN;
  struct Series {
    const char *key;
    sensor::Sensor *sensor;
    float scale;
    std::vector<int16_t> data;
    float sum;
    uint16_t count;
  };

  web_server_base::WebServerBase *base_;
  std::vector<Series> series_;
  uint16_t points_{1440};
  uint32_t point_ms_{60000};
  uint16_t head_{0};
  uint16_t filled_{0};
  uint32_t last_point_{0};
};

}  // namespace esphome::dial_history
