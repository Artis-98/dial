"""DIAL history: keeps the last day of chosen sensors in RAM and serves it as /history.json.

Each stored point is the mean of the samples taken during one interval, so the
page can draw 24 h of charts the moment it opens, whether or not anyone had it
open before. RAM only: a restart starts a fresh day.
"""
import esphome.codegen as cg
from esphome.components import sensor, web_server_base
from esphome.components.web_server_base import CONF_WEB_SERVER_BASE_ID
import esphome.config_validation as cv
from esphome.const import CONF_ID, CONF_SENSOR

DEPENDENCIES = ["web_server_base"]
AUTO_LOAD = ["web_server_base"]

CONF_SERIES = "series"
CONF_KEY = "key"
CONF_SCALE = "scale"
CONF_POINTS = "points"
CONF_POINT_EVERY = "point_every"

dial_history_ns = cg.esphome_ns.namespace("dial_history")
DialHistory = dial_history_ns.class_("DialHistory", cg.PollingComponent)

SERIES_SCHEMA = cv.Schema(
    {
        cv.Required(CONF_KEY): cv.All(cv.string, cv.Length(min=1, max=8)),
        cv.Required(CONF_SENSOR): cv.use_id(sensor.Sensor),
        cv.Optional(CONF_SCALE, default=1.0): cv.float_,
    }
)

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(): cv.declare_id(DialHistory),
        cv.GenerateID(CONF_WEB_SERVER_BASE_ID): cv.use_id(web_server_base.WebServerBase),
        cv.Optional(CONF_POINTS, default=1440): cv.int_range(min=10, max=10080),
        cv.Optional(CONF_POINT_EVERY, default="60s"): cv.positive_time_period_milliseconds,
        cv.Required(CONF_SERIES): cv.All(cv.ensure_list(SERIES_SCHEMA), cv.Length(min=1, max=8)),
    }
).extend(cv.polling_component_schema("5s"))


async def to_code(config):
    base = await cg.get_variable(config[CONF_WEB_SERVER_BASE_ID])
    var = cg.new_Pvariable(config[CONF_ID], base)
    await cg.register_component(var, config)
    cg.add(var.set_points(config[CONF_POINTS]))
    cg.add(var.set_point_every(config[CONF_POINT_EVERY]))
    for s in config[CONF_SERIES]:
        sens = await cg.get_variable(s[CONF_SENSOR])
        cg.add(var.add_series(s[CONF_KEY], sens, s[CONF_SCALE]))
