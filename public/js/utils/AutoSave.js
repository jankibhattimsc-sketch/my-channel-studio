/**
 * Reusable AutoSave Utility with Debounce & Visual State Machine
 * Handles 1200ms debounce, offline detection, and status toast callbacks.
 */

export class AutoSave {
  /**
   * @param {Object} options
   * @param {number} options.debounceDelay - delay in ms (default: 1200ms)
   * @param {function} options.onStatusChange - callback: ('saving' | 'saved' | 'offline' | 'error', message)
   * @param {function} options.saveFn - async function performing the actual write
   */
  constructor(options = {}) {
    this.debounceDelay = typeof options.debounceDelay === 'number' ? options.debounceDelay : 1200;
    this.onStatusChange = options.onStatusChange || null;
    this.saveFn = options.saveFn || null;
    this.timer = null;
    this.isSaving = false;
    this.pendingTrigger = false;
  }

  notify(state, message = '') {
    if (typeof this.onStatusChange === 'function') {
      this.onStatusChange(state, message);
    }
  }

  /**
   * Trigger a debounced save.
   * Calls onStatusChange('saving') immediately so user gets fast visual feedback.
   */
  trigger(customSaveFn = null) {
    if (customSaveFn) this.saveFn = customSaveFn;

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.notify('saving', '⏳ સેવ થઈ રહ્યું છે... (Saving...)');

    this.timer = setTimeout(() => {
      this.saveNow();
    }, this.debounceDelay);
  }

  /**
   * Execute immediate save without waiting for debounce timer
   */
  async saveNow() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (!this.saveFn) return;

    if (this.isSaving) {
      this.pendingTrigger = true;
      return;
    }

    this.isSaving = true;

    try {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      const result = await this.saveFn();

      if (!isOnline || result === 'offline') {
        this.notify('offline', '📶 Offline - સ્થાનિક રીતે સેવ થયું (Saved Locally)');
      } else if (result === false) {
        this.notify('error', '⚠️ સેવ નિષ્ફળ - ફરી પ્રયાસ થઈ રહ્યો છે...');
      } else {
        this.notify('saved', '✓ Cloud માં સેવ થઈ ગયું (Saved to Cloud)');
      }
    } catch (err) {
      console.warn('[AutoSave Exception]:', err.message);
      this.notify('error', '⚠️ સેવ નિષ્ફળ - લોકલ ડેટા સચવાયેલો છે.');
    } finally {
      this.isSaving = false;
      if (this.pendingTrigger) {
        this.pendingTrigger = false;
        this.trigger();
      }
    }
  }

  cancel() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
