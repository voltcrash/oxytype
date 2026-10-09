ALTER TABLE results ADD COLUMN client text NOT NULL DEFAULT 'web' CHECK (client IN ('web','tui'));
--> statement-breakpoint
CREATE INDEX results_client_time_idx ON results(uid,client,timestamp,id);
