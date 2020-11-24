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
