resource aws_instance client_r1 {
  ami = data.aws_ami.ami_main.id
  instance_type = "m5d.large"
  subnet_id = aws_subnet.r1_az1.id
  vpc_security_group_ids = [
    aws_security_group.sg_default_r1.id,
    # This security group is allowed while developing.
    # We should remove it in the final version
    aws_security_group.sg_bastion_r1.id]
  associate_public_ip_address = true
  key_name = aws_key_pair.key_r1.key_name
  tags = {
    Name = "Agent Benchmarks - Instance",
    Purpose = var.purpose
  }

  provisioner "local-exec" {
    command = "echo AGENT_TYPE=$AGENT_TYPE TEST_SCENARIO=$TEST_SCENARIO AGENT_BRANCH=$AGENT_BRANCH AWS_DEFAULT_REGION=$AWS_DEFAULT_REGION AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY > env_vars.txt"

    environment = {
      AGENT_TYPE = var.agent_type
      TEST_SCENARIO = var.test_scenario
      AGENT_BRANCH = var.agent_branch
      AWS_DEFAULT_REGION = var.region1
      AWS_ACCESS_KEY_ID = var.aws_access_key
      AWS_SECRET_ACCESS_KEY = var.aws_secret_key

      DESCRIPTION = "These values are generated to pass env variables to the instance."
    }
  }

  provisioner "file" {
    connection {
      type = "ssh"
      host = self.public_ip
      user = "ubuntu"
      private_key = tls_private_key.dev.private_key_pem
    }

    source      = "env_vars.txt"
    destination = "env_vars.txt"
  }

  provisioner "file" {
    connection {
      type = "ssh"
      host = self.public_ip
      user = "ubuntu"
      private_key = tls_private_key.dev.private_key_pem
    }

    source      = var.path_to_ssh_key
    destination = "/home/ubuntu/.ssh/id_rsa"
  }

  provisioner "remote-exec" {
    connection {
      type = "ssh"
      host = self.public_ip
      user = "ubuntu"
      private_key = tls_private_key.dev.private_key_pem
    }

    script = "terraform/scripts/setup.sh"
  }
}
