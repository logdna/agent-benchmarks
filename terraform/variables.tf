variable "region1" {
  default = "us-east-2"
  type = string
}

variable "path_to_ssh_key" {
  default = "~/.ssh/terraform_github_id_rsa"
}

variable "aws_access_key" {
  description = "An AWS IAM user is required to upload the results to S3.\nLeave empty in order to output the results in the console."
  default = ""
  type = string
}

variable "aws_secret_key" {
  description = "An AWS IAM user is required to upload the results to S3.\nLeave empty in order to output the results in the console."
  default = ""
  type = string
}

variable "purpose" {
  default = "Used for performance testing the agents"
}

variable "agent_branch" {
  default = "master"
  type = string
}

variable "agent_type" {
  default = "rust"
  type = string
}
