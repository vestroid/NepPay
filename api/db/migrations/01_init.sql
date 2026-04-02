-- every token/passsworrd/pin is hashed

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users(
    id TEXT PRIMARY KEY UNIQUE DEFAULT 'NEP_' || replace(gen_random_uuid()::text, '-', ''),
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    phone CHAR(10) UNIQUE CHECK (phone ~ '^9\d{9}$'),
    email TEXT UNIQUE,
    password TEXT  NOT NULL,
    pin TEXT NOT NULL,
    balance BIGINT DEFAULT 0, -- balanvce in rupees, no need for paisa
    is_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMPTZ DEFAULT NOW(),
    last_login_ip TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD CONSTRAINT username UNIQUE (username);
ALTER TABLE users ADD CONSTRAINT email UNIQUE (email);
ALTER TABLE users ADD CONSTRAINT phone UNIQUE (phone);

CREATE TABLE user_daily_stats (
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    stats_date DATE DEFAULT CURRENT_DATE,
    transaction_count INT DEFAULT 0,
    transaction_volume BIGINT DEFAULT 0,
    total_fee_today BIGINT DEFAULT 0,
    PRIMARY KEY (user_id, stats_date)
);

CREATE TABLE transactions(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT NOT NULL REFERENCES users(id),
    receiver_id TEXT NOT NULL REFERENCES users(id),
    amount BIGINT NOT NULL,
    fee SMALLINT NOT NULL, -- fee will be between rs 0 to rs 1000
    note TEXT,
    sender_balance_after BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SUCCESS', 'FAILED'))
);

-- CREATE TABLE otps(
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     contact TEXT NOT NULL,
--     code CHAR(8) NOT NULL,
--     action TEXT NOT NULL CHECK(action IN ('login', 'transaction', 'reset')),
--     payload JSONB,
--     expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
--     used BOOLEAN NOT NULL DEFAULT FALSE,
--     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

CREATE TABLE contacts(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, contact_id)  
);

CREATE TABLE sessions(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE, -- hashed jwt token
    device_hint TEXT NOT NULL, -- the user agent of the device
    ip_address TEXT NOT NULL, -- full ip address, not a hash
    last_login TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days', -- each session token should expire in 7 days
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    invalidated_at TIMESTAMPTZ -- null if valid, timestamp if invalid
);

CREATE TABLE resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- used as 
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('password', 'pin')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
    used_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
