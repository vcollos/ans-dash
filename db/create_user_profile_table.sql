CREATE TABLE IF NOT EXISTS `{{USER_PROFILE_TABLE}}` (
  user_uid STRING,
  user_email STRING,
  first_name STRING,
  last_name STRING,
  phone STRING,
  job_title STRING,
  department STRING,
  reg_ans STRING,
  operator_name STRING,
  is_completed BOOL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
CLUSTER BY user_uid, user_email;
