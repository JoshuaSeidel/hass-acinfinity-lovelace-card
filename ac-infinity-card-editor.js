import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

class ACInfinityCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object }
    };
  }

  setConfig(config) {
    this.config = config;
  }

  configChanged(newConfig) {
    const event = new Event('config-changed', {
      bubbles: true,
      composed: true,
    });
    event.detail = { config: newConfig };
    this.dispatchEvent(event);
  }

  _getEntityOptions() {
    if (!this.hass) return [];

    const entities = Object.keys(this.hass.states)
      .filter(entity => entity.startsWith('sensor.') || entity.startsWith('binary_sensor.'))
      .sort();

    return entities;
  }

  _getControllerOptions() {
    // Get controller options from the main card's detected entities
    // We'll detect controllers similar to how the main card does
    if (!this.hass) return [];

    const entities = Object.keys(this.hass.states);
    const controllers = {};

    entities.forEach(entity => {
      const state = this.hass.states[entity];
      if (!state) return;

      const entityLower = entity.toLowerCase();
      const friendlyName = (state.attributes?.friendly_name || '').toLowerCase();

      // Look for AC Infinity controller patterns
      const isAcInfinity = (
        entityLower.includes('_tent_temperature') ||
        entityLower.includes('controller_temperature') ||
        entityLower.includes('probe_temperature') ||
        friendlyName.includes('tent temperature') ||
        friendlyName.includes('controller temperature')
      );

      if (!isAcInfinity) return;

      const deviceId = state.attributes?.device_id || 'default';
      if (!controllers[deviceId]) {
        // Extract controller name from friendly name
        let controllerName = 'Controller';
        if (state.attributes?.friendly_name) {
          const parts = state.attributes.friendly_name.split(' ');
          controllerName = parts.slice(0, Math.max(1, parts.length - 2)).join(' ');
        }
        controllers[deviceId] = {
          id: deviceId,
          name: controllerName
        };
      }
    });

    return Object.values(controllers);
  }

  _valueChanged(key, value) {
    if (!this.config) {
      return;
    }
    
    const newConfig = {
      ...this.config,
      [key]: value,
    };
    
    this.config = newConfig;
    this.configChanged(newConfig);
  }

  render() {
    if (!this.hass || !this.config) {
      return html`Loading...`;
    }

    const entities = this._getEntityOptions();
    const controllers = this._getControllerOptions();

    return html`
      <div class="card-config">
        <div class="section">
          <div class="option">
            <label>Title</label>
            <div class="description">Display name for the controller</div>
            <input
              type="text"
              .value="${this.config.title || 'AC Infinity Controller'}"
              @input="${(e) => this._valueChanged('title', e.target.value)}"
            />
          </div>

          <div class="option">
            <label>Device Type</label>
            <div class="description">Type of AC Infinity device (auto-detected by default)</div>
            <select @change="${(e) => this._valueChanged('device_type', e.target.value || null)}">
              <option value="">-- Auto Detect --</option>
              <option value="controller" ?selected="${this.config.device_type === 'controller'}">Controller (with environmental sensors)</option>
              <option value="outlet" ?selected="${this.config.device_type === 'outlet'}">Outlet (smart plugs only)</option>
            </select>
          </div>
        </div>

        <!-- Controller Selection (shown when multiple controllers detected) -->
        ${controllers.length > 1 ? html`
        <div class="section">
          <div class="section-title">Controller Selection</div>
          <div class="description" style="margin-bottom: 12px;">
            Multiple AC Infinity controllers detected. Select which one to display.
          </div>
          <div class="option">
            <label>Controller</label>
            <select @change="${(e) => this._valueChanged('selected_controller', e.target.value || null)}">
              <option value="">-- First Available --</option>
              ${controllers.map(c => html`<option value="${c.id}" ?selected="${this.config.selected_controller === c.id}">${c.name}</option>`)}
            </select>
          </div>
        </div>
        ` : ''}

        <div class="section">
          <div class="switch-option">
            <div>
              <label>Auto Detect Entities</label>
              <div class="description">Automatically detect all AC Infinity entities</div>
            </div>
            <input
              type="checkbox"
              ?checked="${this.config.auto_detect !== false}"
              @change="${(e) => this._valueChanged('auto_detect', e.target.checked)}"
            />
          </div>

          <div class="note">
            ${controllers.length > 1 ?
              html`⚠️ <strong>${controllers.length} controllers detected!</strong> Use the Controller Selection above to choose which one to display on this card.` :
              html`ℹ️ When enabled, the card will automatically find and display AC Infinity sensors. Disable to manually configure entities below.`
            }
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Manual Entity Configuration</div>
          <div class="description" style="margin-bottom: 12px;">
            Configure specific entities (only used when auto-detect is disabled)
          </div>
          
          <div class="option">
            <label>Probe/Tent Temperature</label>
            <select @change="${(e) => this._valueChanged('probe_temp_entity', e.target.value)}">
              <option value="">-- Auto Detect --</option>
              ${entities.map(e => html`<option value="${e}" ?selected="${this.config.probe_temp_entity === e}">${e}</option>`)}
            </select>
          </div>
          
          <div class="option">
            <label>Probe/Tent Humidity</label>
            <select @change="${(e) => this._valueChanged('probe_humidity_entity', e.target.value)}">
              <option value="">-- Auto Detect --</option>
              ${entities.map(e => html`<option value="${e}" ?selected="${this.config.probe_humidity_entity === e}">${e}</option>`)}
            </select>
          </div>
          
          <div class="option">
            <label>Probe/Tent VPD</label>
            <select @change="${(e) => this._valueChanged('probe_vpd_entity', e.target.value)}">
              <option value="">-- Auto Detect --</option>
              ${entities.map(e => html`<option value="${e}" ?selected="${this.config.probe_vpd_entity === e}">${e}</option>`)}
            </select>
          </div>
          
          <div class="option">
            <label>Controller Temperature</label>
            <select @change="${(e) => this._valueChanged('controller_temp_entity', e.target.value)}">
              <option value="">-- Auto Detect --</option>
              ${entities.map(e => html`<option value="${e}" ?selected="${this.config.controller_temp_entity === e}">${e}</option>`)}
            </select>
          </div>
          
          <div class="option">
            <label>Controller Humidity</label>
            <select @change="${(e) => this._valueChanged('controller_humidity_entity', e.target.value)}">
              <option value="">-- Auto Detect --</option>
              ${entities.map(e => html`<option value="${e}" ?selected="${this.config.controller_humidity_entity === e}">${e}</option>`)}
            </select>
          </div>
          
          <div class="option">
            <label>Controller VPD</label>
            <select @change="${(e) => this._valueChanged('controller_vpd_entity', e.target.value)}">
              <option value="">-- Auto Detect --</option>
              ${entities.map(e => html`<option value="${e}" ?selected="${this.config.controller_vpd_entity === e}">${e}</option>`)}
            </select>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Specialty Sensors</div>
          <div class="description" style="margin-bottom: 12px;">
            Configure moisture, CO2, and UV sensors (auto-detected when available)
          </div>

          <div class="option">
            <label>Moisture Sensor</label>
            <select @change="${(e) => this._valueChanged('moisture_entity', e.target.value)}">
              <option value="">-- Auto Detect --</option>
              ${entities.map(e => html`<option value="${e}" ?selected="${this.config.moisture_entity === e}">${e}</option>`)}
            </select>
          </div>

          <div class="option">
            <label>CO2 Sensor</label>
            <select @change="${(e) => this._valueChanged('co2_entity', e.target.value)}">
              <option value="">-- Auto Detect --</option>
              ${entities.map(e => html`<option value="${e}" ?selected="${this.config.co2_entity === e}">${e}</option>`)}
            </select>
          </div>

          <div class="option">
            <label>UV Sensor</label>
            <select @change="${(e) => this._valueChanged('uv_entity', e.target.value)}">
              <option value="">-- Auto Detect --</option>
              ${entities.map(e => html`<option value="${e}" ?selected="${this.config.uv_entity === e}">${e}</option>`)}
            </select>
          </div>
        </div>

        <div class="section">
          <div class="switch-option">
            <div>
              <label>Show Ports</label>
              <div class="description">Display port status list</div>
            </div>
            <input
              type="checkbox"
              ?checked="${this.config.show_ports !== false}"
              @change="${(e) => this._valueChanged('show_ports', e.target.checked)}"
            />
          </div>
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      .card-config {
        padding: 16px;
      }
      
      .section {
        margin-bottom: 24px;
      }
      
      .section-title {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 12px;
        color: var(--primary-text-color);
      }
      
      .option {
        display: flex;
        flex-direction: column;
        margin: 12px 0;
      }
      
      .option label {
        font-weight: 500;
        margin-bottom: 4px;
        font-size: 13px;
      }
      
      input[type="text"],
      select {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        background: var(--primary-background-color);
        color: var(--primary-text-color);
        font-size: 14px;
      }
      
      select {
        cursor: pointer;
      }
      
      .switch-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 12px 0;
      }
      
      .switch-option label {
        font-weight: 500;
        margin-bottom: 0;
      }
      
      .description {
        font-size: 12px;
        color: var(--secondary-text-color);
        margin-top: 2px;
        margin-bottom: 4px;
      }
      
      .note {
        padding: 12px;
        background: var(--secondary-background-color);
        border-radius: 4px;
        font-size: 12px;
        color: var(--secondary-text-color);
        margin-top: 8px;
      }
    `;
  }
}

customElements.define('ac-infinity-card-editor', ACInfinityCardEditor);
