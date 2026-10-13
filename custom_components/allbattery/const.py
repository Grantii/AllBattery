"""Konstanten der AllBattery-Integration."""

from __future__ import annotations

from typing import Any, Final

DOMAIN: Final = "allbattery"

# Adresse des Sidebar-Panels: /allbattery
URL_PATH: Final = "allbattery"

# Basis-URL der mitgelieferten Frontend-Dateien: /allbattery/allbattery.js
STATIC_URL: Final = "/allbattery"
FRONTEND_DIR: Final = "frontend"
JS_FILE: Final = "allbattery.js"
MODULE_URL: Final = f"{STATIC_URL}/{JS_FILE}"

# Name des Custom Elements, das das Panel rendert (siehe src/panel.ts)
WEBCOMPONENT: Final = "allbattery"

SIDEBAR_TITLE: Final = "Batterien"
SIDEBAR_ICON: Final = "mdi:battery-heart-variant"

# Schluessel in hass.data
DATA_STATIC_REGISTERED: Final = f"{DOMAIN}_static_registered"

# Optionen des Panels (siehe src/panel.ts -> AllBatteryPanelConfig)
OPTION_REFRESH_SECONDS: Final = "refresh_seconds"
OPTION_FORECAST: Final = "forecast"
OPTION_FORECAST_HOURS: Final = "forecast_hours"

OPTION_DEFAULTS: Final[dict[str, Any]] = {
    OPTION_REFRESH_SECONDS: 60,
    OPTION_FORECAST: True,
    OPTION_FORECAST_HOURS: 24,
}
