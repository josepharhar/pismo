class TestElement extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    console.log('connectedCallback');
    this.textContent = 'hello from connectedCallback';
  }

  disconnectedCallback() {
    console.log('disconnectedCallback');
  }
}

customElements.define('test-element', TestElement);

const asdf = 'hello from util.js';
export default asdf;