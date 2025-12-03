class ACInfinityCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    this._config = config;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
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
    if (!this._hass) return [];
    
    const entities = Object.keys(this._hass.states)
      .filter(entity => entity.startsWith('sensor.') || entity.startsWith('binary_sensor.'))
      .sort();
    
    return entities;
  }

  render() {
    if (!this.shadowRoot) return;

    const entities = this._getEntityOptions();

    this.shadowRoot.innerHTML = `
      <style>
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
      </style>
      
      <div class="card-config">
        <div class="section">
          <div class="option">
            <label>Title</label>
            <div class="description">Display name for the controller</div>
            <input
              type="text"
              id="title-input"
              .value="${this._config?.title || 'AC Infinity Controller'}"
            />
          </div>
        </div>
        
        <div class="section">
          <div class="switch-option">
            <div>
              <label>Auto Detect Entities</label>
              <div class="description">Automatically detect all AC Infinity entities</div>
            </div>
            <input
              type="checkbox"
              id="auto-detect"
              ${this._config?.auto_detect !== false ? 'checked' : ''}
            />
          </div>
          
          <div class="note">
            ℹ️ When enabled, the card will automatically find and display AC Infinity sensors. Disable to manually configure entities below.
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Manual Entity Configuration</div>
          <div class="description" style="margin-bottom: 12px;">
            Configure specific entities (only used when auto-detect is disabled)
          </div>
          
          <div class="option">
            <label>Probe/Tent Temperature</label>
            <select id="probe-temp">
              <option value="">-- Auto Detect --</option>
              ${entities.map(e => `<option value="${e}" ${this._config?.probe_temp_entity === e ? 'selected' : ''}>${e}</option>`).join('')}
            </select>
          </div>
          
          <div class="option">
            <label>Probe/Tent Humidity</label>
            <select id="probe-humidity">
              <option value="">-- Auto Detect --</option>
              ${entities.map(e => `<option value="${e}" ${this._config?.probe_humidity_entity === e ? 'selected' : ''}>${e}</option>`).join('')}
            </select>
          </div>
          
          <div class="option">
            <label>Probe/Tent VPD</label>
            <select id="probe-vpd">
              <option value="">-- Auto Detect --</option>
              ${entities.map(e => `<option value="${e}" ${this._config?.probe_vpd_entity === e ? 'selected' : ''}>${e}</option>`).join('')}
            </select>
          </div>
          
          <div class="option">
            <label>Controller Temperature</label>
            <select id="controller-temp">
              <option value="">-- Auto Detect --</option>
              ${entities.map(e => `<option value="${e}" ${this._config?.controller_temp_entity === e ? 'selected' : ''}>${e}</option>`).join('')}
            </select>
          </div>
          
          <div class="option">
            <label>Controller Humidity</label>
            <select id="controller-humidity">
              <option value="">-- Auto Detect --</option>
              ${entities.map(e => `<option value="${e}" ${this._config?.controller_humidity_entity === e ? 'selected' : ''}>${e}</option>`).join('')}
            </select>
          </div>
          
          <div class="option">
            <label>Controller VPD</label>
            <select id="controller-vpd">
              <option value="">-- Auto Detect --</option>
              ${entities.map(e => `<option value="${e}" ${this._config?.controller_vpd_entity === e ? 'selected' : ''}>${e}</option>`).join('')}
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
              id="show-ports"
              ${this._config?.show_ports !== false ? 'checked' : ''}
            />
          </div>
        </div>
      </div>
    `;
    
    // Add event listeners
    const titleInput = this.shadowRoot.querySelector('#title-input');
    if (titleInput) {
      titleInput.addEventListener('input', (e) => {
        this._valueChanged('title', e.target.value);
      });
    }
    
    const autoDetect = this.shadowRoot.querySelector('#auto-detect');
    if (autoDetect) {
      autoDetect.addEventListener('change', (e) => {
        this._valueChanged('auto_detect', e.target.checked);
      });
    }
    
    const showPorts = this.shadowRoot.querySelector('#show-ports');
    if (showPorts) {
      showPorts.addEventListener('change', (e) => {
        this._valueChanged('show_ports', e.target.checked);
      });
    }
    
    const probeTemp = this.shadowRoot.querySelector('#probe-temp');
    if (probeTemp) {
      probeTemp.addEventListener('change', (e) => {
        this._valueChanged('probe_temp_entity', e.target.value);
      });
    }
    
    const probeHumidity = this.shadowRoot.querySelector('#probe-humidity');
    if (probeHumidity) {
      probeHumidity.addEventListener('change', (e) => {
        this._valueChanged('probe_humidity_entity', e.target.value);
      });
    }
    
    const probeVpd = this.shadowRoot.querySelector('#probe-vpd');
    if (probeVpd) {
      probeVpd.addEventListener('change', (e) => {
        this._valueChanged('probe_vpd_entity', e.target.value);
      });
    }
    
    const controllerTemp = this.shadowRoot.querySelector('#controller-temp');
    if (controllerTemp) {
      controllerTemp.addEventListener('change', (e) => {
        this._valueChanged('controller_temp_entity', e.target.value);
      });
    }
    
    const controllerHumidity = this.shadowRoot.querySelector('#controller-humidity');
    if (controllerHumidity) {
      controllerHumidity.addEventListener('change', (e) => {
        this._valueChanged('controller_humidity_entity', e.target.value);
      });
    }
    
    const controllerVpd = this.shadowRoot.querySelector('#controller-vpd');
    if (controllerVpd) {
      controllerVpd.addEventListener('change', (e) => {
        this._valueChanged('controller_vpd_entity', e.target.value);
      });
    }
  }

  _valueChanged(key, value) {
    if (!this._config) {
      this._config = {};
    }
    
    this._config = {
      ...this._config,
      [key]: value,
    };
    
    this.configChanged(this._config);
  }
}

customElements.define('ac-infinity-card-editor', ACInfinityCardEditor);
