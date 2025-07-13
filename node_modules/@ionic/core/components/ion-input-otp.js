/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
import { proxyCustomElement, HTMLElement, createEvent, h, Host, Fragment } from '@stencil/core/internal/client';
import { i as inheritAriaAttributes } from './helpers.js';
import { p as printIonWarning } from './index4.js';
import { i as isRTL } from './dir.js';
import { c as createColorClasses } from './theme.js';
import { b as getIonMode } from './ionic-global.js';

const inputOtpIosCss = ".sc-ion-input-otp-ios-h{--margin-top:0;--margin-end:0;--margin-bottom:0;--margin-start:0;--padding-top:16px;--padding-end:0;--padding-bottom:16px;--padding-start:0;--color:initial;--min-width:40px;--separator-width:8px;--separator-height:var(--separator-width);--separator-border-radius:999px;--separator-color:var(--ion-color-step-150, var(--ion-background-color-step-150, #d9d9d9));--highlight-color-focused:var(--ion-color-primary, #0054e9);--highlight-color-valid:var(--ion-color-success, #2dd55b);--highlight-color-invalid:var(--ion-color-danger, #c5000f);--highlight-color:var(--highlight-color-focused);display:block;position:relative;font-size:0.875rem}.input-otp-group.sc-ion-input-otp-ios{-webkit-margin-start:var(--margin-start);margin-inline-start:var(--margin-start);-webkit-margin-end:var(--margin-end);margin-inline-end:var(--margin-end);margin-top:var(--margin-top);margin-bottom:var(--margin-bottom);-webkit-padding-start:var(--padding-start);padding-inline-start:var(--padding-start);-webkit-padding-end:var(--padding-end);padding-inline-end:var(--padding-end);padding-top:var(--padding-top);padding-bottom:var(--padding-bottom);display:-ms-flexbox;display:flex;-ms-flex-align:center;align-items:center;-ms-flex-pack:center;justify-content:center}.native-wrapper.sc-ion-input-otp-ios{display:-ms-flexbox;display:flex;-ms-flex-align:center;align-items:center;-ms-flex-pack:center;justify-content:center;min-width:var(--min-width)}.native-input.sc-ion-input-otp-ios{border-radius:var(--border-radius);width:var(--width);min-width:inherit;height:var(--height);border-width:var(--border-width);border-style:solid;border-color:var(--border-color);background:var(--background);color:var(--color);font-size:inherit;text-align:center;-webkit-appearance:none;-moz-appearance:none;appearance:none}.has-focus.sc-ion-input-otp-ios-h .native-input.sc-ion-input-otp-ios{caret-color:var(--highlight-color)}.input-otp-description.sc-ion-input-otp-ios{color:var(--ion-color-step-700, var(--ion-text-color-step-300, #4d4d4d));font-size:0.75rem;line-height:1.25rem;text-align:center}.input-otp-description-hidden.sc-ion-input-otp-ios{display:none}.input-otp-separator.sc-ion-input-otp-ios{border-radius:var(--separator-border-radius);-ms-flex-negative:0;flex-shrink:0;width:var(--separator-width);height:var(--separator-height);background:var(--separator-color)}.input-otp-size-small.sc-ion-input-otp-ios-h{--width:40px;--height:40px}.input-otp-size-small.sc-ion-input-otp-ios-h .input-otp-group.sc-ion-input-otp-ios{gap:8px}.input-otp-size-medium.sc-ion-input-otp-ios-h{--width:48px;--height:48px}.input-otp-size-large.sc-ion-input-otp-ios-h{--width:56px;--height:56px}.input-otp-size-medium.sc-ion-input-otp-ios-h .input-otp-group.sc-ion-input-otp-ios,.input-otp-size-large.sc-ion-input-otp-ios-h .input-otp-group.sc-ion-input-otp-ios{gap:12px}.input-otp-shape-round.sc-ion-input-otp-ios-h{--border-radius:16px}.input-otp-shape-soft.sc-ion-input-otp-ios-h{--border-radius:8px}.input-otp-shape-rectangular.sc-ion-input-otp-ios-h{--border-radius:0}.input-otp-fill-outline.sc-ion-input-otp-ios-h{--background:none}.input-otp-fill-solid.sc-ion-input-otp-ios-h{--border-color:var(--ion-color-step-50, var(--ion-background-color-step-50, #f2f2f2));--background:var(--ion-color-step-50, var(--ion-background-color-step-50, #f2f2f2))}.input-otp-disabled.sc-ion-input-otp-ios-h{--color:var(--ion-color-step-350, var(--ion-text-color-step-650, #a6a6a6))}.input-otp-fill-outline.input-otp-disabled.sc-ion-input-otp-ios-h{--background:var(--ion-color-step-50, var(--ion-background-color-step-50, #f2f2f2));--border-color:var(--ion-color-step-100, var(--ion-background-color-step-100, #e6e6e6))}.input-otp-disabled.sc-ion-input-otp-ios-h,.input-otp-disabled.sc-ion-input-otp-ios-h .native-input.sc-ion-input-otp-ios:disabled{cursor:not-allowed}.has-focus.sc-ion-input-otp-ios-h .native-input.sc-ion-input-otp-ios:focus{--border-color:var(--highlight-color);outline:none}.input-otp-fill-outline.input-otp-readonly.sc-ion-input-otp-ios-h{--background:var(--ion-color-step-50, var(--ion-background-color-step-50, #f2f2f2))}.input-otp-fill-solid.input-otp-disabled.sc-ion-input-otp-ios-h,.input-otp-fill-solid.input-otp-readonly.sc-ion-input-otp-ios-h{--border-color:var(--ion-color-step-100, var(--ion-background-color-step-100, #e6e6e6));--background:var(--ion-color-step-100, var(--ion-background-color-step-100, #e6e6e6))}.ion-touched.ion-invalid.sc-ion-input-otp-ios-h{--highlight-color:var(--highlight-color-invalid)}.ion-valid.sc-ion-input-otp-ios-h{--highlight-color:var(--highlight-color-valid)}.has-focus.ion-valid.sc-ion-input-otp-ios-h,.ion-touched.ion-invalid.sc-ion-input-otp-ios-h{--border-color:var(--highlight-color)}.ion-color.sc-ion-input-otp-ios-h{--highlight-color-focused:var(--ion-color-base)}.input-otp-fill-outline.ion-color.sc-ion-input-otp-ios-h .native-input.sc-ion-input-otp-ios,.input-otp-fill-solid.ion-color.sc-ion-input-otp-ios-h .native-input.sc-ion-input-otp-ios:focus{border-color:rgba(var(--ion-color-base-rgb), 0.6)}.input-otp-fill-outline.ion-color.ion-invalid.sc-ion-input-otp-ios-h .native-input.sc-ion-input-otp-ios,.input-otp-fill-solid.ion-color.ion-invalid.sc-ion-input-otp-ios-h .native-input.sc-ion-input-otp-ios,.input-otp-fill-outline.ion-color.has-focus.ion-invalid.sc-ion-input-otp-ios-h .native-input.sc-ion-input-otp-ios,.input-otp-fill-solid.ion-color.has-focus.ion-invalid.sc-ion-input-otp-ios-h .native-input.sc-ion-input-otp-ios{border-color:var(--ion-color-danger, #c5000f)}.input-otp-fill-outline.ion-color.ion-valid.sc-ion-input-otp-ios-h .native-input.sc-ion-input-otp-ios,.input-otp-fill-solid.ion-color.ion-valid.sc-ion-input-otp-ios-h .native-input.sc-ion-input-otp-ios,.input-otp-fill-outline.ion-color.has-focus.ion-valid.sc-ion-input-otp-ios-h .native-input.sc-ion-input-otp-ios,.input-otp-fill-solid.ion-color.has-focus.ion-valid.sc-ion-input-otp-ios-h .native-input.sc-ion-input-otp-ios{border-color:var(--ion-color-success, #2dd55b)}.input-otp-fill-outline.input-otp-disabled.ion-color.sc-ion-input-otp-ios-h .native-input.sc-ion-input-otp-ios{border-color:rgba(var(--ion-color-base-rgb), 0.3)}.sc-ion-input-otp-ios-h{--border-width:0.55px}.has-focus.sc-ion-input-otp-ios-h .native-input.sc-ion-input-otp-ios:focus{--border-width:1px}.input-otp-fill-outline.sc-ion-input-otp-ios-h{--border-color:var(--ion-item-border-color, var(--ion-border-color, var(--ion-color-step-250, var(--ion-background-color-step-250, #c8c7cc))))}";

