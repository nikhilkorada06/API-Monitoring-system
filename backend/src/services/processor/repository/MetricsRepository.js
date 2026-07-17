import { BaseRepository } from "./BaseRepository.js";
import config from "../../../shared/config/index.js";

const MAX_LIMIT = config.mysql.maxLimit;
const QUERY_TIMEOUT_MS = config.mysql.metricsTimeoutMs;

export class MetricsRepository extends BaseRepository {
    constructor({ logger: l, mysql: db } = {}) {
        super({ logger: l })
        this.mysql = db;
    }

    async upsertEndpointMetrics(metricsData) {
        try {
            const {
                clientId,
                serviceName,
                endpoint,
                method,
                totalHits,
                errorHits,
                avgLatency,
                minLatency,
                maxLatency,
                timeBucket,
            } = metricsData;

            const query = `
            INSERT INTO endpoint_metrics (
                client_id,
                service_name,
                endpoint,
                method,
                total_hits,
                error_hits,
                avg_latency,
                min_latency,
                max_latency,
                time_bucket
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

            ON DUPLICATE KEY UPDATE
                total_hits = total_hits + VALUES(total_hits),

                error_hits = error_hits + VALUES(error_hits),

                avg_latency = (
                    (avg_latency * total_hits) +
                    (VALUES(avg_latency) * VALUES(total_hits))
                ) / (total_hits + VALUES(total_hits)),

                min_latency = LEAST(min_latency, VALUES(min_latency)),

                max_latency = GREATEST(max_latency, VALUES(max_latency)),

                updated_at = CURRENT_TIMESTAMP;
            `;

            // console.log("H - Executing SQL");

            await this._query(query, [
                clientId,
                serviceName,
                endpoint,
                method,
                totalHits,
                errorHits,
                avgLatency,
                minLatency,
                maxLatency,
                timeBucket,
            ]);

            // console.log("I - SQL Executed");

        } catch (error) {
            this.logger.error("Error upserting endpoint metrics:", error);
            throw error;
        }
    }

    async getMetrics(filter = {}) {
        try {
            const {
                clientId,
                serviceName,
                endpoint,
                startTime,
                endTime,
                limit = 100,
                offset = 0
            } = filter;

            const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
            const safeOffset = Math.max(0, offset);

            let query = `
                SELECT
                    service_name,
                    endpoint,
                    method,
                    SUM(total_hits) AS total_hits,
                    SUM(error_hits) AS error_hits,
                    SUM(avg_latency * total_hits) / NULLIF(SUM(total_hits), 0) AS avg_latency,
                    MIN(min_latency) AS min_latency,
                    MAX(max_latency) AS max_latency,
                    time_bucket
                FROM endpoint_metrics
            `;

            const params = [];
            const whereConditions = [];

            if (clientId != null) {
                whereConditions.push("client_id = ?");
                params.push(clientId);
            }

            if (serviceName) {
                whereConditions.push("service_name = ?");
                params.push(serviceName);
            }

            if (endpoint) {
                whereConditions.push("endpoint = ?");
                params.push(endpoint);
            }

            if (startTime) {
                whereConditions.push("time_bucket >= ?");
                params.push(startTime);
            }

            if (endTime) {
                whereConditions.push("time_bucket <= ?");
                params.push(endTime);
            }

            if (whereConditions.length > 0) {
                query += ` WHERE ${whereConditions.join(" AND ")}`;
            }

            query += `
                GROUP BY service_name, endpoint, method, time_bucket
                ORDER BY time_bucket DESC
                LIMIT ?
                OFFSET ?
            `;

            params.push(safeLimit);
            params.push(safeOffset);

            const rows = await this._query(query, params);

            return rows;

        } catch (error) {
            this.logger.error("Error getting endpoint metrics:", error);
            throw error;
        }
    }

    async getTopEndpoints(clientId, limit = 10, startTime = null) {
        try {
            const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);

            let query = `
                SELECT
                    service_name,
                    endpoint,
                    method,
                    SUM(total_hits) AS total_hits,
                    SUM(avg_latency * total_hits) / NULLIF(SUM(total_hits), 0) AS avg_latency,
                    SUM(error_hits) AS error_hits
                FROM endpoint_metrics
            `;

            const params = [];
            const whereConditions = [];

            if (clientId != null) {
                whereConditions.push("client_id = ?");
                params.push(clientId);
            }

            if (startTime) {
                whereConditions.push("time_bucket >= ?");
                params.push(startTime);
            }

            if (whereConditions.length > 0) {
                query += ` WHERE ${whereConditions.join(" AND ")}`;
            }

            query += `
                GROUP BY service_name, endpoint, method
                ORDER BY total_hits DESC
                LIMIT ?
            `;

            params.push(safeLimit);

            const rows = await this._query(query, params);

            return rows;

        } catch (error) {
            this.logger.error("Error getting top endpoints:", error);
            throw error;
        }
    }

    async getOverallStats(clientId, startTime = null, endTime = null) {
        try {
            let query = `
                SELECT
                    SUM(total_hits) AS total_hits,
                    SUM(error_hits) AS error_hits,
                    SUM(avg_latency * total_hits) / NULLIF(SUM(total_hits), 0) AS avg_latency,
                    COUNT(DISTINCT service_name) AS unique_services,
                    COUNT(DISTINCT endpoint) AS unique_endpoints
                FROM endpoint_metrics
            `;

            const params = [];
            const whereConditions = [];

            if (clientId != null) {
                whereConditions.push("client_id = ?");
                params.push(clientId);
            }

            if (startTime) {
                whereConditions.push("time_bucket >= ?");
                params.push(startTime);
            }

            if (endTime) {
                whereConditions.push("time_bucket <= ?");
                params.push(endTime);
            }

            if (whereConditions.length > 0) {
                query += ` WHERE ${whereConditions.join(" AND ")}`;
            }

            // console.log("===== QUERY =====");
            // console.log(query);
            // console.log("===== PARAMS =====");
            // console.log(params);

            const rows = await this._query(query, params);

            // console.log("===== RESULT =====");
            // console.log(rows);

            return rows[0] || {};

        } catch (error) {
            this.logger.error("Error getting overall stats:", error);
            throw error;
        }
    }

    _query(sql, params = [], client = this.mysql) {
        const target = client || this.mysql;

        if (!target || typeof target.query !== "function") {
            const err = new Error("MySQL client not configured on MetricsRepository");
            this.logger.error("DB query error: MySQL client not configured");
            throw err;
        }

        return target.query({
            sql,
            values: params,
            timeout: QUERY_TIMEOUT_MS,
        });
    }
}