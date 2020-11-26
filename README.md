# LogDNA Agent Benchmarks

Support scripts and terraform files to provision the instances and services on AWS to benchmark the LogDNA Agents.

## Requirements

- Packer v1.2 or above.
- Terraform v0.12 or above.
- AWS Account.

## Initializing

```bash
terraform init ./terraform/
```

## Secrets and Keys

To clone private repositories, the deployed instance uses a ssh private key to access github.com repositories.

The path to the key is `~/.ssh/terraform_github_id_rsa` but it can be changed using the terraform
variable `path_to_ssh_key`.

## Using Packer and Terraform with AWS Okta / AWS Vault

If you have multiple AWS profiles and use federated login.

With AWS Okta, use:

```bash
aws-okta exec <profile_name> -- packer build ./packer/template.json
aws-okta exec <profile_name> -- terraform apply ./terraform/
```

To create and deploy the infrastructure with AWS Vault, use:

```bash
aws-vault exec <profile_name> -- packer build ./packer/template.json
aws-vault exec <profile_name> -- terraform apply ./terraform/
```

## Cleanup

You can cleanup all terraform managed resources with:

```bash
terraform destroy ./terraform/
```

## Development

To speed up development of this project, we generate a temporary private key and allow ssh.

After running `terraform apply`, you can use the following to connect to the instance:

```
terraform output private_key > key.pem
chmod 600 key.pem 
ssh ubuntu@$(terraform output client_r1_ip) -i key.pem
```
