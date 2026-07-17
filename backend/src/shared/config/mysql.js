import mysql from "mysql2/promise";
import config from "./index.js";
import logger from "./logger.js";

class MySQLConnection {
    constructor() {
        this.pool = null;
    }

    getPool() {
        if (this.pool) {
            return this.pool; // reuse existing pool
        }

        this.pool = mysql.createPool({
            host: config.mysql.host,
            port: config.mysql.port,
            database: config.mysql.database,
            user: config.mysql.user,
            password: config.mysql.password,
            connectionLimit: 10,      // max 10 connections at once
            waitForConnections: true, // queue if all 10 are busy
            queueLimit: 0,            // unlimited queue
            connectTimeout: 10000,    // 10s timeout
        });

        this.pool.on("error", error => {
            logger.error("MySQL Pool Error", error);
        });

        logger.info(`MySQL Pool Created : ${config.mysql.host}:${config.mysql.port}/${config.mysql.database}`);
        return this.pool;
    }

    async testConnection() {
        try {
            const pool = this.getPool();
            const connection = await pool.getConnection(); // grab one from pool
            const [rows] = await connection.query({
                sql: "SELECT NOW() AS now",
                timeout: 30000,
            });
            connection.release(); // IMPORTANT — return it back to pool

            logger.info(`MySQL Test Successful at ${rows[0].now}`);
        } catch (error) {
            logger.error("MySQL Connection Test Failed", error);
            throw error;
        }
    }

    async closePool() {
        try {
            if (this.pool) {
                await this.pool.end(); // close all connections gracefully
                this.pool = null;
                logger.info("MySQL Pool Closed !!!");
            }
        } catch (error) {
            logger.error("Failed to close MySQL Pool", error);
            throw error;
        }
    }

    async query(options = {}) {
        const pool = this.getPool();
        const start = Date.now();
        try {
            const [result] = await pool.query(options);
            const duration = Date.now() - start;

            let rowCount;

            if (Array.isArray(result)) {
                rowCount = result.length;   //for SELECT query
            } else {
                rowCount = result.affectedRows; //for INSERT or UPDATE or DELETE
            }
            logger.debug("⚒️⚒️⚒️ Executed Query", {
                sql: options.sql,
                duration,
                rowCount,
            });
            return result;
        } catch (error) {
            logger.error("💔💔💔 Query Error :", error);
            throw error;
        }
    }
}

export default new MySQLConnection();