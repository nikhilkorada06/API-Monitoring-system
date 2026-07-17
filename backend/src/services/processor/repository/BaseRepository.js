/**
 * BaseRepository
 * Database-agnostic repository contract. 
 * Concrete repositories should extend this class and implement/override database-specific methods.
 * 
 * @class BaseRepository
 * @param {Object} options - Options for the repository.
 * @param {Object} options.logger - Logger instance for logging.
 * @throws {Error} If any of the methods are not implemented in the derived class.
 */

export class BaseRepository {
    constructor({ logger: log = console }) {
        this.logger = log;
    }

    async save() {
        throw new Error("💔💔💔 BaseRepository.save() method must be implemented in the derived class !!!");
    }

    async find() {
        throw new Error("💔💔💔 BaseRepository.find() method must be implemented in the derived class !!!");
    }

    async count() {
        throw new Error("💔💔💔 BaseRepository.count() method must be implemented in the derived class !!!");
    }

    async deleteOldHits() {
        throw new Error("💔💔💔 BaseRepository.deleteOldHits() method must be implemented in the derived class !!!");
    }
}