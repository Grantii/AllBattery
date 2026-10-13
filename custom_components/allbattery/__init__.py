"""AllBattery - Batterie-Monitoring als eigenes Sidebar-Panel.

Die Integration liefert die Frontend-Dateien selbst aus und registriert das Panel.
Dadurch ist kein Eintrag in configuration.yaml noetig.
"""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import (
    DATA_STATIC_REGISTERED,
    FRONTEND_DIR,
    MODULE_URL,
    OPTION_DEFAULTS,
    SIDEBAR_ICON,
    SIDEBAR_TITLE,
    STATIC_URL,
    URL_PATH,
    WEBCOMPONENT,
)

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Statische Dateien bereitstellen und das Panel registrieren."""
    frontend_path = Path(__file__).parent / FRONTEND_DIR
    if not frontend_path.is_dir():
        _LOGGER.error(
            "Frontend-Verzeichnis fehlt (%s) - bitte die Integration neu installieren",
            frontend_path,
        )
        return False

    # Der statische Pfad darf nur einmal registriert werden (Reload-safe).
    if not hass.data.get(DATA_STATIC_REGISTERED):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_URL, str(frontend_path), False)]
        )
        hass.data[DATA_STATIC_REGISTERED] = True

    await _async_register_panel(hass, entry)

    entry.async_on_unload(entry.add_update_listener(_async_options_updated))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Panel aus der Seitenleiste entfernen."""
    frontend.async_remove_panel(hass, URL_PATH)
    return True


async def _async_register_panel(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Das Panel in der Seitenleiste anmelden."""
    config = {**OPTION_DEFAULTS, **entry.options}

    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=URL_PATH,
        webcomponent_name=WEBCOMPONENT,
        sidebar_title=SIDEBAR_TITLE,
        sidebar_icon=SIDEBAR_ICON,
        module_url=MODULE_URL,
        config=config,
        require_admin=False,
        embed_iframe=False,
    )


async def _async_options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Optionen wurden geaendert - Panel mit neuen Werten neu registrieren."""
    frontend.async_remove_panel(hass, URL_PATH)
    await _async_register_panel(hass, entry)
