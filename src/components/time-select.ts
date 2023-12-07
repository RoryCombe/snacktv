const flairOrder = ['5-7 Minutes', '7-10 Minutes', '10-15 Minutes', '15-30 Minutes', '30 Minutes Plus', '20%'];

class TimeSelect extends HTMLElement {
  flair: Set<string> = new Set();

  connectedCallback() {
    this.render();
  }

  get selectedFlair() {
    return this.getAttribute('selected-flair') ?? '';
  }

  setFlair(flair: Set<string>) {
    debugger;
    this.flair = flair;
    this.render();
  }

  render() {
    this.innerHTML = `
      <select id="flair">
        <option value=""${!this.selectedFlair ? ' selected' : ''}>Time</option>
        ${Array.from(this.flair)
          .sort((a, b) => flairOrder.indexOf(a) - flairOrder.indexOf(b))
          .map((f) => `<option value="${f}"${this.selectedFlair === f ? ' selected' : ''}>${f}</option>`)
          .join('')}
      </select>
    `;
  }
}

customElements.define('stv-time-select', TimeSelect);
