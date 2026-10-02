/**
 * Lightweight, zero-dependency EventEmitter compatible with both Browser and Node.js runtimes.
 */
export type EventListener = (...args: any[]) => void;

export class TypedEventEmitter {
  private listeners: Map<string, Set<EventListener>> = new Map();

  public on(event: string, listener: EventListener): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return this;
  }

  public once(event: string, listener: EventListener): this {
    const onceWrapper = (...args: any[]) => {
      this.off(event, onceWrapper);
      listener(...args);
    };
    return this.on(event, onceWrapper);
  }

  public off(event: string, listener: EventListener): this {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
    return this;
  }

  public removeListener(event: string, listener: EventListener): this {
    return this.off(event, listener);
  }

  public removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  public emit(event: string, ...args: any[]): boolean {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return false;
    for (const listener of Array.from(set)) {
      try {
        listener(...args);
      } catch (err) {
        console.error(`[TypedEventEmitter] Error in listener for event "${event}":`, err);
      }
    }
    return true;
  }
}
