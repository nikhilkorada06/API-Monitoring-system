export const CircuitState = Object.freeze({
    CLOSED: 'CLOSED',
    OPEN: 'OPEN',
    HALF_OPEN: 'HALF_OPEN',
});

export class CircuitBreaker {
    constructor(opts = {}) {
        this.failureThreshold = opts.failureThreshold ?? 5; // How many consecutive failures are allowed before opening the circuit?
        this.coolDownMs = opts.coolDownMs ?? 30_000; // How long should the circuit stay OPEN?
        this.halfOpenMaxAttempts = opts.halfOpenMaxAttempts ?? 3; // how many requests to allow in half-open state before closing the circuit again
        this.logger = opts.logger ?? console;

        // variable starting with '_' means its a private variable, so it should not be accessed outside this class
        this._state = CircuitState.CLOSED; // Current state of breaker. can be CLOSED, OPEN, or HALF_OPEN
        this._failures = 0;        // How many consecutive failures happened?
        this._lastFailureTime = 0;  // timestamp of last failure, used to determine if the cooldown period has elapsed
        this._halfOpenAttempts = 0; // How many requests have been made in the half-open state?
        this._halfOpenSuccesses = 0;    // How many successful requests have been made in the half-open state?
    }

    /**
     * - CLOSED: All requests are allowed to pass through.
     * @returns {Boolean} - True if the cooldown period has elapsed, false otherwise.
     */
    _cooldownElapsed() {
        return (Date.now() - this._lastFailureTime) >= this.coolDownMs;
    }

    /**
     * -  _transitionTo method is used to change the state of the circuit breaker and log the transition.
     * -  also resets the _halfOpenAttempts and _halfOpenSuccesses counters when transitioning to HALF_OPEN state.
     * @param {CircuitState} newState 
     */
    _transitionTo(newState) {
        const previousState = this._state;
        this._state = newState;
        this.logger.info(`✍🏻✍🏻✍🏻 [CIRCUIT BREAKER] ${previousState} ===> ${newState} !!!`);

        if(this._state === CircuitState.HALF_OPEN) {
            this._halfOpenAttempts = 0;
            this._halfOpenSuccesses = 0;
            this.logger.info(`✍🏻✍🏻✍🏻 [CIRCUIT BREAKER] ${this._state} ===> HALF_OPEN and _halfOpenAttempts and _halfOpenSuccesses counters are reset to 0 !!!`);
        }
    }

    /**
     * -  _openCircuit method is used to open the circuit breaker and log the transition.
     * -  It also sets the _lastFailureTime to the current time to start the cooldown period.
     * @returns {void} - no return value
    */
    _openCircuit() {
        this._lastFailureTime = Date.now();
        this._transitionTo(CircuitState.OPEN);

        this.logger.info(`⛔⛔⛔ [CIRCUIT BREAKER] ${this._state} ===> OPEN. All requests will be blocked for ${this.coolDownMs / 1000} seconds !!!`, {
            failures: this._failures,
            coolDownMs: this.coolDownMs,
        });
    }

    /**
     *  - _reset method is used to reset the circuit breaker to its initial state and log the transition.
     */
    _reset() {
        this._state = CircuitState.CLOSED;
        this._failures = 0;
        this._halfOpenAttempts = 0;
        this._halfOpenSuccesses = 0;
    }

    /**
     * -Returns the current state of the circuit breaker.
     * @returns {CircuitState} - can be CLOSED, OPEN, or HALF_OPEN
     */
    get state() {
        if(this._state === CircuitState.OPEN && this._cooldownElapsed()) {
            this._transitionTo(CircuitState.HALF_OPEN);
        }
        return this._state;
    }

    /**
     * - allowRequest method is used to determine if a request should be allowed based on the current state of the circuit breaker.
     * - If the circuit is CLOSED, all requests are allowed.
     * - If the circuit is HALF_OPEN, a limited number of requests are allowed.
     * - If the circuit is OPEN, no requests are allowed.
     * @returns {Boolean} - True if the request is allowed, false otherwise.
     */
    allowRequest() {
        const currentState = this.state;

        this.logger.debug('[CircuitBreaker] allowRequest check', {
            state: currentState,
            halfOpenAttempts: this._halfOpenAttempts,
            halfOpenMaxAttempts: this.halfOpenMaxAttempts,
            halfOpenSuccesses: this._halfOpenSuccesses,
            failures: this._failures
        });

        // In CLOSED state, all requests are allowed. 
        if(currentState === CircuitState.CLOSED) {
            return true;
        }

        if(currentState === CircuitState.HALF_OPEN) {
            if(this._halfOpenAttempts < this.halfOpenMaxAttempts) {
                this._halfOpenAttempts++;
                this.logger.info(`[CircuitBreaker] allowing HALF_OPEN attempt ${this._halfOpenAttempts}/${this.halfOpenMaxAttempts}`);
                return true;
            }
            this.logger.warn(`[CircuitBreaker] HALF_OPEN attempts exhausted (${this._halfOpenAttempts}/${this.halfOpenMaxAttempts})`);
            return false;
        }
        this.logger.info(`[CircuitBreaker] rejecting request, state: ${currentState}`);

        // In OPEN state, reject all requests until cooldown has elapsed
        return false;
    }

    /**
     * - onSuccess method is used to handle a successful request in the circuit breaker.
     * - It resets the failure count and transitions the circuit to CLOSED if it was in HALF_OPEN state.
     * @returns {void} - no return value
     */
    onSuccess() {
        const currentState = this.state;
        if(currentState === CircuitState.HALF_OPEN) {
            this._halfOpenSuccesses++;
            if(this._halfOpenSuccesses >= this.halfOpenMaxAttempts) {
                this._reset();
                this.logger.info(`✍🏻✍🏻✍🏻 [CIRCUIT BREAKER] ${currentState} ===> CLOSED. After successful half-open attempts !!!`);
            }
            return;
        }

        if(this._failures > 0) {
            this._failures = 0;
            this.logger.info(`✍🏻✍🏻✍🏻 [CIRCUIT BREAKER] failure counter reset to 0 after success. _failures counter reset to 0!!!`);
        }
    }

    /**
     * - onFailure method is used to handle a failure in the circuit breaker. 
     * - It increments the failure count and opens the circuit if the failure threshold is reached.
     * @returns {void} - no return value
     */
    onFailure() {
        const currentState = this.state;
        if(currentState === CircuitState.HALF_OPEN) {
            this.logger.info(`❌❌❌ [CIRCUIT BREAKER] ${currentState} ===> OPEN. After failure in half-open state !!!`);
            this._openCircuit();
            return;
        }

        this._failures++;
        this._lastFailureTime = Date.now();

        if(this._failures >= this.failureThreshold) {
            this._openCircuit();
        }
    }

    /**
     * - Returns a snapshot of the current state of the circuit breaker.
     * @returns {Object} - The snapshot of the current state of the circuit breaker.
     * @property {CircuitState} state - The current state of the circuit breaker.
     * @property {Number} failures - The number of failures that have occurred.
     * @property {Number} lastFailureTime - The timestamp of the last failure.
     * @property {Number} halfOpenAttempts - The number of attempts made in the half-open state.
     * @property {Number} halfOpenSuccesses - The number of successful attempts made in the half-open state.
     */
    snapshot() {
        return {
            state: this.state,
            failures: this._failures,
            lastFailureTime: this._lastFailureTime,
            halfOpenAttempts: this._halfOpenAttempts,
            halfOpenSuccesses: this._halfOpenSuccesses,
        };
    }
}