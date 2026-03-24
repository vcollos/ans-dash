CREATE TABLE IF NOT EXISTS `{{USER_ACCESS_TABLE}}` (
  user_uid STRING,
  user_email STRING,
  reg_ans STRING,
  operator_name STRING,
  can_upload BOOL,
  role STRING,
  active BOOL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
CLUSTER BY user_uid, user_email, reg_ans;

-- Exemplo de usuario com acesso a uma operadora:
-- INSERT INTO `{{USER_ACCESS_TABLE}}`
--   (user_uid, user_email, reg_ans, operator_name, can_upload, role, active, created_at, updated_at)
-- VALUES
--   ('UID_FIREBASE', 'usuario@uniodonto.com.br', '123456', 'Uniodonto Exemplo', TRUE, 'user', TRUE, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP());

-- Exemplo de usuario com acesso a multiplas operadoras:
-- INSERT INTO `{{USER_ACCESS_TABLE}}`
--   (user_uid, user_email, reg_ans, operator_name, can_upload, role, active, created_at, updated_at)
-- VALUES
--   ('UID_FIREBASE', 'gestor@uniodonto.com.br', '123456', 'Uniodonto A', TRUE, 'user', TRUE, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
--   ('UID_FIREBASE', 'gestor@uniodonto.com.br', '654321', 'Uniodonto B', TRUE, 'user', TRUE, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP());
