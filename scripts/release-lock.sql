-- SQL script to release Prisma migration advisory locks
-- Run this in pgAdmin 4 Query Tool on the "Alicard" database

-- 1. Check for processes holding the Prisma migration lock (ID: 72707369)
SELECT 
    pid,
    usename,
    application_name,
    state,
    query_start,
    state_change,
    query
FROM pg_stat_activity
WHERE pid IN (
    SELECT pid 
    FROM pg_locks 
    WHERE locktype = 'advisory' 
    AND objid = 72707369
);

-- 2. Check all advisory locks
SELECT 
    l.pid,
    l.locktype,
    l.objid,
    l.mode,
    l.granted,
    a.usename,
    a.application_name,
    a.state
FROM pg_locks l
LEFT JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.locktype = 'advisory'
ORDER BY l.granted DESC, l.pid;

-- 3. Terminate all processes holding the Prisma migration lock
-- WARNING: This will kill active connections. Make sure no important queries are running.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT pid 
        FROM pg_locks 
        WHERE locktype = 'advisory' 
        AND objid = 72707369
    LOOP
        BEGIN
            PERFORM pg_terminate_backend(r.pid);
            RAISE NOTICE 'Terminated PID: %', r.pid;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not terminate PID %: %', r.pid, SQLERRM;
        END;
    END LOOP;
END $$;

-- 4. Verify locks are released
SELECT 
    COUNT(*) as remaining_locks
FROM pg_locks 
WHERE locktype = 'advisory' 
AND objid = 72707369;

-- If the count is 0, the lock is released and you can run migrations!
