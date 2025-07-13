/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
import { proxyCustomElement, HTMLElement, h, Host } from '@stencil/core/internal/client';
import { c as createColorClasses } from './theme.js';
import { b as getIonMode } from './ionic-global.js';

const textCss = ":host(.ion-color){color:var(--ion-color-base)}";

const Text = /*@__PURE__*/ proxyCustomElement(class Text extends HTMLElement {
    constructor() {
        super();
        this.__registerHost();
        this.__attachShadow();
    }
    render() {
        const mode = getIonMode(this);
        return (h(Host, { key: '361035eae7b92dc109794348d39bad2f596eb6be', class: createColorClasses(this.color, {
                [mode]: true,
            }) }, h("slot", { key: 'c7b8835cf485ba9ecd73298f0529276ce1ea0852' })));
    }
    static get style() { return textCss; }
}, [1, "ion-text", {
        "color": [513]
    }]);
function defineCustomElement$1() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["ion-text"];
    components.forEach(tagName => { switch (tagName) {
        case "ion-text":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, Text);
            }
            break;
    } });
}

const IonText = Text;
const defineCustomElement = defineCustomElement$1;

export { IonText, defineCustomElement };
