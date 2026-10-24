// Frozen detector from 43fea7a, before general layout damping and completed-swing tracking.
// Research reference only; not shipped as a library compatibility mode.
/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */
const circulationWindows = [8, 16, 32];
/**
 * Detects repeated, persistent reversals of actual per-step focal-node movement.
 * A local impulse damper preserves the force balance, unlike weakening only RFC springs.
 * No timers run: recovery advances only while integration steps are being observed.
 */
export class RfcStabilizer {
    enabled;
    now;
    samples = new Map();
    lastTime = null;
    quietMs = 0;
    recoveryMs = 0;
    recoveryStart = 1;
    state;
    constructor(options = {}) {
        if (options.enabled !== undefined && typeof options.enabled !== "boolean")
            throw new TypeError("stabilization.enabled must be boolean");
        if (options.now !== undefined && typeof options.now !== "function")
            throw new TypeError("stabilization.now must be a function");
        this.enabled = options.enabled ?? false;
        this.now = options.now ?? (() => performance.now());
        this.state = this.initialState();
    }
    initialState() {
        return { enabled: this.enabled, phase: "steady", gain: 1, detections: 0, maxStepDisplacement: 0, lastTrigger: null, detectedNodeIds: [], recoveryBackoffs: 0 };
    }
    /** Detached diagnostic snapshot; configured RFC strengths are never changed by stabilization. */
    getState() { return { ...this.state, detectedNodeIds: [...this.state.detectedNodeIds] }; }
    /** Toggles the experiment and discards its learned motion history and damping. */
    setEnabled(enabled) {
        if (typeof enabled !== "boolean")
            throw new TypeError("stabilization.enabled must be boolean");
        if (enabled === this.enabled)
            return;
        this.enabled = enabled;
        this.reset();
    }
    /** Clears history on focus removal/replacement, suspension or destruction. */
    reset() {
        this.state = this.initialState();
        this.forgetMotion();
    }
    /** Starts a fresh observation window without abruptly removing an existing local damper. */
    forgetMotion() {
        this.samples.clear();
        this.lastTime = null;
        this.quietMs = this.recoveryMs = 0;
        if (this.state.gain < 1)
            this.state.phase = "damping";
    }
    /**
     * Called after RFC force accumulation, before TG integrates. Measures positions from
     * the previous step, then attenuates dx/dy only for movable focal members.
     * The dragged member is excluded; other centers continue being monitored. Long gaps
     * discard history so pauses do not count as quiet simulation time.
     */
    apply(nodes, dragged = null) {
        if (!this.enabled)
            return;
        const movable = nodes.filter(node => !node.fixed && node !== dragged);
        if (!movable.length) {
            this.forgetMotion();
            this.state.maxStepDisplacement = 0;
            return;
        }
        const time = this.now(), elapsed = this.lastTime === null ? 0 : time - this.lastTime;
        const discontinuity = !Number.isFinite(time) || elapsed < 0 || elapsed > 250;
        const changed = movable.length !== this.samples.size || movable.some(node => !this.samples.has(node));
        if (discontinuity || changed)
            this.forgetMotion();
        const dt = this.lastTime === null ? 0 : Math.min(50, elapsed);
        this.lastTime = Number.isFinite(time) ? time : null;
        let maximum = 0, triggerMaximum = 0, maxImpulse = 0;
        const detected = [];
        let trigger = null;
        for (const node of movable) {
            const previous = this.samples.get(node);
            const dx = previous ? node.x - previous.x : 0, dy = previous ? node.y - previous.y : 0;
            const distance = Math.hypot(dx, dy), priorDistance = previous ? Math.hypot(previous.dx, previous.dy) : 0;
            maximum = Math.max(maximum, distance);
            maxImpulse = Math.max(maxImpulse, Math.hypot(node.dx, node.dy));
            const history = previous?.history ?? [], reversals = previous?.reversals ?? [];
            if (previous) {
                history.push({ dx, dy, length: distance });
                if (history.length > 32)
                    history.shift();
                reversals.push(distance > .1 && priorDistance > .1 && distance >= priorDistance * .8 && dx * previous.dx + dy * previous.dy < -.1 * distance * priorDistance);
                if (reversals.length > 8)
                    reversals.shift();
            }
            const reversing = reversals.filter(Boolean).length >= 3;
            const circulating = circulationWindows.some(count => {
                if (history.length < count)
                    return false;
                const window = history.slice(-count), half = count / 2;
                const first = window.slice(0, half).reduce((s, m) => s + m.length, 0), last = window.slice(half).reduce((s, m) => s + m.length, 0);
                const travel = first + last, net = Math.hypot(window.reduce((s, m) => s + m.dx, 0), window.reduce((s, m) => s + m.dy, 0));
                return first / half > .1 && last / half > .1 && last >= first * .8 && net < travel * .35;
            });
            if (reversing || circulating) {
                detected.push(node.getID() ?? "(anonymous)");
                triggerMaximum = Math.max(triggerMaximum, distance);
                if (reversing || trigger === null)
                    trigger = reversing ? "reversal" : "circulation";
            }
            this.samples.set(node, { x: node.x, y: node.y, dx, dy, history, reversals });
        }
        this.state.maxStepDisplacement = maximum;
        if (detected.length) {
            // Clipped large swings can hide enormous accumulated impulses. Bound the next
            // requested step as well as halving gain; a fixed 1/256 floor can be too weak.
            this.state.gain = Math.max(1e-8, Math.min(this.state.gain * .5, triggerMaximum >= 10 && maxImpulse > 0 ? 2 / maxImpulse : 1));
            this.state.phase = "damping";
            this.state.detections++;
            this.state.lastTrigger = trigger;
            this.state.detectedNodeIds = detected.sort();
            this.quietMs = this.recoveryMs = 0;
            for (const sample of this.samples.values()) {
                sample.history = [];
                sample.reversals = [];
            }
        }
        else if (this.state.gain < 1) {
            if (maximum > .1) {
                if (this.state.phase === "recovering") {
                    this.state.gain = Math.min(this.state.gain, this.recoveryStart);
                    this.state.recoveryBackoffs++;
                }
                this.quietMs = this.recoveryMs = 0;
                this.state.phase = "damping";
            }
            else if (this.state.phase === "damping") {
                this.quietMs += dt;
                if (this.quietMs >= 500) {
                    this.state.phase = "recovering";
                    this.recoveryStart = this.state.gain;
                    this.recoveryMs = 0;
                }
            }
            else {
                this.recoveryMs = Math.min(3000, this.recoveryMs + dt);
                const t = this.recoveryMs / 3000, smooth = t * t * (3 - 2 * t);
                this.state.gain = this.recoveryStart + (1 - this.recoveryStart) * smooth;
                if (t === 1)
                    this.state.phase = "steady";
            }
        }
        if (this.state.gain < 1)
            for (const node of movable) {
                node.dx *= this.state.gain;
                node.dy *= this.state.gain;
            }
    }
}
