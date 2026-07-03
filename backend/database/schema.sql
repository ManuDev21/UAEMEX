-- ============================================================
-- Sistema de Gestion de Activos Institucionales
-- Esquema MySQL / MariaDB
-- Nota: el backend usa TypeORM con synchronize=true en desarrollo,
-- por lo que este script es de referencia / despliegue manual.
-- ============================================================

CREATE DATABASE IF NOT EXISTS asset_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE asset_management;

-- ------------------------------------------------------------
-- Roles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        ENUM('ADMIN','SUPERVISOR','CONSULTA') NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Usuarios
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  full_name          VARCHAR(150) NOT NULL,
  email              VARCHAR(150) NOT NULL UNIQUE,
  password           VARCHAR(255) NOT NULL,
  refresh_token_hash VARCHAR(255) NULL,
  is_active          TINYINT(1) NOT NULL DEFAULT 1,
  role_id            INT NOT NULL,
  last_login_at      DATETIME NULL,
  created_at         DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at         DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
  INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Departamentos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  code       VARCHAR(30) NOT NULL UNIQUE,
  location   VARCHAR(200) NULL,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Responsables
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS responsables (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  full_name  VARCHAR(150) NOT NULL,
  email      VARCHAR(150) NULL,
  phone      VARCHAR(30) NULL,
  position   VARCHAR(120) NULL,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Categorias
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(120) NOT NULL UNIQUE,
  description       VARCHAR(255) NULL,
  depreciation_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Bienes / Activos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assets (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  code           VARCHAR(80) NOT NULL UNIQUE,
  description    VARCHAR(255) NOT NULL,
  brand          VARCHAR(120) NULL,
  model          VARCHAR(120) NULL,
  serial_number  VARCHAR(120) NULL,
  value          DECIMAL(12,2) NOT NULL DEFAULT 0,
  purchase_date  DATE NULL,
  status         ENUM('ACTIVO','EN_MANTENIMIENTO','EN_REPARACION','DADO_DE_BAJA','EXTRAVIADO')
                 NOT NULL DEFAULT 'ACTIVO',
  observations   TEXT NULL,
  category_id    INT NULL,
  department_id  INT NULL,
  responsable_id INT NULL,
  created_at     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_assets_category    FOREIGN KEY (category_id)    REFERENCES categories(id)   ON DELETE SET NULL,
  CONSTRAINT fk_assets_department  FOREIGN KEY (department_id)  REFERENCES departments(id)  ON DELETE SET NULL,
  CONSTRAINT fk_assets_responsable FOREIGN KEY (responsable_id) REFERENCES responsables(id) ON DELETE SET NULL,
  INDEX idx_assets_code (code),
  INDEX idx_assets_status (status)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Movimientos / Historial de cambios
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asset_movements (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  asset_id   INT NOT NULL,
  user_id    INT NULL,
  field      VARCHAR(60) NOT NULL,
  old_value  VARCHAR(500) NULL,
  new_value  VARCHAR(500) NULL,
  note       VARCHAR(255) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_mov_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  CONSTRAINT fk_mov_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE SET NULL,
  INDEX idx_mov_asset (asset_id),
  INDEX idx_mov_created (created_at)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Importaciones Excel
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS excel_imports (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  filename    VARCHAR(255) NOT NULL,
  user_id     INT NULL,
  total_rows  INT NOT NULL DEFAULT 0,
  inserted    INT NOT NULL DEFAULT 0,
  updated     INT NOT NULL DEFAULT 0,
  skipped     INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  errors      TEXT NULL,
  created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_imp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Auditoria
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NULL,
  action     ENUM('LOGIN','LOGOUT','CREATE','UPDATE','DELETE','IMPORT','EXPORT') NOT NULL,
  entity     VARCHAR(80) NULL,
  entity_id  VARCHAR(80) NULL,
  details    TEXT NULL,
  ip_address VARCHAR(60) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_action (action),
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;
