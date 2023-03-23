export type Event = {
  opId: string;
  type: "request" | "response" | "error";
  occurredAt: number;
}

/**
 * A time slice spans a specific time range and contains all events that occurred during that time.
 */
export class TimeSlice {
  readonly startTimestamp: number;
  readonly duration: number;

  readonly eventLog: Event[];
  readonly pendingIDs: Set<string>;

  constructor(startTimestamp: number, duration: number) {
    this.startTimestamp = startTimestamp;
    this.duration = duration;
    this.eventLog = [];
    this.pendingIDs = new Set();
  }

  /**
   * Returns 'false' if the time slice has pending responses.
   */
  isBalanced(): boolean {
    return this.pendingIDs.size === 0;
  }

  request(opId: string) {
    this.pendingIDs.add(opId);
    this.eventLog.push({
      opId: opId,
      type: "request",
      occurredAt: Date.now()
    });
  }

  response(opId: string) : boolean {
    if(!this.pendingIDs.has(opId)) {
      return false;
    }
    this.eventLog.push({
      opId: opId,
      type: "response",
      occurredAt: Date.now()
    });

    this.pendingIDs.delete(opId);
    return true;
  }

  error(opId: string) : boolean {
    if(!this.pendingIDs.has(opId)) {
      return false;
    }
    this.eventLog.push({
      opId: opId,
      type: "error",
      occurredAt: Date.now()
    });

    this.pendingIDs.delete(opId);
    return true;
  }
}


export class RingBuffer<T> {
  readonly capacity: number;
  readonly items: T[] = [];

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  push(item: T) {
    if(this.items.length === this.capacity) {
      this.items.shift();
    }
    this.items.push(item);
  }
}

/**
 * Creates a new time slice every 'duration' milliseconds and sets it as the 'master' time slice.
 * There can be multiple time slices 'pending' at the same time but only the 'master' is used to track new requests.
 * All other 'pending' time slices just receive outstanding responses until they are balanced.
 * All balanced time slices are moved to the 'history' list.
 */
export class StatisticsLogger {

  readonly interval: number;
  readonly pending: TimeSlice[];
  readonly history: RingBuffer<TimeSlice>;

  private _active?: TimeSlice;
  private _timerInterval?: NodeJS.Timeout;

  get currentWindowStart() : number {
    return this._active?.startTimestamp ?? 0;
  }

  constructor(interval: number, historySize: number) {
    this.interval = interval;
    this.pending = [];
    this.history = new RingBuffer<TimeSlice>(historySize);
  }

  start() {
    this._active = new TimeSlice(Date.now(), this.interval);
    this.pending.push(this._active);
    this._timerInterval = setInterval(() => this.onIntervalElapsed(), this.interval);
  }

  stop() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
    }
  }

  request(opId: string) {
    if (!this._active) {
      throw new Error("Start the logger first.");
    }
    this._active.request(opId);
  }

  response(opId: string) {
    const countingTimeSlice = this.pending.find(o => o.response(opId));
    if (!countingTimeSlice) {
      throw new Error("No pending time slice found for opId: " + opId);
    }
  }

  error(opId: string) {
    const countingTimeSlice = this.pending.find(o => o.error(opId));
    if (!countingTimeSlice) {
      throw new Error("No pending time slice found for opId: " + opId);
    }
  }

  private onIntervalElapsed() {
    if (this._active) {
      this.history.push(this._active);
    }

    const newActive = new TimeSlice(Date.now(), this.interval);

    this._active = newActive;
    this.pending.push(newActive);
    this.cleanPending();
  }

  private cleanPending() {
    for (let i = this.pending.length -1; i >= 0; i--) {
      const pendingSlice = this.pending[i];
      if (pendingSlice.startTimestamp === this.currentWindowStart) {
        // Don't remove the active time slice.
        continue;
      }
      if (pendingSlice.isBalanced()) {
        // Balanced means that all requests have been responded to. Can be removed.
        this.pending.splice(i, 1);
      }
    }
  }
}
