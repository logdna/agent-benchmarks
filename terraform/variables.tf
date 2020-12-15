variable "region1" {
  default = "us-east-2"
  type = string
}

variable "path_to_ssh_key" {
  default = "~/.ssh/terraform_github_id_rsa"
}

variable "aws_access_key" {
  description = "An AWS IAM user is required to upload the results to S3."
  default = ""
  type = string
}

variable "aws_secret_key" {
  description = "An AWS IAM user is required to upload the results to S3."
  default = ""
  type = string
}

variable "purpose" {
  default = "Used for performance testing the agents"
}

variable "baseline_agent_type" {
  default = "rust"
  type = string
}

variable "baseline_agent_branch" {
  default = "master"
  type = string
}

variable "compare_agent_type" {
  default = ""
  type = string
}

variable "compare_agent_branch" {
  default = "master"
  type = string
}

variable "bucket" {
  description = "Name of the S3 bucket"
  type = string
  default = ""
}

variable "test_scenario" {
  description = "Test scenario 1 for lookback or Test scenario 2 for append"
  default = 2
  type = number
}
