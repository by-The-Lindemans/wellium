/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
import { proxyCustomElement, HTMLElement, h, Host } from '@stencil/core/internal/client';
import { E as ENABLE_HTML_CONTENT_DEFAULT, a as sanitizeDOMString } from './config.js';
import { p as arrowDown, q as caretBackSharp } from './index6.js';
import { c as config } from './index4.js';
import { b as getIonMode } from './ionic-global.js';
import { e as supportsRubberBandScrolling } from './refresher.utils.js';
import { d as defineCustomElement$2, S as SPINNERS } from './spinner.js';
import { d as defineCustomElement$3 } from './icon.js';

const RefresherContent = /*@__PURE__*/ proxyCustomElement(class RefresherContent extends HTMLElement {
    constructor() {
        super();
        this.__registerHost();
        this.customHTMLEnabled = config.get('innerHTMLTemplatesEnabled', ENABLE_HTML_CONTENT_DEFAULT);
    }
    componentWillLoad() {
        if (this.pullingIcon === undefined) {
            /**
             * The native iOS refresher uses a spinner instead of
             * an icon, so we need to see if this device supports
             * the native iOS refresher.
             */
            const hasRubberBandScrolling = supportsRubberBandScrolling();
            const mode = getIonMode(this);
            const overflowRefresher = hasRubberBandScrolling ? 'lines' : arrowDown;
            this.pullingIcon = config.get('refreshingIcon', mode === 'ios' && hasRubberBandScrolling ? config.get('spinner', overflowRefresher) : 'circular');
        }
        if (this.refreshingSpinner === undefined) {
            const mode = getIonMode(this);
            this.refreshingSpinner = config.get('refreshingSpinner', config.get('spinner', mode === 'ios' ? 'lines' : 'circular'));
        }
    }
    renderPullingText() {
        const { customHTMLEnabled, pullingText } = this;
        if (customHTMLEnabled) {
            return h("div", { class: "refresher-pulling-text", innerHTML: sanitizeDOMString(pullingText) });
        }
        return h("div", { class: "refresher-pulling-text" }, pullingText);
    }
    renderRefreshingText() {
        const { customHTMLEnabled, refreshingText } = this;
        if (customHTMLEnabled) {
            return h("div", { class: "refresher-refreshing-text", innerHTML: sanitizeDOMString(refreshingText) });
        }
        return h("div", { class: "refresher-refreshing-text" }, refreshingText);
    }
    render() {
        const pullingIcon = this.pullingIcon;
        const hasSpinner = pullingIcon != null && SPINNERS[pullingIcon] !== undefined;
        const mode = getIonMode(this);
        return (h(Host, { key: 'e235f8a9a84070ece2e2066ced234a64663bfa1d', class: mode }, h("div", { key: '9121691818ddaa35801a5f442e144ac27686cf19', class: "refresher-pulling" }, this.pullingIcon && hasSpinner && (h("div", { key: 'c8d65d740f1575041bd3b752c789077927397fe4', class: "refresher-pulling-icon" }, h("div", { key: '309dd904977eaa788b09ea95b7fa4996a73bec5b', class: "spinner-arrow-container" }, h("ion-spinner", { key: 'a2a1480f67775d56ca7822e76be1e9f983bca2f9', name: this.pullingIcon, paused: true }), mode === 'md' && this.pullingIcon === 'circular' && (h("div", { key: '811d7e06d324bf4b6a18a31427a43e5177f3ae3a', class: "arrow-container" }, h("ion-icon", { key: '86cc48e2e8dc054ff6ff1299094da35b524be63d', icon: caretBackSharp, "aria-hidden": "true" })))))), this.pullingIcon && !hasSpinner && (h("div", { key: '464ae097dbc95c18a2dd7dfd03f8489153dab719', class: "refresher-pulling-icon" }, h("ion-icon", { key: 'ed6875978b9035add562caa743a68353743d978f', icon: this.pullingIcon, lazy: false, "aria-hidden": "true" }))), this.pullingText !== undefined && this.renderPullingText()), h("div", { key: 'aff891924e44354543fec484e5cde1ca92e69904', class: "refresher-refreshing" }, this.refreshingSpinner && (h("div", { key: '842d7ac4ff10a1058775493d62f31cbdcd34f7a0', class: "refresher-refreshing-icon" }, h("ion-spinner", { key: '8c3e6195501e7e78d5cde1e3ad1fef90fd4a953f', name: this.refreshingSpinner }))), this.refreshingText !== undefined && this.renderRefreshingText())));
    }
    get el() { return this; }
}, [0, "ion-refresher-content", {
        "pullingIcon": [1025, "pulling-icon"],
        "pullingText": [1, "pulling-text"],
        "refreshingSpinner": [1025, "refreshing-spinner"],
        "refreshingText": [1, "refreshing-text"]
    }]);
function defineCustomElement$1() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["ion-refresher-content", "ion-icon", "ion-spinner"];
    components.forEach(tagName => { switch (tagName) {
        case "ion-refresher-content":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, RefresherContent);
            }
            break;
        case "ion-icon":
            if (!customElements.get(tagName)) {
                defineCustomElement$3();
            }
            break;
        case "ion-spinner":
            if (!customElements.get(tagName)) {
                defineCustomElement$2();
            }
            break;
    } });
}

const IonRefresherContent = RefresherContent;
const defineCustomElement = defineCustomElement$1;

export { IonRefresherContent, defineCustomElement };
