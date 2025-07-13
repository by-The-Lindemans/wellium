/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
import { proxyCustomElement, HTMLElement, createEvent, h, Host } from '@stencil/core/internal/client';
import { a as printIonError } from './index4.js';

const tabsCss = ":host{left:0;right:0;top:0;bottom:0;display:-ms-flexbox;display:flex;position:absolute;-ms-flex-direction:column;flex-direction:column;width:100%;height:100%;contain:layout size style;z-index:0}.tabs-inner{position:relative;-ms-flex:1;flex:1;contain:layout size style}";

const Tabs = /*@__PURE__*/ proxyCustomElement(class Tabs extends HTMLElement {
    constructor() {
        super();
        this.__registerHost();
        this.__attachShadow();
        this.ionNavWillLoad = createEvent(this, "ionNavWillLoad", 7);
        this.ionTabsWillChange = createEvent(this, "ionTabsWillChange", 3);
        this.ionTabsDidChange = createEvent(this, "ionTabsDidChange", 3);
        this.transitioning = false;
        /** @internal */
        this.useRouter = false;
        this.onTabClicked = (ev) => {
            const { href, tab } = ev.detail;
            if (this.useRouter && href !== undefined) {
                const router = document.querySelector('ion-router');
                if (router) {
                    router.push(href);
                }
            }
            else {
                this.select(tab);
            }
        };
    }
    async componentWillLoad() {
        if (!this.useRouter) {
            /**
             * JavaScript and StencilJS use `ion-router`, while
             * the other frameworks use `ion-router-outlet`.
             *
             * If either component is present then tabs will not use
             * a basic tab-based navigation. It will use the history
             * stack or URL updates associated with the router.
             */
            this.useRouter =
                (!!this.el.querySelector('ion-router-outlet') || !!document.querySelector('ion-router')) &&
                    !this.el.closest('[no-router]');
        }
        if (!this.useRouter) {
            const tabs = this.tabs;
            if (tabs.length > 0) {
                await this.select(tabs[0]);
            }
        }
        this.ionNavWillLoad.emit();
    }
    componentWillRender() {
        const tabBar = this.el.querySelector('ion-tab-bar');
        if (tabBar) {
            const tab = this.selectedTab ? this.selectedTab.tab : undefined;
            tabBar.selectedTab = tab;
        }
    }
    /**
     * Select a tab by the value of its `tab` property or an element reference. This method is only available for vanilla JavaScript projects. The Angular, React, and Vue implementations of tabs are coupled to each framework's router.
     *
     * @param tab The tab instance to select. If passed a string, it should be the value of the tab's `tab` property.
     */
    async select(tab) {
        const selectedTab = getTab(this.tabs, tab);
        if (!this.shouldSwitch(selectedTab)) {
            return false;
        }
        await this.setActive(selectedTab);
        await this.notifyRouter();
        this.tabSwitch();
        return true;
    }
    /**
     * Get a specific tab by the value of its `tab` property or an element reference. This method is only available for vanilla JavaScript projects. The Angular, React, and Vue implementations of tabs are coupled to each framework's router.
     *
     * @param tab The tab instance to select. If passed a string, it should be the value of the tab's `tab` property.
     */
    async getTab(tab) {
        return getTab(this.tabs, tab);
    }
    /**
     * Get the currently selected tab. This method is only available for vanilla JavaScript projects. The Angular, React, and Vue implementations of tabs are coupled to each framework's router.
     */
    getSelected() {
        return Promise.resolve(this.selectedTab ? this.selectedTab.tab : undefined);
    }
    /** @internal */
    async setRouteId(id) {
        const selectedTab = getTab(this.tabs, id);
        if (!this.shouldSwitch(selectedTab)) {
            return { changed: false, element: this.selectedTab };
        }
        await this.setActive(selectedTab);
        return {
            changed: true,
            element: this.selectedTab,
            markVisible: () => this.tabSwitch(),
        };
    }
    /** @internal */
    async getRouteId() {
        var _a;
        const tabId = (_a = this.selectedTab) === null || _a === void 0 ? void 0 : _a.tab;
        return tabId !== undefined ? { id: tabId, element: this.selectedTab } : undefined;
    }
    setActive(selectedTab) {
        if (this.transitioning) {
            return Promise.reject('transitioning already happening');
        }
        this.transitioning = true;
        this.leavingTab = this.selectedTab;
        this.selectedTab = selectedTab;
        this.ionTabsWillChange.emit({ tab: selectedTab.tab });
        selectedTab.active = true;
        return Promise.resolve();
    }
    tabSwitch() {
        const selectedTab = this.selectedTab;
        const leavingTab = this.leavingTab;
        this.leavingTab = undefined;
        this.transitioning = false;
        if (!selectedTab) {
            return;
        }
        if (leavingTab !== selectedTab) {
            if (leavingTab) {
                leavingTab.active = false;
            }
            this.ionTabsDidChange.emit({ tab: selectedTab.tab });
        }
    }
    notifyRouter() {
        if (this.useRouter) {
            const router = document.querySelector('ion-router');
            if (router) {
                return router.navChanged('forward');
            }
        }
        return Promise.resolve(false);
    }
    shouldSwitch(selectedTab) {
        const leavingTab = this.selectedTab;
        return selectedTab !== undefined && selectedTab !== leavingTab && !this.transitioning;
    }
    get tabs() {
        return Array.from(this.el.querySelectorAll('ion-tab'));
    }
    render() {
        return (h(Host, { key: '73ecd3294ca6c78ce6d8b6a7e5b6ccb11d84ada4', onIonTabButtonClick: this.onTabClicked }, h("slot", { key: '09661b26f07a3069a58e76ea4dceb9a6acbf365d', name: "top" }), h("div", { key: 'db50d59fad8f9b11873b695fc548f3cfe4aceb6a', class: "tabs-inner" }, h("slot", { key: '02694dde2d8381f48fc06dd9e79798c4bd540ccd' })), h("slot", { key: '92c4661a5f3fa1c08c964fab7c422c1a2a03d3d8', name: "bottom" })));
    }
    get el() { return this; }
    static get style() { return tabsCss; }
}, [1, "ion-tabs", {
        "useRouter": [1028, "use-router"],
        "selectedTab": [32],
        "select": [64],
        "getTab": [64],
        "getSelected": [64],
        "setRouteId": [64],
        "getRouteId": [64]
    }]);
const getTab = (tabs, tab) => {
    const tabEl = typeof tab === 'string' ? tabs.find((t) => t.tab === tab) : tab;
    if (!tabEl) {
        printIonError(`[ion-tabs] - Tab with id: "${tabEl}" does not exist`);
    }
    return tabEl;
};
function defineCustomElement$1() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["ion-tabs"];
    components.forEach(tagName => { switch (tagName) {
        case "ion-tabs":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, Tabs);
            }
            break;
    } });
}

const IonTabs = Tabs;
const defineCustomElement = defineCustomElement$1;

export { IonTabs, defineCustomElement };
