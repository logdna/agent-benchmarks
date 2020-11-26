variable "region1" {
  default = "us-east-2"
}

variable "path_to_ssh_key" {
  default = "~/.ssh/terraform_github_id_rsa"
}

variable "purpose" {
  default = "Used for performance testing the agents"
}

variable "agent_branch" {
  default = "master"
}