const inputOtpMdCss = ".sc-ion-input-otp-md-h{--margin-top:0;--margin-end:0;--margin-bottom:0;--margin-start:0;--padding-top:16px;--padding-end:0;--padding-bottom:16px;--padding-start:0;--color:initial;--min-width:40px;--separator-width:8px;--separator-height:var(--separator-width);--separator-border-radius:999px;--separator-color:var(--ion-color-step-150, var(--ion-background-color-step-150, #d9d9d9));--highlight-color-focused:var(--ion-color-primary, #0054e9);--highlight-color-valid:var(--ion-color-success, #2dd55b);--highlight-color-invalid:var(--ion-color-danger, #c5000f);--highlight-color:var(--highlight-color-focused);display:block;position:relative;font-size:0.875rem}.input-otp-group.sc-ion-input-otp-md{-webkit-margin-start:var(--margin-start);margin-inline-start:var(--margin-start);-webkit-margin-end:var(--margin-end);margin-inline-end:var(--margin-end);margin-top:var(--margin-top);margin-bottom:var(--margin-bottom);-webkit-padding-start:var(--padding-start);padding-inline-start:var(--padding-start);-webkit-padding-end:var(--padding-end);padding-inline-end:var(--padding-end);padding-top:var(--padding-top);padding-bottom:var(--padding-bottom);display:-ms-flexbox;display:flex;-ms-flex-align:center;align-items:center;-ms-flex-pack:center;justify-content:center}.native-wrapper.sc-ion-input-otp-md{display:-ms-flexbox;display:flex;-ms-flex-align:center;align-items:center;-ms-flex-pack:center;justify-content:center;min-width:var(--min-width)}.native-input.sc-ion-input-otp-md{border-radius:var(--border-radius);width:var(--width);min-width:inherit;height:var(--height);border-width:var(--border-width);border-style:solid;border-color:var(--border-color);background:var(--background);color:var(--color);font-size:inherit;text-align:center;-webkit-appearance:none;-moz-appearance:none;appearance:none}.has-focus.sc-ion-input-otp-md-h .native-input.sc-ion-input-otp-md{caret-color:var(--highlight-color)}.input-otp-description.sc-ion-input-otp-md{color:var(--ion-color-step-700, var(--ion-text-color-step-300, #4d4d4d));font-size:0.75rem;line-height:1.25rem;text-align:center}.input-otp-description-hidden.sc-ion-input-otp-md{display:none}.input-otp-separator.sc-ion-input-otp-md{border-radius:var(--separator-border-radius);-ms-flex-negative:0;flex-shrink:0;width:var(--separator-width);height:var(--separator-height);background:var(--separator-color)}.input-otp-size-small.sc-ion-input-otp-md-h{--width:40px;--height:40px}.input-otp-size-small.sc-ion-input-otp-md-h .input-otp-group.sc-ion-input-otp-md{gap:8px}.input-otp-size-medium.sc-ion-input-otp-md-h{--width:48px;--height:48px}.input-otp-size-large.sc-ion-input-otp-md-h{--width:56px;--height:56px}.input-otp-size-medium.sc-ion-input-otp-md-h .input-otp-group.sc-ion-input-otp-md,.input-otp-size-large.sc-ion-input-otp-md-h .input-otp-group.sc-ion-input-otp-md{gap:12px}.input-otp-shape-round.sc-ion-input-otp-md-h{--border-radius:16px}.input-otp-shape-soft.sc-ion-input-otp-md-h{--border-radius:8px}.input-otp-shape-rectangular.sc-ion-input-otp-md-h{--border-radius:0}.input-otp-fill-outline.sc-ion-input-otp-md-h{--background:none}.input-otp-fill-solid.sc-ion-input-otp-md-h{--border-color:var(--ion-color-step-50, var(--ion-background-color-step-50, #f2f2f2));--background:var(--ion-color-step-50, var(--ion-background-color-step-50, #f2f2f2))}.input-otp-disabled.sc-ion-input-otp-md-h{--color:var(--ion-color-step-350, var(--ion-text-color-step-650, #a6a6a6))}.input-otp-fill-outline.input-otp-disabled.sc-ion-input-otp-md-h{--background:var(--ion-color-step-50, var(--ion-background-color-step-50, #f2f2f2));--border-color:var(--ion-color-step-100, var(--ion-background-color-step-100, #e6e6e6))}.input-otp-disabled.sc-ion-input-otp-md-h,.input-otp-disabled.sc-ion-input-otp-md-h .native-input.sc-ion-input-otp-md:disabled{cursor:not-allowed}.has-focus.sc-ion-input-otp-md-h .native-input.sc-ion-input-otp-md:focus{--border-color:var(--highlight-color);outline:none}.input-otp-fill-outline.input-otp-readonly.sc-ion-input-otp-md-h{--background:var(--ion-color-step-50, var(--ion-background-color-step-50, #f2f2f2))}.input-otp-fill-solid.input-otp-disabled.sc-ion-input-otp-md-h,.input-otp-fill-solid.input-otp-readonly.sc-ion-input-otp-md-h{--border-color:var(--ion-color-step-100, var(--ion-background-color-step-100, #e6e6e6));--background:var(--ion-color-step-100, var(--ion-background-color-step-100, #e6e6e6))}.ion-touched.ion-invalid.sc-ion-input-otp-md-h{--highlight-color:var(--highlight-color-invalid)}.ion-valid.sc-ion-input-otp-md-h{--highlight-color:var(--highlight-color-valid)}.has-focus.ion-valid.sc-ion-input-otp-md-h,.ion-touched.ion-invalid.sc-ion-input-otp-md-h{--border-color:var(--highlight-color)}.ion-color.sc-ion-input-otp-md-h{--highlight-color-focused:var(--ion-color-base)}.input-otp-fill-outline.ion-color.sc-ion-input-otp-md-h .native-input.sc-ion-input-otp-md,.input-otp-fill-solid.ion-color.sc-ion-input-otp-md-h .native-input.sc-ion-input-otp-md:focus{border-color:rgba(var(--ion-color-base-rgb), 0.6)}.input-otp-fill-outline.ion-color.ion-invalid.sc-ion-input-otp-md-h .native-input.sc-ion-input-otp-md,.input-otp-fill-solid.ion-color.ion-invalid.sc-ion-input-otp-md-h .native-input.sc-ion-input-otp-md,.input-otp-fill-outline.ion-color.has-focus.ion-invalid.sc-ion-input-otp-md-h .native-input.sc-ion-input-otp-md,.input-otp-fill-solid.ion-color.has-focus.ion-invalid.sc-ion-input-otp-md-h .native-input.sc-ion-input-otp-md{border-color:var(--ion-color-danger, #c5000f)}.input-otp-fill-outline.ion-color.ion-valid.sc-ion-input-otp-md-h .native-input.sc-ion-input-otp-md,.input-otp-fill-solid.ion-color.ion-valid.sc-ion-input-otp-md-h .native-input.sc-ion-input-otp-md,.input-otp-fill-outline.ion-color.has-focus.ion-valid.sc-ion-input-otp-md-h .native-input.sc-ion-input-otp-md,.input-otp-fill-solid.ion-color.has-focus.ion-valid.sc-ion-input-otp-md-h .native-input.sc-ion-input-otp-md{border-color:var(--ion-color-success, #2dd55b)}.input-otp-fill-outline.input-otp-disabled.ion-color.sc-ion-input-otp-md-h .native-input.sc-ion-input-otp-md{border-color:rgba(var(--ion-color-base-rgb), 0.3)}.sc-ion-input-otp-md-h{--border-width:1px}.has-focus.sc-ion-input-otp-md-h .native-input.sc-ion-input-otp-md:focus{--border-width:2px}.input-otp-fill-outline.sc-ion-input-otp-md-h{--border-color:var(--ion-color-step-300, var(--ion-background-color-step-300, #b3b3b3))}";

