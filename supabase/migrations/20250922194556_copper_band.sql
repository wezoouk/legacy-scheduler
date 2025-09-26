@@ .. @@
 -- Create missing tables with correct names

+-- Drop conflicting PascalCase tables if they exist
+DROP TABLE IF EXISTS "Message";
+DROP TABLE IF EXISTS "Recipient";
+DROP TABLE IF EXISTS "DmsConfig";
+DROP TABLE IF EXISTS "DmsCycle";
+DROP TABLE IF EXISTS "SiteSettings";
+
 -- Messages table (your code expects 'messages' but DB has 'Message')