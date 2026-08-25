-- Core identity: users, roles, permissions, sessions

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(120) NOT NULL,
    email           VARCHAR(180),
    phone           VARCHAR(20),
    password_hash   VARCHAR(100),
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED')),
    email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    phone_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_phone UNIQUE (phone),
    CONSTRAINT ck_users_identifier CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(30) NOT NULL UNIQUE
                CHECK (name IN ('CUSTOMER','SHOPKEEPER','ADMIN','SUPER_ADMIN')),
    description VARCHAR(200)
);

CREATE TABLE permissions (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(60) NOT NULL UNIQUE,
    description VARCHAR(200)
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INT  NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
    role_id       INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(128) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ  NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE otp_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier  VARCHAR(180) NOT NULL,          -- phone or email used for login
    code_hash   VARCHAR(100) NOT NULL,
    purpose     VARCHAR(30)  NOT NULL DEFAULT 'LOGIN'
                CHECK (purpose IN ('LOGIN','VERIFY_EMAIL','VERIFY_PHONE','RESET_PASSWORD')),
    attempts    INT          NOT NULL DEFAULT 0,
    expires_at  TIMESTAMPTZ  NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Notification / audit / token lookup indexes
CREATE INDEX idx_users_email        ON users(email)     WHERE email IS NOT NULL;
CREATE INDEX idx_users_phone        ON users(phone)     WHERE phone IS NOT NULL;
CREATE INDEX idx_users_status       ON users(status);
CREATE INDEX idx_refresh_tokens_uid ON refresh_tokens(user_id);
CREATE INDEX idx_otp_identifier     ON otp_codes(identifier, purpose);
CREATE INDEX idx_user_roles_role    ON user_roles(role_id);

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
