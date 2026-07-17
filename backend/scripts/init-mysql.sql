CREATE TABLE IF NOT EXISTS endpoint_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,  -- unique identifier for each record
    client_id VARCHAR(24) NOT NULL,     -- obtained from mongodb
    service_name VARCHAR(100) NOT NULL, 
    endpoint VARCHAR(255) NOT NULL,     -- stores to which endpoint the request came to
    method VARCHAR(10) NOT NULL,        -- method of the request (GET, POST, PUT, DELETE, etc.)
    
    time_bucket TIMESTAMP NOT NULL,     -- represents the start of the time bucket (e.g., if the bucket is 10:00-11:00, this would be 10:00)

    total_hits INT DEFAULT 0,           -- total number of hits for the endpoint in the given time bucket
    error_hits INT DEFAULT 0,           -- number of hits that resulted in an error (e.g., HTTP status codes 4xx or 5xx)

    avg_latency DECIMAL(10,3) DEFAULT 0.000,
    min_latency DECIMAL(10,3) DEFAULT 0.000,
    max_latency DECIMAL(10,3) DEFAULT 0.000,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,   -- automatically updates the timestamp whenever the row is updated

    UNIQUE KEY unique_metric (client_id, service_name, endpoint, method, time_bucket)   -- no two rows should have the same combination of client_id, service_name, endpoint, method, and time_bucket
                -- Insert | update
);

-- Bucket Example:
-- 10:25 -> 10:00 bucket
-- 10:45 -> 10:00 bucket

CREATE INDEX idx_endpoint_metrics_client_id ON endpoint_metrics(client_id);
CREATE INDEX idx_endpoint_metrics_service ON endpoint_metrics(client_id, service_name); 
CREATE INDEX idx_endpoint_metrics_time ON endpoint_metrics(time_bucket); 
CREATE INDEX idx_endpoint_metrics_endpoint ON endpoint_metrics(client_id, service_name, endpoint);
