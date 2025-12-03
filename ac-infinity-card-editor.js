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
  }

  configChanged(newConfig) {
    const event = new Event('config-changed', {
      bubbles: true,
      composed: true,
    });
    event.detail = { config: newConfig };
    this.dispatchEvent(event);
  }

  render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        .card-config {
          padding: 16px;
        }
        
        .option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 12px 0;
        }
        
        .option label {
          font-weight: 500;
        }
        
        input[type="text"] {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          background: var(--primary-background-color);
          color: var(--primary-text-color);
          font-size: 14px;
        }
        
        ha-switch {
          margin-left: auto;
        }
        
        .description {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-top: 4px;
        }
      </style>
      
      <div class="card-config">
        <div class="option">
          <div style="flex: 1;">
            <label>Title</label>
            <div class="description">Display name for the controller</div>
          </div>
        </div>
        <input
          type="text"
          .value="${this._config?.title || 'AC Infinity Controller'}"
          @input="${(e) => this._valueChanged('title', e.target.value)}"
        />
        
        <div class="option">
          <div>
            <label>Auto Detect Entities</label>
            <div class="description">Automatically detect all AC Infinity entities</div>
          </div>
          <ha-switch
            .checked="${this._config?.auto_detect !== false}"
            @change="${(e) => this._valueChanged('auto_detect', e.target.checked)}"
          ></ha-switch>
        </div>
        
        <div class="option">
          <div>
            <label>Show Ports</label>
            <div class="description">Display port status list</div>
          </div>
          <ha-switch
            .checked="${this._config?.show_ports !== false}"
            @change="${(e) => this._valueChanged('show_ports', e.target.checked)}"
          ></ha-switch>
        </div>
        
        <div class="option">
          <div>
            <label>Show Sensors</label>
            <div class="description">Display temperature, humidity, and VPD</div>
          </div>
          <ha-switch
            .checked="${this._config?.show_sensors !== false}"
            @change="${(e) => this._valueChanged('show_sensors', e.target.checked)}"
          ></ha-switch>
        </div>
      </div>
    `;
    
    // Add event listeners
    const titleInput = this.shadowRoot.querySelector('input[type="text"]');
    if (titleInput) {
      titleInput.addEventListener('input', (e) => {
        this._valueChanged('title', e.target.value);
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
