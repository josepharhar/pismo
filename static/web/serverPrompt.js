class ServerPrompt extends HTMLElement {
  constructor() {
    super();
    this._resultPromise = new Promise((resolve, reject) => {
      this._resultResolver = resolve;
      this._resultRejecter = reject;
    });
  }

  resultPromise() {
    return this._resultPromise;
  }

  connectedCallback() {
    console.log('ServerPrompt.connectedCallback');

    const label = document.createElement('p');
    label.textContent = 'Enter server address and press enter';
    this.appendChild(label);

    const form = document.createElement('form');
    this.appendChild(form);

    const textInput = document.createElement('input');
    textInput.type = "search";
    form.appendChild(textInput);

    const submitButton = document.createElement('input');
    submitButton.type = "submit";
    form.appendChild(submitButton);

    form.onsubmit = event => {
      event.preventDefault();
      this._resultResolver(textInput.value);
    };
  }
}

customElements.define('server-prompt', ServerPrompt);

export default ServerPrompt;