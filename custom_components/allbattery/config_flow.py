"""Einrichtung und Optionen der AllBattery-Integration - komplett ueber die Oberflaeche."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback

from .const import (
    DOMAIN,
    OPTION_DEFAULTS,
    OPTION_FORECAST,
    OPTION_FORECAST_HOURS,
    OPTION_REFRESH_SECONDS,
)


def _options_schema(options: dict[str, Any]) -> vol.Schema:
    """Formular fuer die Panel-Optionen mit den aktuellen Werten als Vorgabe."""
    return vol.Schema(
        {
            vol.Optional(
                OPTION_REFRESH_SECONDS,
                default=options[OPTION_REFRESH_SECONDS],
            ): vol.All(int, vol.Range(min=0, max=3600)),
            vol.Optional(
                OPTION_FORECAST,
                default=options[OPTION_FORECAST],
            ): bool,
            vol.Optional(
                OPTION_FORECAST_HOURS,
                default=options[OPTION_FORECAST_HOURS],
            ): vol.All(int, vol.Range(min=1, max=336)),
        }
    )


class AllBatteryConfigFlow(ConfigFlow, domain=DOMAIN):
    """Einmalige Einrichtung ohne configuration.yaml."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Der Benutzer fuegt die Integration hinzu."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            return self.async_create_entry(title="AllBattery", data={})

        return self.async_show_form(step_id="user")

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        """Options-Flow bereitstellen."""
        return AllBatteryOptionsFlow()


class AllBatteryOptionsFlow(OptionsFlow):
    """Panel-Optionen: Auto-Refresh und Prognose."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Optionen bearbeiten."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        options = {**OPTION_DEFAULTS, **self.config_entry.options}
        return self.async_show_form(step_id="init", data_schema=_options_schema(options))