const InputOTP = /*@__PURE__*/ proxyCustomElement(class InputOTP extends HTMLElement {
    constructor() {
        super();
        this.__registerHost();
        this.ionInput = createEvent(this, "ionInput", 7);
        this.ionChange = createEvent(this, "ionChange", 7);
        this.ionComplete = createEvent(this, "ionComplete", 7);
        this.ionBlur = createEvent(this, "ionBlur", 7);
        this.ionFocus = createEvent(this, "ionFocus", 7);
        this.inheritedAttributes = {};
        this.inputRefs = [];
        this.inputId = `ion-input-otp-${inputIds++}`;
        this.parsedSeparators = [];
        /**
         * Tracks whether the user is navigating through input boxes using keyboard navigation
         * (arrow keys, tab) versus mouse clicks. This is used to determine the appropriate
         * focus behavior when an input box is focused.
         */
        this.isKeyboardNavigation = false;
        this.inputValues = [];
        this.hasFocus = false;
        /**
         * Indicates whether and how the text value should be automatically capitalized as it is entered/edited by the user.
         * Available options: `"off"`, `"none"`, `"on"`, `"sentences"`, `"words"`, `"characters"`.
         */
        this.autocapitalize = 'off';
        /**
         * If `true`, the user cannot interact with the input.
         */
        this.disabled = false;
        /**
         * The fill for the input boxes. If `"solid"` the input boxes will have a background. If
         * `"outline"` the input boxes will be transparent with a border.
         */
        this.fill = 'outline';
        /**
         * The number of input boxes to display.
         */
        this.length = 4;
        /**
         * If `true`, the user cannot modify the value.
         */
        this.readonly = false;
        /**
         * The shape of the input boxes.
         * If "round" they will have an increased border radius.
         * If "rectangular" they will have no border radius.
         * If "soft" they will have a soft border radius.
         */
        this.shape = 'round';
        /**
         * The size of the input boxes.
         */
        this.size = 'medium';
        /**
         * The type of input allowed in the input boxes.
         */
        this.type = 'number';
        /**
         * The value of the input group.
         */
        this.value = '';
        /**
         * Handles the focus behavior for the input OTP component.
         *
         * Focus behavior:
         * 1. Keyboard navigation: Allow normal focus movement
         * 2. Mouse click:
         *    - If clicked box has value: Focus that box
         *    - If clicked box is empty: Focus first empty box
         *
         * Emits the `ionFocus` event when the input group gains focus.
         */
        this.onFocus = (index) => (event) => {
            var _a;
            const { inputRefs } = this;
            // Only emit ionFocus and set the focusedValue when the
            // component first gains focus
            if (!this.hasFocus) {
                this.ionFocus.emit(event);
                this.focusedValue = this.value;
            }
            this.hasFocus = true;
            let finalIndex = index;
            if (!this.isKeyboardNavigation) {
                // If the clicked box has a value, focus it
                // Otherwise focus the first empty box
                const targetIndex = this.inputValues[index] ? index : this.getFirstEmptyIndex();
                finalIndex = targetIndex === -1 ? this.length - 1 : targetIndex;
                // Focus the target box
                (_a = this.inputRefs[finalIndex]) === null || _a === void 0 ? void 0 : _a.focus();
            }
            // Update tabIndexes to match the focused box
            inputRefs.forEach((input, i) => {
                input.tabIndex = i === finalIndex ? 0 : -1;
            });
            // Reset the keyboard navigation flag
            this.isKeyboardNavigation = false;
        };
        /**
         * Handles the blur behavior for the input OTP component.
         * Emits the `ionBlur` event when the input group loses focus.
         */
        this.onBlur = (event) => {
            const { inputRefs } = this;
            const relatedTarget = event.relatedTarget;
            // Do not emit blur if we're moving to another input box in the same component
            const isInternalFocus = relatedTarget != null && inputRefs.includes(relatedTarget);
            if (!isInternalFocus) {
                this.hasFocus = false;
                // Reset tabIndexes when focus leaves the component
                this.updateTabIndexes();
                // Always emit ionBlur when focus leaves the component
                this.ionBlur.emit(event);
                // Only emit ionChange if the value has actually changed
                if (this.focusedValue !== this.value) {
                    this.emitIonChange(event);
                }
            }
        };
        /**
         * Handles keyboard navigation and input for the OTP component.
         *
         * Navigation:
         * - Backspace: Clears current input and moves to previous box if empty
         * - Arrow Left/Right: Moves focus between input boxes
         * - Tab: Allows normal tab navigation between components
         *
         * Input Behavior:
         * - Validates input against the allowed pattern
         * - When entering a key in a filled box:
         *   - Shifts existing values right if there is room
         *   - Updates the value of the input group
         *   - Prevents default behavior to avoid automatic focus shift
         */
        this.onKeyDown = (index) => (event) => {
            const { length } = this;
            const rtl = isRTL(this.el);
            const input = event.target;
            // Meta shortcuts are used to copy, paste, and select text
            // We don't want to handle these keys here
            const metaShortcuts = ['a', 'c', 'v', 'x', 'r', 'z', 'y'];
            const isTextSelection = input.selectionStart !== input.selectionEnd;
            // Return if the key is a meta shortcut or the input value
            // text is selected and let the onPaste / onInput handler manage it
            if (isTextSelection || ((event.metaKey || event.ctrlKey) && metaShortcuts.includes(event.key.toLowerCase()))) {
                return;
            }
            if (event.key === 'Backspace') {
                if (this.inputValues[index]) {
                    // Shift all values to the right of the current index left by one
                    for (let i = index; i < length - 1; i++) {
                        this.inputValues[i] = this.inputValues[i + 1];
                    }
                    // Clear the last box
                    this.inputValues[length - 1] = '';
                    // Update all inputRefs to match inputValues
                    for (let i = 0; i < length; i++) {
                        this.inputRefs[i].value = this.inputValues[i] || '';
                    }
                    this.updateValue(event);
                    event.preventDefault();
                }
                else if (!this.inputValues[index] && index > 0) {
                    // If current input is empty, move to previous input
                    this.focusPrevious(index);
                }
            }
            else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                this.isKeyboardNavigation = true;
                event.preventDefault();
                const isLeft = event.key === 'ArrowLeft';
                const shouldMoveNext = (isLeft && rtl) || (!isLeft && !rtl);
                // Only allow moving to the next input if the current has a value
                if (shouldMoveNext) {
                    if (this.inputValues[index] && index < length - 1) {
                        this.focusNext(index);
                    }
                }
                else {
                    this.focusPrevious(index);
                }
            }
            else if (event.key === 'Tab') {
                this.isKeyboardNavigation = true;
                // Let all tab events proceed normally
                return;
            }
            // If the input box contains a value and the key being
            // entered is a valid key for the input box update the value
            // and shift the values to the right if there is room.
            if (this.inputValues[index] && this.validKeyPattern.test(event.key)) {
                if (!this.inputValues[length - 1]) {
                    for (let i = length - 1; i > index; i--) {
                        this.inputValues[i] = this.inputValues[i - 1];
                        this.inputRefs[i].value = this.inputValues[i] || '';
                    }
                }
                this.inputValues[index] = event.key;
                this.inputRefs[index].value = event.key;
                this.updateValue(event);
                // Prevent default to avoid the browser from
                // automatically moving the focus to the next input
                event.preventDefault();
            }
        };
        this.onInput = (index) => (event) => {
            const { length, validKeyPattern } = this;
            const value = event.target.value;
            // If the value is longer than 1 character (autofill), split it into
            // characters and filter out invalid ones
            if (value.length > 1) {
                const validChars = value
                    .split('')
                    .filter((char) => validKeyPattern.test(char))
                    .slice(0, length);
                // If there are no valid characters coming from the
                // autofill, all input refs have to be cleared after the
                // browser has finished the autofill behavior
                if (validChars.length === 0) {
                    requestAnimationFrame(() => {
                        this.inputRefs.forEach((input) => {
                            input.value = '';
                        });
                    });
                }
                // Update the value of the input group and emit the input change event
                this.value = validChars.join('');
                this.updateValue(event);
                // Focus the first empty input box or the last input box if all boxes
                // are filled after a small delay to ensure the input boxes have been
                // updated before moving the focus
                setTimeout(() => {
                    var _a;
                    const nextIndex = validChars.length < length ? validChars.length : length - 1;
                    (_a = this.inputRefs[nextIndex]) === null || _a === void 0 ? void 0 : _a.focus();
                }, 20);
                return;
            }
            // Only allow input if it matches the pattern
            if (value.length > 0 && !validKeyPattern.test(value)) {
                this.inputRefs[index].value = '';
                this.inputValues[index] = '';
                return;
            }
            // For single character input, fill the current box
            this.inputValues[index] = value;
            this.updateValue(event);
            if (value.length > 0) {
                this.focusNext(index);
            }
        };
        /**
         * Handles pasting text into the input OTP component.
         * This function prevents the default paste behavior and
         * validates the pasted text against the allowed pattern.
         * It then updates the value of the input group and focuses
         * the next empty input after pasting.
         */
        this.onPaste = (event) => {
            var _a, _b, _c;
            const { inputRefs, length, validKeyPattern } = this;
            event.preventDefault();
            const pastedText = (_a = event.clipboardData) === null || _a === void 0 ? void 0 : _a.getData('text');
            // If there is no pasted text, still emit the input change event
            // because this is how the native input element behaves
            // but return early because there is nothing to paste.
            if (!pastedText) {
                this.emitIonInput(event);
                return;
            }
            const validChars = pastedText
                .split('')
                .filter((char) => validKeyPattern.test(char))
                .slice(0, length);
            // Always paste starting at the first box
            validChars.forEach((char, index) => {
                if (index < length) {
                    this.inputRefs[index].value = char;
                    this.inputValues[index] = char;
                }
            });
            // Update the value so that all input boxes are updated
            this.value = validChars.join('');
            this.updateValue(event);
            // Focus the next empty input after pasting
            // If all boxes are filled, focus the last input
            const nextEmptyIndex = validChars.length;
            if (nextEmptyIndex < length) {
                (_b = inputRefs[nextEmptyIndex]) === null || _b === void 0 ? void 0 : _b.focus();
            }
            else {
                (_c = inputRefs[length - 1]) === null || _c === void 0 ? void 0 : _c.focus();
            }
        };
    }
    /**
     * Sets focus to an input box.
     * @param index - The index of the input box to focus (0-based).
     * If provided and the input box has a value, the input box at that index will be focused.
     * Otherwise, the first empty input box or the last input if all are filled will be focused.
     */
    async setFocus(index) {
        var _a, _b;
        if (typeof index === 'number') {
            const validIndex = Math.max(0, Math.min(index, this.length - 1));
            (_a = this.inputRefs[validIndex]) === null || _a === void 0 ? void 0 : _a.focus();
        }
        else {
            const tabbableIndex = this.getTabbableIndex();
            (_b = this.inputRefs[tabbableIndex]) === null || _b === void 0 ? void 0 : _b.focus();
        }
    }
    valueChanged() {
        this.initializeValues();
        this.updateTabIndexes();
    }
    /**
     * Processes the separators prop into an array of numbers.
     *
     * If the separators prop is not provided, returns an empty array.
     * If the separators prop is 'all', returns an array of all valid positions (1 to length-1).
     * If the separators prop is an array, returns it as is.
     * If the separators prop is a string, splits it by commas and parses each part as a number.
     *
     * If the separators are greater than the input length, it will warn and ignore the separators.
     */
    processSeparators() {
        const { separators, length } = this;
        if (separators === undefined) {
            this.parsedSeparators = [];
            return;
        }
        if (typeof separators === 'string' && separators !== 'all') {
            const isValidFormat = /^(\d+)(,\d+)*$/.test(separators);
            if (!isValidFormat) {
                printIonWarning(`[ion-input-otp] - Invalid separators format. Expected a comma-separated list of numbers, an array of numbers, or "all". Received: ${separators}`, this.el);
                this.parsedSeparators = [];
                return;
            }
        }
        let separatorValues;
        if (separators === 'all') {
            separatorValues = Array.from({ length: length - 1 }, (_, i) => i + 1);
        }
        else if (Array.isArray(separators)) {
            separatorValues = separators;
        }
        else {
            separatorValues = separators
                .split(',')
                .map((pos) => parseInt(pos, 10))
                .filter((pos) => !isNaN(pos));
        }
        // Check for duplicate separator positions
        const duplicates = separatorValues.filter((pos, index) => separatorValues.indexOf(pos) !== index);
        if (duplicates.length > 0) {
            printIonWarning(`[ion-input-otp] - Duplicate separator positions are not allowed. Received: ${separators}`, this.el);
        }
        const invalidSeparators = separatorValues.filter((pos) => pos > length);
        if (invalidSeparators.length > 0) {
            printIonWarning(`[ion-input-otp] - The following separator positions are greater than the input length (${length}): ${invalidSeparators.join(', ')}. These separators will be ignored.`, this.el);
        }
        this.parsedSeparators = separatorValues.filter((pos) => pos <= length);
    }
    componentWillLoad() {
        this.inheritedAttributes = inheritAriaAttributes(this.el);
        this.processSeparators();
        this.initializeValues();
    }
    componentDidLoad() {
        this.updateTabIndexes();
    }
    /**
     * Get the regex pattern for allowed characters.
     * If a pattern is provided, use it to create a regex pattern
     * Otherwise, use the default regex pattern based on type
     */
    get validKeyPattern() {
        return new RegExp(`^${this.getPattern()}$`, 'u');
    }
    /**
     * Gets the string pattern to pass to the input element
     * and use in the regex for allowed characters.
     */
    getPattern() {
        const { pattern, type } = this;
        if (pattern) {
            return pattern;
        }
        return type === 'number' ? '[\\p{N}]' : '[\\p{L}\\p{N}]';
    }
    /**
     * Get the default value for inputmode.
     * If inputmode is provided, use it.
     * Otherwise, use the default inputmode based on type
     */
    getInputmode() {
        const { inputmode } = this;
        if (inputmode) {
            return inputmode;
        }
        if (this.type == 'number') {
            return 'numeric';
        }
        else {
            return 'text';
        }
    }
    /**
     * Initializes the input values array based on the current value prop.
     * This splits the value into individual characters and validates them against
     * the allowed pattern. The values are then used as the values in the native
     * input boxes and the value of the input group is updated.
     */
    initializeValues() {
        // Clear all input values
        this.inputValues = Array(this.length).fill('');
        // If the value is null, undefined, or an empty string, return
        if (this.value == null || String(this.value).length === 0) {
            return;
        }
        // Split the value into individual characters and validate
        // them against the allowed pattern
        const chars = String(this.value).split('').slice(0, this.length);
        chars.forEach((char, index) => {
            if (this.validKeyPattern.test(char)) {
                this.inputValues[index] = char;
            }
        });
        // Update the value without emitting events
        this.value = this.inputValues.join('');
    }
    /**
     * Updates the value of the input group.
     * This updates the value of the input group and emits an `ionChange` event.
     * If all of the input boxes are filled, it emits an `ionComplete` event.
     */
    updateValue(event) {
        const { inputValues, length } = this;
        const newValue = inputValues.join('');
        this.value = newValue;
        this.emitIonInput(event);
        if (newValue.length === length) {
            this.ionComplete.emit({ value: newValue });
        }
    }
    /**
     * Emits an `ionChange` event.
     * This API should be called for user committed changes.
     * This API should not be used for external value changes.
     */
    emitIonChange(event) {
        const { value } = this;
        // Checks for both null and undefined values
        const newValue = value == null ? value : value.toString();
        this.ionChange.emit({ value: newValue, event });
    }
    /**
     * Emits an `ionInput` event.
     * This is used to emit the input value when the user types,
     * backspaces, or pastes.
     */
    emitIonInput(event) {
        const { value } = this;
        // Checks for both null and undefined values
        const newValue = value == null ? value : value.toString();
        this.ionInput.emit({ value: newValue, event });
    }
    /**
     * Focuses the next input box.
     */
    focusNext(currentIndex) {
        var _a;
        const { inputRefs, length } = this;
        if (currentIndex < length - 1) {
            (_a = inputRefs[currentIndex + 1]) === null || _a === void 0 ? void 0 : _a.focus();
        }
    }
    /**
     * Focuses the previous input box.
     */
    focusPrevious(currentIndex) {
        var _a;
        const { inputRefs } = this;
        if (currentIndex > 0) {
            (_a = inputRefs[currentIndex - 1]) === null || _a === void 0 ? void 0 : _a.focus();
        }
    }
    /**
     * Searches through the input values and returns the index
     * of the first empty input.
     * Returns -1 if all inputs are filled.
     */
    getFirstEmptyIndex() {
        var _a;
        const { inputValues, length } = this;
        // Create an array of the same length as the input OTP
        // and fill it with the input values
        const values = Array.from({ length }, (_, i) => inputValues[i] || '');
        return (_a = values.findIndex((value) => !value || value === '')) !== null && _a !== void 0 ? _a : -1;
    }
    /**
     * Returns the index of the input that should be tabbed to.
     * If all inputs are filled, returns the last input's index.
     * Otherwise, returns the index of the first empty input.
     */
    getTabbableIndex() {
        const { length } = this;
        const firstEmptyIndex = this.getFirstEmptyIndex();
        return firstEmptyIndex === -1 ? length - 1 : firstEmptyIndex;
    }
    /**
     * Updates the tabIndexes for the input boxes.
     * This is used to ensure that the correct input is
     * focused when the user navigates using the tab key.
     */
    updateTabIndexes() {
        const { inputRefs, inputValues, length } = this;
        // Find first empty index after any filled boxes
        let firstEmptyIndex = -1;
        for (let i = 0; i < length; i++) {
            if (!inputValues[i] || inputValues[i] === '') {
                firstEmptyIndex = i;
                break;
            }
        }
        // Update tabIndex and aria-hidden for all inputs
        inputRefs.forEach((input, index) => {
            const shouldBeTabbable = firstEmptyIndex === -1 ? index === length - 1 : firstEmptyIndex === index;
            input.tabIndex = shouldBeTabbable ? 0 : -1;
            // If the input is empty and not the first empty input,
            // it should be hidden from screen readers.
            const isEmpty = !inputValues[index] || inputValues[index] === '';
            input.setAttribute('aria-hidden', isEmpty && !shouldBeTabbable ? 'true' : 'false');
        });
    }
    /**
     * Determines if a separator should be shown for a given index by
     * checking if the index is included in the parsed separators array.
     */
    showSeparator(index) {
        const { length } = this;
        return this.parsedSeparators.includes(index + 1) && index < length - 1;
    }
    render() {
        var _a, _b;
        const { autocapitalize, color, disabled, el, fill, hasFocus, inheritedAttributes, inputId, inputRefs, inputValues, length, readonly, shape, size, } = this;
        const mode = getIonMode(this);
        const inputmode = this.getInputmode();
        const tabbableIndex = this.getTabbableIndex();
        const pattern = this.getPattern();
        const hasDescription = ((_b = (_a = el.querySelector('.input-otp-description')) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim()) !== '';
        return (h(Host, { key: 'df8fca036cedea0812185a02e3b655d7d76285e0', class: createColorClasses(color, {
                [mode]: true,
                'has-focus': hasFocus,
                [`input-otp-size-${size}`]: true,
                [`input-otp-shape-${shape}`]: true,
                [`input-otp-fill-${fill}`]: true,
                'input-otp-disabled': disabled,
                'input-otp-readonly': readonly,
            }) }, h("div", Object.assign({ key: '831be3f939cf037f0eb8d7e37e0afd4ef9a3c2c5', role: "group", "aria-label": "One-time password input", class: "input-otp-group" }, inheritedAttributes), Array.from({ length }).map((_, index) => (h(Fragment, null, h("div", { class: "native-wrapper" }, h("input", { class: "native-input", id: `${inputId}-${index}`, "aria-label": `Input ${index + 1} of ${length}`, type: "text", autoCapitalize: autocapitalize, inputmode: inputmode, pattern: pattern, disabled: disabled, readOnly: readonly, tabIndex: index === tabbableIndex ? 0 : -1, value: inputValues[index] || '', autocomplete: "one-time-code", ref: (el) => (inputRefs[index] = el), onInput: this.onInput(index), onBlur: this.onBlur, onFocus: this.onFocus(index), onKeyDown: this.onKeyDown(index), onPaste: this.onPaste })), this.showSeparator(index) && h("div", { class: "input-otp-separator" }))))), h("div", { key: '5311fedc34f7af3efd5f69e5a3d768055119c4f1', class: {
                'input-otp-description': true,
                'input-otp-description-hidden': !hasDescription,
            } }, h("slot", { key: '9e8afa2f7fa76c3092582dc27770fdf565a1b9ba' }))));
    }
    get el() { return this; }
    static get watchers() { return {
        "value": ["valueChanged"],
        "separators": ["processSeparators"],
        "length": ["processSeparators"]
    }; }
    static get style() { return {
        ios: inputOtpIosCss,
        md: inputOtpMdCss
    }; }
}, [38, "ion-input-otp", {
        "autocapitalize": [1],
        "color": [513],
        "disabled": [516],
        "fill": [1],
        "inputmode": [1],
        "length": [2],
        "pattern": [1],
        "readonly": [516],
        "separators": [1],
        "shape": [1],
        "size": [1],
        "type": [1],
        "value": [1032],
        "inputValues": [32],
        "hasFocus": [32],
        "setFocus": [64]
    }, undefined, {
        "value": ["valueChanged"],
        "separators": ["processSeparators"],
        "length": ["processSeparators"]
    }]);
let inputIds = 0;
function defineCustomElement$1() {
    if (typeof customElements === "undefined") {
        return;
    }
    const components = ["ion-input-otp"];
    components.forEach(tagName => { switch (tagName) {
        case "ion-input-otp":
            if (!customElements.get(tagName)) {
                customElements.define(tagName, InputOTP);
            }
            break;
    } });
}

const IonInputOtp = InputOTP;
const defineCustomElement = defineCustomElement$1;

export { IonInputOtp, defineCustomElement };
