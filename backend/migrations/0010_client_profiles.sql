CREATE TABLE `client_profiles` (
	`uid` text NOT NULL,
	`client` text NOT NULL,
	`time_typing` real DEFAULT 0 NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`uid`, `client`),
	FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "client_profiles_client" CHECK("client_profiles"."client" IN ('web','tui'))
);

--> statement-breakpoint
INSERT INTO client_profiles(uid,client,time_typing,data) SELECT uid,'web',time_typing,json_object('personalBests',json_extract(data,'$.personalBests'),'lbPersonalBests',json_extract(data,'$.lbPersonalBests'),'completedTests',completed_tests,'startedTests',started_tests,'timeTyping',time_typing,'xp',xp,'streak',json_extract(data,'$.streak'),'testActivity',json_extract(data,'$.testActivity')) FROM users;
